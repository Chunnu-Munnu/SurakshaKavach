# GhostPrint MLE — IoT Security Intelligence Platform

## Quick Start

### 1. Backend

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate  # Windows, Python 3.11
pip install -r requirements.txt
python main.py
```

Trains ML models and starts on `http://localhost:8000`  
API docs at `http://localhost:8000/docs`

### 2. Frontend

```bash
cd frontend
npm install
npm run dev
```

Opens at `http://localhost:5173`

### 3. Blockchain (Optional — system works without it)

```bash
cd Blockchain
npm install
npx hardhat node              # Terminal 1 — keep running
npx hardhat run scripts/deploy.js --network localhost  # Terminal 2
```

Creates `backend/contract-address.json` automatically.  
Restart backend after deploying.

## What Happens

- t=0s: 20 devices come online, all HEALTHY  
- t=30s: First device starts drifting (watch trust score drop)  
- t=50s: Device becomes CRITICAL, blockchain logs the event  
- t=55s: Attack spreads to peer device  
- t=80s: Coordinated attack detected, spread forecast activates  
- t=120s+: Cycle continues until reset

## Architecture

5-layer ensemble ML pipeline:

1. Statistical Drift (windowed feature drift)
2. Embedding Drift (feature deviation from class baselines)
3. Temporal (LSTM autoencoder proxy with MLPRegressor)
4. Point Anomaly (Isolation Forest, 200 trees per class)
5. Peer Graph (correlation across device class clusters)

All 5 layers are fused via Dempster–Shafer evidence theory into a single trust
score per device, which drives severity and recommended actions.  
Anomaly events are logged immutably on-chain via `AnomalyLog.sol` when a local
Hardhat node is available; otherwise they are recorded to a local JSON audit log.***
