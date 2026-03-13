from __future__ import annotations

from typing import Dict, List, Tuple

import numpy as np


class SpreadPredictor:
    """
    Computes attack spread risk over a simple graph built from devices.
    """

    def __init__(self) -> None:
        self.graph: Dict[str, List[str]] = {}

    # ------------------------------------------------------------------ #

    def build_graph(self, devices: List[Dict]) -> None:
        self.graph = {d["id"]: [] for d in devices}
        id_to_idx = {d["id"]: idx for idx, d in enumerate(devices)}

        # Edges: same-class peers and index distance <= 2
        for i, d in enumerate(devices):
            for j, e in enumerate(devices):
                if i == j:
                    continue
                if abs(i - j) <= 2 or d["device_class"] == e["device_class"]:
                    self.graph[d["id"]].append(e["id"])

    def get_neighbors(self, device_id: str) -> List[str]:
        return self.graph.get(device_id, [])

    def _compute_spread_risk_single(
        self, device: Dict, devices_by_id: Dict[str, Dict]
    ) -> float:
        neighbors = [devices_by_id[nid] for nid in self.get_neighbors(device["id"])]
        compromised_neighbors = [
            n
            for n in neighbors
            if n["state"] == "COMPROMISED" or n.get("trust_score", 100.0) < 25.0
        ]
        if not compromised_neighbors:
            return 0.0

        min_trust = min(n.get("trust_score", 100.0) for n in compromised_neighbors)
        r = (100.0 - min_trust) / 100.0
        n = len(compromised_neighbors)
        risk = 1.0 - (1.0 - r) ** n
        return float(min(0.99, max(0.0, risk)))

    def predict_next_targets(
        self, devices: List[Dict], n: int = 3
    ) -> List[Dict]:
        if not devices:
            return []

        self.build_graph(devices)
        by_id = {d["id"]: d for d in devices}

        candidates: List[Tuple[Dict, float]] = []
        for d in devices:
            if d["state"] not in ("NORMAL", "DRIFTING"):
                continue
            risk = self._compute_spread_risk_single(d, by_id)
            candidates.append((d, risk))

        candidates.sort(key=lambda x: -x[1])
        results: List[Dict] = []
        for d, risk in candidates[:n]:
            if risk <= 0.05:
                continue
            neighbors = [
                by_id[nid]
                for nid in self.get_neighbors(d["id"])
                if by_id[nid]["state"] == "COMPROMISED"
                or by_id[nid].get("trust_score", 100.0) < 25.0
            ]
            results.append(
                {
                    "device_id": d["id"],
                    "device_name": d["name"],
                    "device_class": d["device_class"],
                    "spread_risk": float(risk),
                    "spread_risk_percent": int(risk * 100),
                    "message": f"{int(risk*100)}% infection probability from {len(neighbors)} compromised peer(s)",
                }
            )
        return results

    def predict_future_trust(self, device: Dict, steps: int = 5) -> float:
        history = [h["trust_score"] for h in device.get("history", [])]
        if len(history) < 5:
            return float(device.get("trust_score", 100.0))
        y = np.array(history[-15:], dtype=float)
        x = np.arange(len(y), dtype=float)
        coeffs = np.polyfit(x, y, 1)
        future_x = len(history) + steps
        predicted = coeffs[0] * future_x + coeffs[1]
        return float(max(0.0, min(100.0, predicted)))

