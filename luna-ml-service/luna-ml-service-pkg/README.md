# 🤖 Luna ML Prediction Service

Python Flask microservice wrapping the `RandomForestClassifier` from  
`Menstrual_Cycle_Classification_Model.ipynb`.

---

## What it does

Predicts whether a user's period will start within the **next 5 days** based on:

| Feature | Description |
|---|---|
| `hr_mean` | Average daily heart rate (bpm) |
| `temp_mean` | Wrist temperature difference from baseline (°C) |
| `sleep_disturbance_score` | Combined sleep disruption score |
| `hr_mean_3` | 3-day rolling average heart rate |
| `temp_mean_3` | 3-day rolling average temperature diff |
| `sleep_3` | 3-day rolling average sleep disturbance |
| `cycle_progress` | Day index in current cycle (0-based) |
| `cycle_progress_norm` | `cycle_progress / 30` |
| `temp_cycle_interaction` | `temp_mean × cycle_progress` |

Plus the **physiological rule layer** from the notebook:
- Cycle day ≥ 24 **AND** temp diff ≥ 0.75 → Rule-based high confidence
- Model prob ≥ 0.4 **AND** cycle day ≥ 18 → Model-based warning

---

## Quick Start

```bash
cd luna-ml-service

# Install dependencies
pip install -r requirements.txt

# Start the service
python app.py
# → 🤖 Luna ML Service running on port 5001
```

---

## Endpoints

### `GET /`
Health check.

### `POST /predict`
Single day prediction.

**Body:**
```json
{
  "hr_mean": 82,
  "temp_mean": 0.72,
  "sleep_disturbance_score": 0.21,
  "cycle_progress": 25,
  "hr_mean_3": 80,
  "temp_mean_3": 0.68,
  "sleep_3": 0.19
}
```

**Response:**
```json
{
  "success": true,
  "prediction": {
    "period_soon": true,
    "probability": 0.87,
    "probability_percent": "87.0%",
    "label": "Period likely within next few days",
    "source": "model",
    "risk_level": "medium",
    "days_until_estimated": "≤ 5"
  }
}
```

### `POST /predict/batch`
Multiple days — rolling averages computed automatically.

**Body:**
```json
{
  "readings": [
    { "hr_mean": 72, "temp_mean": 0.1, "sleep_disturbance_score": 0.08, "cycle_progress": 0 },
    { "hr_mean": 74, "temp_mean": 0.2, "sleep_disturbance_score": 0.10, "cycle_progress": 1 }
  ]
}
```

### `GET /model/info`
Returns model metadata (features, accuracy, version).

---

## Integration with Node.js API

The Node.js backend calls this service automatically via:

```
GET  /api/ml/health          – check if ML service is up
GET  /api/ml/predict/auto    – predict using user's actual MongoDB sensor readings
POST /api/ml/predict         – manual single prediction (pass features in body)
POST /api/ml/predict/batch   – manual batch prediction
GET  /api/ml/model/info      – model info
```

The `/api/ml/predict/auto` endpoint is the main one — it loads the user's  
wearable readings from MongoDB, converts them to the correct feature format,  
and returns predictions for all stored days.

---

## Architecture

```
Flutter App
    │
    ▼
Node.js API (port 5000)  ──→  MongoDB
    │
    │  HTTP POST /predict
    ▼
Flask ML Service (port 5001)
    │
    ▼
period_classifier.pkl  (RandomForestClassifier, 200 estimators)
```
