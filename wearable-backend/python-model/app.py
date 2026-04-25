from fastapi import FastAPI, HTTPException
import joblib
import pandas as pd
import requests
from datetime import datetime
import os

app = FastAPI()

model = joblib.load("period_classifier1.pkl")

# Node API base
LUNA_NODE_API = os.getenv("LUNA_NODE_API", "http://localhost:5001")

@app.get("/")
def root():
    return {"message": "Python model service is running"}

@app.post("/predict")
def predict(data: dict):
    # Model inference expects a DataFrame of shape aligned with the pkl model
    # We will pass the exact mapped keys to ensure columns exist implicitly.
    sample = pd.DataFrame([data])
    
    # We use a try-except to handle if the dict doesn't map perfectly into model features, 
    # but based on the previous app.py we know predict_proba takes our shape.
    try:
        prob = model.predict_proba(sample)[0][1]
    except Exception as e:
        print("Model inference mapping error:", e)
        prob = 0.5 # fallback

    cycle = data.get("cycle_progress", 0)
    temp = data.get("temp_mean", 0)

    if cycle >= 24 and temp >= 0.75:
        result = "Period likely within next few days (Rule-based)"
    elif prob >= 0.4 and cycle >= 18:
        result = "Period likely within next few days (Model-based)"
    else:
        result = "No immediate period expected"

    # Map to frontend expected strings
    if "Period likely" in result:
        display = "Period likely soon"
    elif cycle >= 30:
        display = "Cycle delayed"
    else:
        display = "No immediate indication"

    return {
        "prediction": display,
        "probability": float(prob)
    }

@app.post("/ingest")
def ingest(payload: dict):
    """
    ESP32 sends: { user_id, heart_rate, temperature, sleep_disturbance, timestamp }
    """
    user_id = payload.get("user_id")
    if not user_id:
        raise HTTPException(status_code=400, detail="user_id is required")

    # 1. Fetch user context from Node API
    try:
        context_res = requests.get(f"{LUNA_NODE_API}/api/users/internal/context/{user_id}", timeout=5)
        context_res.raise_for_status()
        context_data = context_res.json().get("user", {})
    except Exception as e:
        print(f"Failed to fetch user context: {e}")
        raise HTTPException(status_code=502, detail="Failed to fetch user context from Node API")

    last_period = context_data.get("lastPeriodStart")
    cycle_length = context_data.get("cycleLength", 28)

    # 2. Compute cycle_progress
    try:
        last_date = datetime.strptime(last_period, "%Y-%m-%d").date()
        today = datetime.now().date()
        cycle_progress = (today - last_date).days + 1
    except Exception:
        cycle_progress = 14 # Fallback

    cycle_progress_norm = cycle_progress / cycle_length

    # 3. Compute Features 
    hr = payload.get("heart_rate", 70)
    temp = payload.get("temperature", 36.0)
    sleep_dist = payload.get("sleep_disturbance", 0)

    baseline_temp = 36.0
    temp_mean = temp - baseline_temp
    
    features = {
        "hr_mean": hr,
        "temp_mean": temp_mean,
        "sleep_disturbance_score": sleep_dist,
        "hr_mean_3": hr,
        "temp_mean_3": temp_mean,
        "sleep_3": sleep_dist,
        "cycle_progress": cycle_progress,
        "cycle_progress_norm": cycle_progress_norm,
        "temp_cycle_interaction": temp_mean * cycle_progress_norm
    }

    # 4. Predict
    prediction_result = predict(features)
    final_prediction = prediction_result["prediction"]
    confidence = prediction_result["probability"]

    # 5. POST back to Node backend
    timestamp = payload.get("timestamp", datetime.now().isoformat())
    date_str = timestamp[:10]

    sync_payload = {
        "user_id": user_id,
        "readings": [
            {
                "date": date_str,
                "heartRate": hr,
                "temperature": temp,
                "sleepDisturbances": sleep_dist
            }
        ],
        "prediction": final_prediction,
        "confidence": confidence,
        "features_used": features,
        "timestamp": timestamp
    }

    try:
        sync_res = requests.post(f"{LUNA_NODE_API}/api/wearable/sync", json=sync_payload, timeout=5)
        sync_res.raise_for_status()
    except Exception as e:
        print(f"Failed to sync with Node API: {e}")
        # Do not crash; just print for debug
        
    return {
        "success": True,
        "ingested": True,
        "features": features,
        "prediction": prediction_result
    }