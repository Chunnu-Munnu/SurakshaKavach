from __future__ import annotations

import random
import threading
import time
from collections import deque
from dataclasses import dataclass, field, asdict
from typing import Deque, Dict, List, Optional, Tuple

import numpy as np


DEVICE_CLASSES = ["camera", "thermostat", "smart_lock", "router"]

FEATURE_NAMES = [
    "dns_frequency",
    "packet_size_variance",
    "inter_arrival_time",
    "protocol_entropy",
    "geo_radius_deviation",
    "beacon_interval",
]

BASELINES: Dict[str, Dict[str, Tuple[float, float]]] = {
    "camera": {
        "dns_frequency": (12.0, 1.2),
        "packet_size_variance": (0.15, 0.02),
        "inter_arrival_time": (80.0, 8.0),
        "protocol_entropy": (0.30, 0.03),
        "geo_radius_deviation": (2.1, 0.3),
        "beacon_interval": (1200.0, 60.0),
    },
    "thermostat": {
        "dns_frequency": (3.0, 0.4),
        "packet_size_variance": (0.08, 0.01),
        "inter_arrival_time": (300.0, 20.0),
        "protocol_entropy": (0.10, 0.02),
        "geo_radius_deviation": (0.5, 0.1),
        "beacon_interval": (3000.0, 100.0),
    },
    "smart_lock": {
        "dns_frequency": (1.0, 0.2),
        "packet_size_variance": (0.05, 0.01),
        "inter_arrival_time": (600.0, 40.0),
        "protocol_entropy": (0.05, 0.01),
        "geo_radius_deviation": (0.2, 0.05),
        "beacon_interval": (5000.0, 200.0),
    },
    "router": {
        "dns_frequency": (45.0, 4.0),
        "packet_size_variance": (0.60, 0.05),
        "inter_arrival_time": (20.0, 3.0),
        "protocol_entropy": (0.70, 0.05),
        "geo_radius_deviation": (15.0, 2.0),
        "beacon_interval": (200.0, 20.0),
    },
}

EMOJIS = {
    "camera": "📷",
    "thermostat": "🌡️",
    "smart_lock": "🔒",
    "router": "📡",
}


@dataclass
class DeviceState:
    id: str
    name: str
    device_class: str
    emoji: str
    state: str = "NORMAL"
    severity: str = "HEALTHY"
    trust_score: float = 100.0
    prev_trust_score: float = 100.0
    predicted_trust_5_windows: float = 100.0
    spread_risk: float = 0.0
    top_drifting_feature: str = "none"
    coordinated_flag: bool = False
    explanation: str = ""

    consecutive_declining_windows: int = 0
    stable_windows: int = 0
    drift_step: int = 0

    baseline_features: Dict[str, float] = field(default_factory=dict)
    features: Dict[str, float] = field(default_factory=dict)

    history: Deque[Dict] = field(default_factory=lambda: deque(maxlen=100))


