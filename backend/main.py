from __future__ import annotations

import asyncio
import json
import time
from contextlib import asynccontextmanager
from typing import Dict, List, Optional

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware

from blockchain_logger import BlockchainLogger
from data_generator import SimulationEngine, get_engine
from ml_models import MLEngine
from spread_predictor import SpreadPredictor


load_dotenv()

app: FastAPI
sim: SimulationEngine
ml: MLEngine
predictor: SpreadPredictor
blockchain: BlockchainLogger
connected_websockets: List[WebSocket] = []

threshold_log_tracker: Dict[str, int] = {}


def _severity_index(label: str) -> int:
    order = ["HEALTHY", "DRIFTING", "SUSPICIOUS", "CRITICAL"]
    return order.index(label) if label in order else 0


@asynccontextmanager
async def lifespan(app_: FastAPI):

    global sim, ml, predictor, blockchain

    print("=" * 60)
    print("GhostPrint MLE — IoT Security Intelligence")
    print("=" * 60)
    print("GhostPrint MLE: Training ML models...")

    ml = MLEngine()
    ml.train()

    print("GhostPrint MLE: Initializing simulation...")
    sim = get_engine(ml_engine=ml)

    print("GhostPrint MLE: Initializing spread predictor...")
    predictor = SpreadPredictor()

    print("GhostPrint MLE: Connecting to blockchain (optional)...")
    blockchain = BlockchainLogger(base_dir=None)

    asyncio.create_task(simulation_loop())
    asyncio.create_task(broadcast_loop())

    print("GhostPrint MLE: Ready — 20 devices online at http://localhost:8000")
    print("API docs: http://localhost:8000/docs")

    yield


