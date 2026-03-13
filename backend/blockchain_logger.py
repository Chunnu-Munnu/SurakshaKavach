from __future__ import annotations

import json
import os
import time
from dataclasses import dataclass
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List, Optional

from web3 import Web3
from web3.exceptions import Web3Exception


ANOMALY_LOG_ABI: List[Dict[str, Any]] = [
    {
        "inputs": [
            {"name": "deviceId", "type": "string"},
            {"name": "deviceClass", "type": "string"},
            {"name": "severity", "type": "uint8"},
            {"name": "trustScore", "type": "uint256"},
            {"name": "topFeature", "type": "string"},
            {"name": "actionTaken", "type": "string"},
        ],
        "name": "logAnomaly",
        "outputs": [{"name": "logId", "type": "uint256"}],
        "stateMutability": "nonpayable",
        "type": "function",
    },
    {
        "inputs": [{"name": "n", "type": "uint256"}],
        "name": "getRecentLogs",
        "outputs": [
            {
                "components": [
                    {"name": "id", "type": "uint256"},
                    {"name": "timestamp", "type": "uint256"},
                    {"name": "deviceId", "type": "string"},
                    {"name": "deviceClass", "type": "string"},
                    {"name": "severity", "type": "uint8"},
                    {"name": "trustScore", "type": "uint256"},
                    {"name": "topFeature", "type": "string"},
                    {"name": "actionTaken", "type": "string"},
                    {"name": "dataHash", "type": "bytes32"},
                ],
                "type": "tuple[]",
            }
        ],
        "stateMutability": "view",
        "type": "function",
    },
    {
        "inputs": [{"name": "deviceId", "type": "string"}],
        "name": "getDeviceLogs",
        "outputs": [
            {
                "components": [
                    {"name": "id", "type": "uint256"},
                    {"name": "timestamp", "type": "uint256"},
                    {"name": "deviceId", "type": "string"},
                    {"name": "deviceClass", "type": "string"},
                    {"name": "severity", "type": "uint8"},
                    {"name": "trustScore", "type": "uint256"},
                    {"name": "topFeature", "type": "string"},
                    {"name": "actionTaken", "type": "string"},
                    {"name": "dataHash", "type": "bytes32"},
                ],
                "type": "tuple[]",
            }
        ],
        "stateMutability": "view",
        "type": "function",
    },
    {
        "inputs": [],
        "name": "getTotalLogs",
        "outputs": [{"type": "uint256"}],
        "stateMutability": "view",
        "type": "function",
    },
]


SEVERITY_LABELS = ["HEALTHY", "DRIFTING", "SUSPICIOUS", "CRITICAL"]


@dataclass
class BlockchainStatus:
    connected: bool
    network: Optional[str] = None
    block_number: Optional[int] = None
    total_logs: int = 0
    contract_address: Optional[str] = None
    source: str = "local_file"