class SimulationEngine:

    def __init__(self, ml_engine=None) -> None:
        self.ml_engine = ml_engine
        self.devices: Dict[str, DeviceState] = {}
        self.tick_count: int = 0
        self.start_time = time.time()
        self.speed_multiplier: int = 1
        self._lock = threading.Lock()
        self._alerts: Deque[Dict] = deque(maxlen=200)

        self._init_devices()

    def _init_devices(self) -> None:

        for cls, prefix in [
            ("camera", "cam"),
            ("thermostat", "thermo"),
            ("smart_lock", "lock"),
            ("router", "router"),
        ]:

            for i in range(1, 6):

                dev_id = f"{prefix}-{i:02d}"

                emoji = EMOJIS[cls]

                baselines = {
                    name: BASELINES[cls][name][0]
                    for name in FEATURE_NAMES
                }

                device = DeviceState(
                    id=dev_id,
                    name=dev_id,
                    device_class=cls,
                    emoji=emoji,
                    baseline_features=baselines,
                    features=dict(baselines),
                )

                self.devices[dev_id] = device

    def get_all_devices(self) -> List[Dict]:

        with self._lock:
            return [self._device_to_dict(d) for d in self.devices.values()]

    def get_device(self, device_id: str) -> Optional[Dict]:

        with self._lock:
            dev = self.devices.get(device_id)
            return self._device_to_dict(dev) if dev else None

    def get_device_history(self, device_id: str, n: int = 50) -> List[Dict]:

        with self._lock:
            dev = self.devices.get(device_id)
            if not dev:
                return []

            return list(dev.history)[-n:]

    def trigger_attack(self, device_id: str) -> None:

        with self._lock:

            dev = self.devices.get(device_id)

            if not dev:
                return

            dev.state = "DRIFTING"
            dev.drift_step = 1
            dev.severity = "DRIFTING"

            self._alerts.append(
                {
                    "id": f"attack-{device_id}-{self.tick_count}",
                    "device_id": device_id,
                    "device_name": dev.name,
                    "alert_type": "Manual Attack Trigger",
                    "severity": "SUSPICIOUS",
                    "message": "Manual attack simulation triggered.",
                    "timestamp": time.time(),
                    "trust_score": dev.trust_score,
                }
            )

    def reset_simulation(self) -> None:

        with self._lock:
            self.devices.clear()
            self._alerts.clear()
            self.tick_count = 0
            self.start_time = time.time()
            self._init_devices()

    def set_speed(self, multiplier: int) -> None:

        if multiplier not in (1, 2, 5):
            multiplier = 1

        self.speed_multiplier = multiplier

    def get_simulation_stats(self) -> Dict:

        return {
            "tick_count": self.tick_count,
            "uptime_seconds": int(time.time() - self.start_time),
            "speed": f"{self.speed_multiplier}x",
        }

    def get_recent_alerts(self, n: int = 20) -> List[Dict]:

        return list(self._alerts)[-n:][::-1]

    def tick(self) -> None:

        with self._lock:

            self.tick_count += 1

            now = time.time()

            for dev in self.devices.values():

                self._update_device_features(dev)

                dev.history.append(
                    {
                        "timestamp": now,
                        "trust_score": dev.trust_score,
                        "severity": dev.severity,
                        "state": dev.state,
                        "features": dev.features,
                    }
                )

    def _update_device_features(self, dev: DeviceState) -> None:

        cls = dev.device_class

        means = {k: BASELINES[cls][k][0] for k in FEATURE_NAMES}
        stds = {k: BASELINES[cls][k][1] for k in FEATURE_NAMES}

        if dev.state == "NORMAL":

            sampled = {
                k: random.gauss(means[k], stds[k])
                for k in FEATURE_NAMES
            }

        elif dev.state == "DRIFTING":

            dev.drift_step += 1

            shift_factor = 0.25 * dev.drift_step

            drift_means = {
                k: means[k] + shift_factor * stds[k]
                for k in FEATURE_NAMES
            }

            sampled = {
                k: random.gauss(drift_means[k], stds[k])
                for k in FEATURE_NAMES
            }
            if dev.drift_step > 5:
                dev.severity = "SUSPICIOUS"

            if dev.drift_step > 10:
                dev.state = "COMPROMISED"
                dev.severity = "CRITICAL"

        elif dev.state == "COMPROMISED":

            sampled = {
                "dns_frequency": means["dns_frequency"] * 4.5,
                "packet_size_variance": means["packet_size_variance"] * 2.2,
                "inter_arrival_time": means["inter_arrival_time"] * 0.4,
                "protocol_entropy": min(
                    1.0, means["protocol_entropy"] * 2.8
                ),
                "geo_radius_deviation": means["geo_radius_deviation"] * 6.0,
                "beacon_interval": means["beacon_interval"] * 0.35,
            }

            for k in FEATURE_NAMES:

                noise_std = 0.05 * stds[k]

                sampled[k] += random.gauss(0.0, noise_std)

        dev.features = sampled

    def _device_to_dict(self, dev: DeviceState) -> Dict:

        data = asdict(dev)

        data["history"] = list(dev.history)

        data["anomaly_scores"] = getattr(
            dev,
            "_anomaly_scores",
            {
                "isolation_forest": 0.0,
                "temporal": 0.0,
                "statistical": 0.0,
                "peer": 0.0,
            },
        )

        data["ds_scores"] = getattr(dev, "_ds_scores", {})

        data["recommended_action"] = getattr(
            dev, "recommended_action", "WATCH"
        )

        return data


_ENGINE_SINGLETON: Optional[SimulationEngine] = None


def get_engine(ml_engine=None) -> SimulationEngine:

    global _ENGINE_SINGLETON

    if _ENGINE_SINGLETON is None:

        _ENGINE_SINGLETON = SimulationEngine(ml_engine=ml_engine)

    return _ENGINE_SINGLETON