app = FastAPI(title="GhostPrint MLE", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# --------------------------------------------------------------------------- #
# Simulation Loop
# --------------------------------------------------------------------------- #


async def simulation_loop():

    while True:

        tick_interval = 2.0 / sim.speed_multiplier
        sim.tick()

        devices = sim.get_all_devices()

        enriched_devices: List[Dict] = []

        for dev in devices:

            scores = ml.score_device(dev, peer_context=devices)

            trust = ml.compute_trust_score(dev, scores)

            dev["coordinated_flag"] = scores.get("coordinated", False)

            prev_sev_idx = threshold_log_tracker.get(dev["id"], -1)
            curr_sev_idx = _severity_index(dev["severity"])

            should_log = False

            if trust["trust_score"] < 50.0 and prev_sev_idx < 1:
                should_log = True

            if trust["trust_score"] < 20.0 or dev["state"] == "COMPROMISED":
                should_log = True

            if scores.get("coordinated") and not threshold_log_tracker.get(
                f"{dev['id']}_coord"
            ):
                should_log = True
                threshold_log_tracker[f"{dev['id']}_coord"] = 1

            explanation = ml.generate_explanation(
                dev,
                trust,
                scores.get("top_feature", "none"),
                scores.get("drift_scores", []),
            )

            dev["prev_trust_score"] = dev.get("trust_score", 100.0)
            if dev["state"] == "COMPROMISED":

                dev["trust_score"] = min(dev.get("trust_score", 100), 15)
                dev["severity"] = "CRITICAL"

            else:

                dev["trust_score"] = trust["trust_score"]
                dev["severity"] = trust["severity"]
            dev["consecutive_declining_windows"] = trust[
                "consecutive_declining_windows"
            ]
            dev["stable_windows"] = trust["stable_windows"]

            dev["anomaly_scores"] = {
                "isolation_forest": scores["isolation_forest"],
                "temporal": scores["temporal"],
                "statistical": scores["statistical"],
                "peer": scores["peer"],
            }

            dev["top_drifting_feature"] = scores.get("top_feature", "none")
            dev["explanation"] = explanation["text"]
            dev["recommended_action"] = explanation["action"]

            # Persist ML state to simulation engine
            real_dev = sim.devices.get(dev["id"])
            if real_dev:

                real_dev.trust_score = dev["trust_score"]
                real_dev.prev_trust_score = dev["prev_trust_score"]
                real_dev.severity = dev["severity"]

                real_dev._anomaly_scores = dev["anomaly_scores"]
                real_dev._ds_scores = trust

                real_dev.recommended_action = explanation["action"]
                real_dev.coordinated_flag = dev["coordinated_flag"]

            enriched_devices.append(dev)

            if should_log:

                try:

                    blockchain.log_anomaly(
                        dev["id"],
                        dev["device_class"],
                        curr_sev_idx,
                        dev["trust_score"],
                        dev.get("top_drifting_feature", "unknown"),
                        explanation["action"],
                    )

                except Exception as exc:
                    print(f"[Blockchain] log_anomaly error (ignored): {exc}")

                threshold_log_tracker[dev["id"]] = curr_sev_idx

            if curr_sev_idx == 0:

                threshold_log_tracker[dev["id"]] = -1
                threshold_log_tracker.pop(f"{dev['id']}_coord", None)

        # -----------------------------------------------------------
        # Spread predictor
        # -----------------------------------------------------------

        spread_preds = predictor.predict_next_targets(enriched_devices)

        preds_by_id = {p["device_id"]: p for p in spread_preds}

        for dev in enriched_devices:

            dev["spread_risk"] = preds_by_id.get(dev["id"], {}).get(
                "spread_risk", 0.0
            )

            dev["predicted_trust_5_windows"] = predictor.predict_future_trust(
                dev, steps=5
            )

            real_dev = sim.devices.get(dev["id"])
            if real_dev:
                real_dev.spread_risk = dev["spread_risk"]

            if dev["spread_risk"] > 0.70 and not threshold_log_tracker.get(
                f"{dev['id']}_spread"
            ):

                try:

                    blockchain.log_anomaly(
                        dev["id"],
                        dev["device_class"],
                        _severity_index(dev["severity"]),
                        dev["trust_score"],
                        dev.get("top_drifting_feature", "unknown"),
                        "ISOLATE",
                    )

                except Exception as exc:

                    print(f"[Blockchain] spread log failed: {exc}")

                threshold_log_tracker[f"{dev['id']}_spread"] = 1

        await asyncio.sleep(tick_interval)


# --------------------------------------------------------------------------- #
# WebSocket broadcast
# --------------------------------------------------------------------------- #


async def broadcast_loop():

    while True:

        if connected_websockets:

            try:

                payload = build_full_payload()

                msg = json.dumps(
                    {
                        "type": "state_update",
                        "timestamp": time.time(),
                        "data": payload,
                    }
                )

                dead: List[WebSocket] = []

                for ws in connected_websockets:

                    try:
                        await ws.send_text(msg)

                    except Exception:
                        dead.append(ws)

                for ws in dead:
                    if ws in connected_websockets:
                        connected_websockets.remove(ws)

            except Exception as exc:

                print(f"[Broadcast] error: {exc}")

        await asyncio.sleep(2.0)


# --------------------------------------------------------------------------- #
# Payload Builder
# --------------------------------------------------------------------------- #


def build_full_payload() -> Dict:

    devices = get_all_devices_with_scores()

    network = build_network_status(devices)

    return {"devices": devices, "network": network}


def get_all_devices_with_scores() -> List[Dict]:

    return sim.get_all_devices()


def build_network_status(devices: List[Dict]) -> Dict:

    counts = {"HEALTHY": 0, "DRIFTING": 0, "SUSPICIOUS": 0, "CRITICAL": 0}

    for d in devices:

        counts[d["severity"]] = counts.get(d["severity"], 0) + 1

    avg_trust = (
        sum(d.get("trust_score", 100.0) for d in devices) / len(devices)
        if devices
        else 100.0
    )

    coordinated = any(
        d.get("anomaly_scores", {}).get("peer", 0.0) > 0 for d in devices
    )

    spread_preds = predictor.predict_next_targets(devices)

    alerts = sim.get_recent_alerts(20)

    return {
        "total_devices": len(devices),
        "healthy_count": counts["HEALTHY"],
        "drifting_count": counts["DRIFTING"],
        "suspicious_count": counts["SUSPICIOUS"],
        "critical_count": counts["CRITICAL"],
        "network_trust_index": round(avg_trust, 1),
        "coordinated_attack_detected": coordinated,
        "attack_spread_predictions": spread_preds,
        "active_alerts": alerts,
        "simulation_stats": sim.get_simulation_stats(),
    }


# --------------------------------------------------------------------------- #
# REST API
# --------------------------------------------------------------------------- #


@app.get("/api/devices")
async def api_get_devices():

    return get_all_devices_with_scores()


@app.get("/api/network-status")
async def api_get_network_status():

    devices = get_all_devices_with_scores()

    return build_network_status(devices)


@app.get("/api/device/{device_id}")
async def api_get_device(device_id: str):

    dev = sim.get_device(device_id)

    if not dev:

        raise HTTPException(status_code=404, detail="Device not found")

    return dev


@app.get("/api/device/{device_id}/history")
async def api_get_device_history(device_id: str, n: int = 50):

    return sim.get_device_history(device_id, n)


@app.get("/api/blockchain/logs")
async def api_blockchain_logs(device_id: Optional[str] = None, limit: int = 20):

    return blockchain.get_recent_logs(limit, device_id)


@app.get("/api/blockchain/status")
async def api_blockchain_status():

    return blockchain.get_status()


@app.post("/api/simulation/trigger-attack")
async def api_trigger_attack(body: Dict):

    device_id = body.get("device_id")

    if not device_id:

        devices = sim.get_all_devices()

        healthy = [d for d in devices if d["state"] == "NORMAL"]

        if healthy:

            import random

            device_id = random.choice(healthy)["id"]

    sim.trigger_attack(device_id)

    return {
        "success": True,
        "message": f"Attack triggered on {device_id}",
        "device_id": device_id,
    }


@app.post("/api/simulation/reset")
async def api_reset_simulation():

    sim.reset_simulation()

    threshold_log_tracker.clear()

    return {"success": True}


@app.post("/api/simulation/speed")
async def api_set_speed(body: Dict):

    multiplier = int(body.get("multiplier", 1))

    if multiplier not in (1, 2, 5):
        multiplier = 1

    sim.set_speed(multiplier)

    return {"success": True, "speed": f"{multiplier}x"}


# --------------------------------------------------------------------------- #
# WebSocket
# --------------------------------------------------------------------------- #


@app.websocket("/ws/live-feed")
async def websocket_live_feed(websocket: WebSocket):

    await websocket.accept()

    connected_websockets.append(websocket)

    try:

        payload = build_full_payload()

        await websocket.send_text(
            json.dumps(
                {
                    "type": "state_update",
                    "timestamp": time.time(),
                    "data": payload,
                }
            )
        )

        while True:

            await asyncio.sleep(30)

            await websocket.send_text(json.dumps({"type": "ping"}))

    except WebSocketDisconnect:

        if websocket in connected_websockets:
            connected_websockets.remove(websocket)

    except Exception:

        if websocket in connected_websockets:
            connected_websockets.remove(websocket)


# --------------------------------------------------------------------------- #

if __name__ == "__main__":

    import uvicorn

    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)