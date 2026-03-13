from __future__ import annotations

import math
import random
from collections import defaultdict, deque
from dataclasses import dataclass
from typing import Deque, Dict, List, Tuple

import numpy as np
from sklearn.ensemble import IsolationForest
from sklearn.metrics import mean_squared_error
from sklearn.neural_network import MLPRegressor

from data_generator import BASELINES, FEATURE_NAMES


@dataclass
class ClassModels:
    isolation_forest: IsolationForest
    if_min: float
    if_max: float
    temporal_model: MLPRegressor
    temporal_mean_re: float
    temporal_std_re: float


class MLEngine:
    """
    Encapsulates all ML models and trust computation for GhostPrint MLE.
    """

    def __init__(self) -> None:
        self.class_models: Dict[str, ClassModels] = {}
        self.stat_windows: Dict[str, Deque[np.ndarray]] = defaultdict(
            lambda: deque(maxlen=40)
        )

    # ------------------------------------------------------------------ #
    # Training
    # ------------------------------------------------------------------ #

    def train(self) -> None:
        print("Training Isolation Forest...")
        for cls in BASELINES.keys():
            X_normal = self._sample_normal(cls, n=1000)
            if_model = IsolationForest(
                n_estimators=200,
                contamination=0.05,
                random_state=42,
            )
            if_model.fit(X_normal)
            scores = if_model.score_samples(X_normal)
            if_min, if_max = float(scores.min()), float(scores.max())

            print(f"  [{cls}] IF score range: {if_min:.4f} .. {if_max:.4f}")

            print("Training Temporal Autoencoder (MLP proxy)...")
            seqs = self._sample_sequences(cls, n_sequences=400)
            X_seq = np.array(seqs)
            y_seq = X_seq.copy()
            mlp = MLPRegressor(
                hidden_layer_sizes=(128, 64, 32, 64, 128),
                activation="relu",
                max_iter=1000,
                random_state=42,
                tol=1e-4,
            )
            mlp.fit(X_seq, y_seq)
            preds = mlp.predict(X_seq)
            res = [mean_squared_error(x, p) for x, p in zip(X_seq, preds)]
            mean_re = float(np.mean(res))
            std_re = float(np.std(res) + 1e-8)
            print(
                f"  [{cls}] Temporal RE mean={mean_re:.6f} std={std_re:.6f}"
            )

            self.class_models[cls] = ClassModels(
                isolation_forest=if_model,
                if_min=if_min,
                if_max=if_max,
                temporal_model=mlp,
                temporal_mean_re=mean_re,
                temporal_std_re=std_re,
            )

        print("Initializing Statistical Detectors...")
        print("ML Engine ready.")

    # ------------------------------------------------------------------ #

    def _sample_normal(self, cls: str, n: int) -> np.ndarray:
        means = {k: BASELINES[cls][k][0] for k in FEATURE_NAMES}
        stds = {k: BASELINES[cls][k][1] for k in FEATURE_NAMES}
        rows = []
        for _ in range(n):
            row = [
                random.gauss(means[f], stds[f])
                for f in FEATURE_NAMES
            ]
            rows.append(row)
        return np.array(rows, dtype=float)

    def _sample_sequences(self, cls: str, n_sequences: int) -> List[np.ndarray]:
        seqs = []
        for _ in range(n_sequences):
            seq = self._sample_normal(cls, n=10).flatten()
            seqs.append(seq)
        return seqs

    # ------------------------------------------------------------------ #
    # Scoring per device
    # ------------------------------------------------------------------ #

    def score_device(self, device_dict: Dict, peer_context: List[Dict]) -> Dict:
        """
        Compute all model scores for a single device.
        device_dict is JSON-ready dict from SimulationEngine.
        """
        cls = device_dict["device_class"]
        feats = device_dict["features"]
        x = np.array(
            [
                feats["dns_frequency"],
                feats["packet_size_variance"],
                feats["inter_arrival_time"],
                feats["protocol_entropy"],
                feats["geo_radius_deviation"],
                feats["beacon_interval"],
            ],
            dtype=float,
        )

        models = self.class_models[cls]

        # Isolation Forest
        raw_if = float(models.isolation_forest.score_samples([x])[0])
        norm_if = (raw_if - models.if_min) / (
            (models.if_max - models.if_min) + 1e-8
        )
        if_score = float(1.0 - max(0.0, min(1.0, norm_if)))

        # Temporal (use last 10 history entries if available)
        hist = device_dict.get("history", [])
        if len(hist) >= 10:
            seq_feats = []
            for h in hist[-10:]:
                hf = h.get("features") or device_dict["features"]
                seq_feats.append(
                    [
                        hf["dns_frequency"],
                        hf["packet_size_variance"],
                        hf["inter_arrival_time"],
                        hf["protocol_entropy"],
                        hf["geo_radius_deviation"],
                        hf["beacon_interval"],
                    ]
                )
            flat = np.array(seq_feats, dtype=float).flatten()
            pred = models.temporal_model.predict([flat])[0]
            re = mean_squared_error(flat, pred)
            z = (re - models.temporal_mean_re) / models.temporal_std_re
            temporal_score = float(1.0 / (1.0 + math.exp(-(z - 2.0))))
            temporal_score = float(max(0.0, min(1.0, temporal_score)))
        else:
            temporal_score = 0.0

        # Statistical drift
        dev_id = device_dict["id"]
        window = self.stat_windows[dev_id]
        window.append(x.copy())
        if len(window) < 20:
            statistical_score = 0.0
            top_feature = "none"
            drift_scores = [0.0] * 6
        else:
            arr = np.stack(window)
            first = arr[:20]
            second = arr[-20:]
            drift_scores = []
            for i in range(6):
                std_full = float(np.std(arr[:, i]) + 1e-8)
                drift = abs(float(np.mean(second[:, i]) - np.mean(first[:, i]))) / std_full
                drift_scores.append(drift)
            drift_scores = list(drift_scores)
            top_idx = int(np.argmax(drift_scores))
            top_feature = [
                "dns_freq",
                "pkt_var",
                "inter_arr",
                "proto_ent",
                "geo_rad",
                "beacon",
            ][top_idx]
            drift_count = sum(1 for d in drift_scores if d > 1.5)
            statistical_score = float(drift_count / 6.0)

        # Peer correlation
        peers = [
            d
            for d in peer_context
            if d["device_class"] == cls and d["id"] != device_dict["id"]
        ]
        high_peers = [
            p
            for p in peers
            if p.get("anomaly_scores", {}).get("isolation_forest", 0.0) > 0.55
        ]
        coordinated = len(high_peers) >= 2
        peer_score = 0.20 if coordinated else 0.0

        return {
            "isolation_forest": round(if_score, 4),
            "temporal": round(temporal_score, 4),
            "statistical": round(statistical_score, 4),
            "peer": peer_score,
            "coordinated": coordinated,
            "top_feature": top_feature,
            "drift_scores": drift_scores,
        }

    # ------------------------------------------------------------------ #
    # Dempster–Shafer fusion and trust computation
    # ------------------------------------------------------------------ #

    @staticmethod
    def _normalize_bpa(m: Dict[str, float]) -> Dict[str, float]:
        total = sum(m.values())
        if total <= 0:
            return {"Normal": 0.34, "Drifting": 0.33, "Compromised": 0.33, "Theta": 0.0}
        return {k: v / total for k, v in m.items()}

    def _bpa_layer1(self, statistical_score: float) -> Dict[str, float]:
        m = {}
        m["Drifting"] = min(0.85, statistical_score * 0.85)
        m["Normal"] = max(0.0, (1.0 - statistical_score) * 0.90)
        m["Theta"] = max(0.05, 1.0 - m["Drifting"] - m["Normal"])
        m.setdefault("Compromised", 0.0)
        return self._normalize_bpa(m)

    def _bpa_layer2(self, arch_dist_norm: float, drift_vel_norm: float) -> Dict[str, float]:
        m: Dict[str, float] = {}
        m["Drifting"] = min(0.70, arch_dist_norm * 0.70)
        m["Compromised"] = max(0.0, (drift_vel_norm - 0.5) * 0.60)
        m["Normal"] = max(0.0, (1.0 - arch_dist_norm) * 0.85)
        m["Theta"] = max(
            0.05, 1.0 - m.get("Drifting", 0) - m.get("Compromised", 0) - m.get("Normal", 0)
        )
        return self._normalize_bpa(m)

    def _bpa_layer3(self, temporal_score: float) -> Dict[str, float]:
        m: Dict[str, float] = {}
        m["Compromised"] = temporal_score * 0.80
        m["Normal"] = (1.0 - temporal_score) * 0.90
        m["Theta"] = max(0.05, 1.0 - m["Compromised"] - m["Normal"])
        m.setdefault("Drifting", 0.0)
        return self._normalize_bpa(m)

    def _bpa_layer4(self, if_score: float) -> Dict[str, float]:
        m: Dict[str, float] = {}
        if if_score > 0.5:
            m["Compromised"] = (if_score - 0.5) * 2.0 * 0.70
            m["Normal"] = 0.0
        else:
            m["Compromised"] = 0.0
            m["Normal"] = (0.5 - if_score) * 2.0 * 0.80
        m["Drifting"] = 0.0
        m["Theta"] = max(0.05, 1.0 - m["Compromised"] - m["Normal"])
        return self._normalize_bpa(m)

    def _bpa_layer5(self, peer_score: float, coordinated: bool) -> Dict[str, float]:
        m: Dict[str, float] = {}
        if coordinated:
            m["Compromised"] = peer_score * 0.90
            m["Theta"] = 0.10
            m["Normal"] = 0.0
            m["Drifting"] = 0.0
        else:
            m["Normal"] = 0.85
            m["Drifting"] = 0.0
            m["Compromised"] = 0.0
            m["Theta"] = 0.15
        return self._normalize_bpa(m)

    @staticmethod
    def _intersection(a: str, b: str) -> str | None:
        if a == "Theta":
            return b
        if b == "Theta":
            return a
        if a == b:
            return a
        return None

    def _combine(self, m1: Dict[str, float], m2: Dict[str, float]) -> Tuple[Dict[str, float], float]:
        keys = ["Normal", "Drifting", "Compromised", "Theta"]
        combined = {k: 0.0 for k in keys}
        K = 0.0
        for a, va in m1.items():
            for b, vb in m2.items():
                inter = self._intersection(a, b)
                if inter is None:
                    K += va * vb
                else:
                    combined[inter] += va * vb
        if K >= 1.0:
            K = 0.9999
        norm = 1.0 / (1.0 - K)
        for k in combined:
            combined[k] *= norm
        return combined, K

    # ------------------------------------------------------------------ #

    def compute_trust_score(self, device_dict: Dict, scores: Dict) -> Dict:
        """
        Combines all model evidence into a trust score and severity.
        Mutates nothing; caller is responsible for writing back.
        """
        feats = np.array(
            [
                device_dict["features"]["dns_frequency"],
                device_dict["features"]["packet_size_variance"],
                device_dict["features"]["inter_arrival_time"],
                device_dict["features"]["protocol_entropy"],
                device_dict["features"]["geo_radius_deviation"],
                device_dict["features"]["beacon_interval"],
            ],
            dtype=float,
        )
        baseline = np.array(
            [
                device_dict["baseline_features"]["dns_frequency"],
                device_dict["baseline_features"]["packet_size_variance"],
                device_dict["baseline_features"]["inter_arrival_time"],
                device_dict["baseline_features"]["protocol_entropy"],
                device_dict["baseline_features"]["geo_radius_deviation"],
                device_dict["baseline_features"]["beacon_interval"],
            ],
            dtype=float,
        )

        arch_dist = float(np.mean(np.abs(feats - baseline) / (baseline + 1e-8)))
        arch_dist_norm = min(1.0, arch_dist / 2.0)

        hist = device_dict.get("history", [])
        if len(hist) >= 2:
            last_feats = hist[-1].get("features") or device_dict["features"]
            last_arr = np.array(
                [
                    last_feats["dns_frequency"],
                    last_feats["packet_size_variance"],
                    last_feats["inter_arrival_time"],
                    last_feats["protocol_entropy"],
                    last_feats["geo_radius_deviation"],
                    last_feats["beacon_interval"],
                ],
                dtype=float,
            )
            drift_vel = float(np.mean(np.abs(feats - last_arr) / (baseline + 1e-8)))
            drift_vel_norm = min(1.0, drift_vel / 0.5)
        else:
            drift_vel_norm = 0.0

        bpa1 = self._bpa_layer1(scores["statistical"])
        bpa2 = self._bpa_layer2(arch_dist_norm, drift_vel_norm)
        bpa3 = self._bpa_layer3(scores["temporal"])
        bpa4 = self._bpa_layer4(scores["isolation_forest"])
        bpa5 = self._bpa_layer5(scores["peer"], scores["coordinated"])

        m12, k12 = self._combine(bpa1, bpa2)
        m123, k123 = self._combine(m12, bpa3)
        m1234, k1234 = self._combine(m123, bpa4)
        m_final, k_final = self._combine(m1234, bpa5)

        trust_raw = 100.0 * (
            1.0
            - m_final.get("Compromised", 0.0)
            - 0.5 * m_final.get("Drifting", 0.0)
        )
        trust_raw = max(0.0, min(100.0, trust_raw))

        prev_trust = float(device_dict.get("trust_score", 100.0))
        consecutive_declining = int(device_dict.get("consecutive_declining_windows", 0))
        stable_windows = int(device_dict.get("stable_windows", 0))

        if trust_raw < prev_trust:
            consecutive_declining += 1
            stable_windows = 0
            decay = 0.03 * min(consecutive_declining, 10)
            trust_final = trust_raw * (1.0 - decay)
        else:
            consecutive_declining = max(0, consecutive_declining - 1)
            stable_windows += 1
            recovery = 1.0 - math.exp(-stable_windows / 20.0)
            trust_final = trust_raw + (100.0 - trust_raw) * recovery * 0.08

        trust_final = max(0.0, min(100.0, trust_final))

        if trust_final >= 80.0:
            severity = "HEALTHY"
        elif trust_final >= 50.0:
            severity = "DRIFTING"
        elif trust_final >= 20.0:
            severity = "SUSPICIOUS"
        else:
            severity = "CRITICAL"

        avg_conflict = float((k12 + k123 + k1234 + k_final) / 4.0)

        result = {
            "trust_score": round(trust_final, 1),
            "severity": severity,
            "ds_compromised": round(m_final.get("Compromised", 0.0), 3),
            "ds_drifting": round(m_final.get("Drifting", 0.0), 3),
            "ds_normal": round(m_final.get("Normal", 0.0), 3),
            "ds_conflict": round(avg_conflict, 3),
            "arch_dist_norm": round(arch_dist_norm, 3),
            "drift_vel_norm": round(drift_vel_norm, 3),
            "consecutive_declining_windows": consecutive_declining,
            "stable_windows": stable_windows,
            "bpa_layers": {
                "layer1": bpa1,
                "layer2": bpa2,
                "layer3": bpa3,
                "layer4": bpa4,
                "layer5": bpa5,
            },
        }
        return result

    # ------------------------------------------------------------------ #

    def generate_explanation(
        self,
        device_dict: Dict,
        trust_result: Dict,
        top_feature: str,
        drift_scores: List[float],
    ) -> Dict:
        prev_trust = float(device_dict.get("prev_trust_score", 100.0))
        delta = round(prev_trust - trust_result["trust_score"], 1)
        direction = "dropped" if delta > 0 else "recovered"

        feature_names = {
            "dns_freq": "DNS query frequency",
            "pkt_var": "packet size variance",
            "inter_arr": "inter-arrival timing",
            "proto_ent": "protocol entropy",
            "geo_rad": "geo-radius deviation",
            "beacon": "beacon interval",
        }

        if trust_result["ds_compromised"] > 0.8:
            action = "ISOLATE"
        elif trust_result["ds_drifting"] > 0.6:
            action = "MONITOR"
        else:
            action = "WATCH"

        high_conflict = trust_result["ds_conflict"] > 0.3
        conflict_note = (
            " Evidence conflict detected — manual review recommended."
            if high_conflict
            else ""
        )

        max_drift = max(drift_scores) if drift_scores else 0.0
        text = (
            f"Device {device_dict['name']} trust {direction} {abs(delta)} points. "
            f"Primary driver: {feature_names.get(top_feature, top_feature)} "
            f"deviated {round(max_drift * 100, 1)}% from baseline. "
            f"D-S evidence: {round(trust_result['ds_compromised'] * 100)}% compromised, "
            f"{round(trust_result['ds_drifting'] * 100)}% drifting.{conflict_note}"
        )

        recovery_windows = (
            max(0, round((80.0 - trust_result["trust_score"]) / 3.0))
            if trust_result["trust_score"] < 80.0
            else 0
        )

        return {
            "text": text,
            "action": action,
            "high_conflict": high_conflict,
            "recovery_windows": recovery_windows,
        }