class BlockchainLogger:
    """
    Resilient wrapper around the AnomalyLog contract.

    All blockchain failures fall back to local JSON file logging so the
    main application never crashes if the node or contract are unavailable.
    """

    def __init__(self, base_dir: Optional[Path] = None) -> None:
        self.base_dir = Path(base_dir or Path(__file__).resolve().parent)
        self.local_log_path = self.base_dir / "ghostprint_audit.json"
        self._local_logs: List[Dict[str, Any]] = []
        self.w3: Optional[Web3] = None
        self.contract = None
        self.account: Optional[str] = None
        self.connected: bool = False
        self.network_name: Optional[str] = None
        self.contract_address: Optional[str] = None

        self._load_local_logs()
        self._connect_safe()

    # ------------------------------------------------------------------ #
    # Internal helpers
    # ------------------------------------------------------------------ #

    def _load_local_logs(self) -> None:
        try:
            if self.local_log_path.exists():
                self._local_logs = json.loads(self.local_log_path.read_text())
        except Exception:
            self._local_logs = []

    def _save_local_logs(self) -> None:
        try:
            self.local_log_path.write_text(json.dumps(self._local_logs, indent=2))
        except Exception:
            pass

    def _connect_safe(self) -> None:
        """Best-effort blockchain connection. Never raises."""
        try:
            rpc_url = os.getenv("RPC_URL", "http://127.0.0.1:8545")
            self.w3 = Web3(Web3.HTTPProvider(rpc_url, request_kwargs={"timeout": 3}))
            if not self.w3.is_connected():
                raise ConnectionError("web3 not connected")

            addr_path = self.base_dir / "contract-address.json"
            if not addr_path.exists():
                raise FileNotFoundError("contract-address.json not found")

            addr_data = json.loads(addr_path.read_text())
            address = addr_data.get("address")
            if not address:
                raise ValueError("missing address in contract-address.json")

            self.contract_address = Web3.to_checksum_address(address)
            self.network_name = addr_data.get("network")

            self.contract = self.w3.eth.contract(
                address=self.contract_address, abi=ANOMALY_LOG_ABI
            )

            # Use first unlocked account in local node, if any
            try:
                accounts = self.w3.eth.accounts
                self.account = accounts[0] if accounts else None
            except Web3Exception:
                self.account = None

            self.connected = True
            print(f"[Blockchain] Connected to AnomalyLog at {self.contract_address}")
        except Exception as exc:
            print(f"[Blockchain] Offline, using local JSON fallback: {exc}")
            self.connected = False
            self.contract = None
            self.account = None

    # ------------------------------------------------------------------ #
    # Public API
    # ------------------------------------------------------------------ #

    def log_anomaly(
        self,
        device_id: str,
        device_class: str,
        severity: int,
        trust_score: float,
        top_feature: str,
        action_taken: str,
    ) -> Dict[str, Any]:
        """
        Log an anomaly. Tries blockchain first, always records to local file.
        Returns the stored log entry dict.
        """
        timestamp = int(time.time())
        ts_iso = datetime.utcfromtimestamp(timestamp).isoformat() + "Z"

        entry: Dict[str, Any] = {
            "id": len(self._local_logs),
            "timestamp": timestamp,
            "timestamp_iso": ts_iso,
            "device_id": device_id,
            "device_class": device_class,
            "severity": int(severity),
            "severity_label": SEVERITY_LABELS[int(severity)]
            if 0 <= int(severity) < len(SEVERITY_LABELS)
            else "UNKNOWN",
            "trust_score": float(trust_score),
            "top_feature": top_feature,
            "action_taken": action_taken,
            "source": "local",
        }

        # Attempt on-chain write
        if self.connected and self.contract is not None and self.account:
            try:
                tx = self.contract.functions.logAnomaly(
                    device_id,
                    device_class,
                    int(severity),
                    int(trust_score),
                    top_feature,
                    action_taken,
                ).transact({"from": self.account, "gas": 300_000})
                receipt = self.w3.eth.wait_for_transaction_receipt(tx, timeout=10)

                data_hash = Web3.solidity_keccak(
                    ["string", "string", "uint8", "uint256", "string", "string"],
                    [
                        device_id,
                        device_class,
                        int(severity),
                        int(trust_score),
                        top_feature,
                        action_taken,
                    ],
                ).hex()

                entry["source"] = "blockchain"
                entry["tx_hash"] = tx.hex()
                entry["block_number"] = receipt.blockNumber
                entry["data_hash"] = data_hash
            except Exception as exc:
                print(f"[Blockchain] Write failed, using local only: {exc}")

        # Ensure we always have a data_hash
        if "data_hash" not in entry:
            import hashlib

            h = hashlib.sha256(
                f"{device_id}|{device_class}|{severity}|{trust_score}|"
                f"{top_feature}|{action_taken}".encode("utf-8")
            ).hexdigest()
            entry["data_hash"] = "0x" + h[:64]

        # Prepend new log (most recent first)
        self._local_logs.insert(0, entry)
        self._local_logs = self._local_logs[:500]
        self._save_local_logs()
        return entry

    def get_recent_logs(
        self, n: int = 20, device_id: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        """
        Get most recent logs, preferring on-chain if available.
        """
        # Try blockchain
        if self.connected and self.contract is not None:
            try:
                raw = self.contract.functions.getRecentLogs(int(n)).call()
                logs: List[Dict[str, Any]] = []
                for r in raw:
                    sev = int(r[4])
                    ts = int(r[1])
                    logs.append(
                        {
                            "id": int(r[0]),
                            "timestamp": ts,
                            "timestamp_iso": datetime.utcfromtimestamp(ts)
                            .isoformat()
                            + "Z",
                            "device_id": r[2],
                            "device_class": r[3],
                            "severity": sev,
                            "severity_label": SEVERITY_LABELS[sev]
                            if 0 <= sev < len(SEVERITY_LABELS)
                            else "UNKNOWN",
                            "trust_score": float(r[5]),
                            "top_feature": r[6],
                            "action_taken": r[7],
                            "data_hash": Web3.to_hex(r[8]),
                            "source": "blockchain",
                        }
                    )
                if device_id:
                    logs = [l for l in logs if l["device_id"] == device_id]
                return logs[:n]
            except Exception as exc:
                print(f"[Blockchain] Read failed, falling back to local: {exc}")

        # Fallback: local logs
        logs = self._local_logs
        if device_id:
            logs = [l for l in logs if l.get("device_id") == device_id]
        return logs[:n]

    def get_status(self) -> Dict[str, Any]:
        status = BlockchainStatus(
            connected=self.connected,
            network=self.network_name,
            contract_address=self.contract_address,
            total_logs=len(self._local_logs),
            source="blockchain" if self.connected else "local_file",
        )

        if self.connected and self.w3 is not None and self.contract is not None:
            try:
                status.block_number = int(self.w3.eth.block_number)
                # Prefer on-chain total if available
                status.total_logs = int(self.contract.functions.getTotalLogs().call())
            except Exception:
                status.connected = False
                status.source = "local_file"

        return {
            "connected": status.connected,
            "network": status.network,
            "block_number": status.block_number,
            "total_logs": status.total_logs,
            "contract_address": status.contract_address,
            "source": status.source,
        }

