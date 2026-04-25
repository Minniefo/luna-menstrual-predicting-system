"""
Luna ML Prediction Service  v2.0.0
────────────────────────────────────
Trained on real mcPHASES dataset (42 subjects, wearable + hormonal data).
Reads wearable data directly from MongoDB wearable_iot.readings collection.

Document structure expected in MongoDB:
{
  "device_id": "esp32c3-01",
  "reading_time": ISODate,
  "sensor_data": {
    "temperature": { "celsius": 25.3 },
    "ecg":         { "bpm": 64.9, "leads_off": false },
    "imu":         { "acc_mag": 1.02, ... }
  },
  "derived_metrics": {
    "motion_state":    "resting",
    "heart_rate_band": "normal",
    "quality_ok":      true
  },
  "quality_flags": ["temp_out_of_expected_range"]
}

Endpoints:
  GET  /                           – health check
  POST /predict                    – single prediction (manual features)
  POST /predict/batch              – batch prediction (auto rolling averages)
  GET  /predict/from-db            – pull readings from MongoDB & predict
  GET  /model/info                 – model metadata
"""

import os, json
from datetime import datetime, timedelta

import pandas as pd
import numpy as np
import joblib
from flask import Flask, request, jsonify
from flask_cors import CORS
from pymongo import MongoClient
from dotenv import load_dotenv

load_dotenv()

app = Flask(__name__)
CORS(app)

# ── Load model ────────────────────────────────────────────────────────────────
BASE = os.path.dirname(__file__)
clf  = joblib.load(os.path.join(BASE, "model", "period_classifier.pkl"))
with open(os.path.join(BASE, "model", "model_meta.json")) as f:
    meta = json.load(f)

FEATURES       = meta["features"]
PHASE_ENCODING = meta["phase_encoding"]   # {"Fertility":0,"Follicular":1,"Luteal":2,"Menstrual":3}

# ── MongoDB connection ─────────────────────────────────────────────────────────
MONGO_URI   = os.getenv("MONGODB_URI",   "mongodb://localhost:27017")
MONGO_DB    = os.getenv("WEARABLE_DB",   "wearable_iot")
MONGO_COLL  = os.getenv("WEARABLE_COLL", "readings")

def get_mongo_collection():
    client = MongoClient(MONGO_URI, serverSelectionTimeoutMS=5000)
    return client[MONGO_DB][MONGO_COLL]

# ── Helpers ───────────────────────────────────────────────────────────────────

def celsius_to_diff(celsius: float, baseline: float = 36.6) -> float:
    """Convert absolute °C to diff-from-baseline (mcPHASES wrist_temperature format)."""
    return round(celsius - baseline, 4)

def build_sample_df(readings_list: list) -> pd.DataFrame:
    """
    Convert a list of daily reading dicts into a feature DataFrame,
    computing rolling 3-day averages exactly as the notebook does.

    Each dict needs:
        hr_mean, temp_mean, sleep_disturbance_score, cycle_progress,
        phase  (optional — defaults to 'Follicular' if not provided)
    """
    df = pd.DataFrame(readings_list).sort_values("cycle_progress").reset_index(drop=True)

    # Rolling averages
    df["hr_mean_3"]   = df["hr_mean"].rolling(3, min_periods=1).mean()
    df["temp_mean_3"] = df["temp_mean"].rolling(3, min_periods=1).mean()
    df["sleep_3"]     = df["sleep_disturbance_score"].rolling(3, min_periods=1).mean()

    # Derived
    df["cycle_progress_norm"]    = df["cycle_progress"] / 30.0
    df["temp_cycle_interaction"] = df["temp_mean"] * df["cycle_progress"]

    # Phase encoding — default Follicular if missing
    df["phase"]         = df.get("phase", pd.Series(["Follicular"]*len(df)))
    df["phase_encoded"] = df["phase"].map(PHASE_ENCODING).fillna(PHASE_ENCODING["Follicular"]).astype(int)

    return df[FEATURES]

def apply_rules(sample_df: pd.DataFrame, prob: float) -> dict:
    """
    Physiological rule layer from the notebook:
      Rule 1: cycle_progress >= 24 AND temp_mean >= 0.75  → high (rule-based)
      Rule 2: prob >= 0.4 AND cycle_progress >= 18         → medium (model)
      Default: low
    """
    cycle = float(sample_df["cycle_progress"].values[0])
    temp  = float(sample_df["temp_mean"].values[0])

    if cycle >= 24 and temp >= 0.75:
        return {"label": "Period likely within next few days", "source": "rule_based", "risk_level": "high"}
    elif prob >= 0.4 and cycle >= 18:
        return {"label": "Period likely within next few days", "source": "model",      "risk_level": "medium"}
    else:
        return {"label": "No immediate period expected",        "source": "model",      "risk_level": "low"}

def map_mongo_doc_to_reading(doc: dict, cycle_progress: int, phase: str = "Follicular") -> dict:
    """
    Convert a raw MongoDB wearable_iot.readings document into the
    feature format the model expects.
    """
    sd   = doc.get("sensor_data", {})
    ecg  = sd.get("ecg", {})
    temp = sd.get("temperature", {})
    dm   = doc.get("derived_metrics", {})

    bpm_raw  = ecg.get("bpm",     72.0)
    cel_raw  = temp.get("celsius", 36.6)
    leads_off = ecg.get("leads_off", False)

    # Skip noisy readings: leads off, or quality_ok=False AND temp flag
    quality_ok     = dm.get("quality_ok", True)
    quality_flags  = doc.get("quality_flags", [])
    hr_ok   = (not leads_off) and (40 <= (bpm_raw or 0) <= 200)
    temp_ok = "temp_out_of_expected_range" not in quality_flags

    hr_mean   = float(bpm_raw)  if hr_ok   else 72.0
    temp_diff = celsius_to_diff(float(cel_raw)) if temp_ok else 0.0

    # Sleep disturbance from IMU motion (acc_mag > 1.1 = restless)
    imu = sd.get("imu", {})
    acc_mag = float(imu.get("acc_mag", 1.0))
    sleep_disturbance_score = max(0.0, (acc_mag - 1.0) * 0.5)

    return {
        "hr_mean":                  hr_mean,
        "temp_mean":                temp_diff,
        "sleep_disturbance_score":  round(sleep_disturbance_score, 4),
        "cycle_progress":           cycle_progress,
        "phase":                    phase,
        "reading_time":             str(doc.get("reading_time", "")),
        "device_id":                doc.get("device_id", ""),
        "quality_ok":               bool(quality_ok),
    }

# ── Routes ────────────────────────────────────────────────────────────────────

@app.get("/")
def health():
    return jsonify({
        "status":    "Luna ML Service running",
        "model":     "period_classifier.pkl",
        "version":   meta["version"],
        "accuracy":  meta["accuracy"],
        "dataset":   meta["dataset"],
        "features":  FEATURES,
    })


@app.post("/predict")
def predict():
    """
    Single prediction — manual feature input.

    Required body fields:
        hr_mean, temp_mean, sleep_disturbance_score, cycle_progress
    Optional:
        phase  ("Follicular"|"Fertility"|"Luteal"|"Menstrual")
        hr_mean_3, temp_mean_3, sleep_3  (if omitted → same as non-rolling)
    """
    body = request.get_json(silent=True)
    if not body:
        return jsonify({"success": False, "message": "JSON body required"}), 400

    required = ["hr_mean", "temp_mean", "sleep_disturbance_score", "cycle_progress"]
    missing  = [f for f in required if f not in body]
    if missing:
        return jsonify({"success": False, "message": f"Missing fields: {missing}"}), 400

    try:
        prog  = float(body["cycle_progress"])
        hr    = float(body["hr_mean"])
        temp  = float(body["temp_mean"])
        sleep = float(body["sleep_disturbance_score"])
        phase = body.get("phase", "Follicular")

        row = {
            "hr_mean":                  hr,
            "temp_mean":                temp,
            "sleep_disturbance_score":  sleep,
            "hr_mean_3":                float(body.get("hr_mean_3",   hr)),
            "temp_mean_3":              float(body.get("temp_mean_3", temp)),
            "sleep_3":                  float(body.get("sleep_3",     sleep)),
            "cycle_progress":           prog,
            "cycle_progress_norm":      prog / 30.0,
            "temp_cycle_interaction":   temp * prog,
            "phase_encoded":            PHASE_ENCODING.get(phase, PHASE_ENCODING["Follicular"]),
        }
        sample = pd.DataFrame([row])[FEATURES]
        prob   = float(clf.predict_proba(sample)[0][1])
        binary = bool(clf.predict(sample)[0])
        result = apply_rules(sample, prob)

        return jsonify({
            "success": True,
            "prediction": {
                "period_soon":         binary,
                "probability":         round(prob, 4),
                "probability_percent": f"{round(prob*100,1)}%",
                "days_until_estimated": "≤ 5" if binary else "> 5",
                **result,
                "phase_used":          phase,
            },
        })
    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500


@app.post("/predict/batch")
def predict_batch():
    """
    Batch prediction with automatic rolling 3-day average computation.

    Body: { "readings": [ { hr_mean, temp_mean, sleep_disturbance_score,
                             cycle_progress, phase (optional) }, ... ] }
    """
    body = request.get_json(silent=True)
    if not body or "readings" not in body:
        return jsonify({"success": False, "message": "'readings' array required"}), 400

    readings = body["readings"]
    if not isinstance(readings, list) or len(readings) == 0:
        return jsonify({"success": False, "message": "Non-empty 'readings' array required"}), 400

    try:
        sample_df = build_sample_df(readings)
        probs     = clf.predict_proba(sample_df)[:, 1]
        preds     = clf.predict(sample_df)

        results = []
        for i in range(len(readings)):
            prob   = float(probs[i])
            binary = bool(preds[i])
            rule   = apply_rules(sample_df.iloc[[i]], prob)
            results.append({
                "cycle_progress":      int(sample_df["cycle_progress"].values[i]),
                "period_soon":         binary,
                "probability":         round(prob, 4),
                "probability_percent": f"{round(prob*100,1)}%",
                "phase":               readings[i].get("phase", "Follicular"),
                **rule,
            })

        max_idx  = int(np.argmax(probs))
        return jsonify({
            "success":     True,
            "total_days":  len(results),
            "predictions": results,
            "summary": {
                "highest_risk_day": results[max_idx],
                "any_period_soon":  bool(any(preds)),
                "days_flagged":     int(sum(preds)),
                "avg_probability":  round(float(probs.mean()), 4),
            },
        })
    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500


@app.get("/predict/from-db")
def predict_from_db():
    """
    Pull raw readings directly from MongoDB wearable_iot.readings,
    convert them to model features, and return predictions.

    Query params:
        device_id     – filter by ESP32 device (default: all)
        days          – how many past days to include (default: 30)
        cycle_start   – ISO date string for last period start (default: 30 days ago)
        phase         – current cycle phase (default: auto-inferred)
    """
    device_id   = request.args.get("device_id")
    days        = int(request.args.get("days", 30))
    cycle_start = request.args.get("cycle_start")
    phase_override = request.args.get("phase")

    try:
        coll = get_mongo_collection()

        # Build MongoDB query
        since = datetime.utcnow() - timedelta(days=days)
        query = {"reading_time": {"$gte": since}}
        if device_id:
            query["device_id"] = device_id

        docs = list(coll.find(query).sort("reading_time", 1))

        if not docs:
            return jsonify({
                "success": False,
                "message": f"No readings found in wearable_iot.readings for the past {days} days.",
            }), 404

        # Determine cycle start
        if cycle_start:
            last_period = datetime.fromisoformat(cycle_start.replace("Z",""))
        else:
            last_period = datetime.utcnow() - timedelta(days=14)

        # Infer phase from cycle progress if not provided
        def infer_phase(prog):
            if prog <= 5:              return "Menstrual"
            elif prog <= 13:           return "Follicular"
            elif prog <= 16:           return "Fertility"
            else:                      return "Luteal"

        # Group docs by calendar date, aggregate per day
        daily_buckets = {}
        for doc in docs:
            rt   = doc.get("reading_time", datetime.utcnow())
            date_key = rt.strftime("%Y-%m-%d") if hasattr(rt,"strftime") else str(rt)[:10]
            if date_key not in daily_buckets:
                daily_buckets[date_key] = []
            daily_buckets[date_key].append(doc)

        readings_for_model = []
        for date_key in sorted(daily_buckets.keys()):
            docs_day = daily_buckets[date_key]
            day_dt   = datetime.strptime(date_key, "%Y-%m-%d")

            # cycle_progress = days since last period start
            cycle_progress = max(0, (day_dt - last_period).days % 35)
            phase = phase_override or infer_phase(cycle_progress)

            # Average all readings for this day
            hr_vals   = [d["sensor_data"]["ecg"]["bpm"]            for d in docs_day if not d.get("sensor_data",{}).get("ecg",{}).get("leads_off",True) and 40 <= d.get("sensor_data",{}).get("ecg",{}).get("bpm",0) <= 200]
            temp_vals = [d["sensor_data"]["temperature"]["celsius"] for d in docs_day if "temp_out_of_expected_range" not in d.get("quality_flags",[])]
            imu_vals  = [d["sensor_data"].get("imu",{}).get("acc_mag",1.0) for d in docs_day]

            hr_mean   = float(np.mean(hr_vals))   if hr_vals   else 72.0
            temp_diff = celsius_to_diff(float(np.mean(temp_vals))) if temp_vals else 0.0
            acc_mean  = float(np.mean(imu_vals))
            sleep_score = max(0.0, (acc_mean - 1.0) * 0.5)

            readings_for_model.append({
                "date":                     date_key,
                "hr_mean":                  round(hr_mean, 3),
                "temp_mean":                round(temp_diff, 4),
                "sleep_disturbance_score":  round(sleep_score, 4),
                "cycle_progress":           cycle_progress,
                "phase":                    phase,
                "n_readings":               len(docs_day),
            })

        # Run model
        sample_df = build_sample_df(readings_for_model)
        probs     = clf.predict_proba(sample_df)[:, 1]
        preds     = clf.predict(sample_df)

        results = []
        for i, r in enumerate(readings_for_model):
            prob   = float(probs[i])
            binary = bool(preds[i])
            rule   = apply_rules(sample_df.iloc[[i]], prob)
            results.append({
                **r,
                "period_soon":         binary,
                "probability":         round(prob, 4),
                "probability_percent": f"{round(prob*100,1)}%",
                **rule,
            })

        max_idx = int(np.argmax(probs))
        return jsonify({
            "success":          True,
            "source":           "MongoDB wearable_iot.readings",
            "device_id":        device_id or "all",
            "days_queried":     days,
            "total_days":       len(results),
            "total_raw_docs":   len(docs),
            "cycle_start":      last_period.strftime("%Y-%m-%d"),
            "predictions":      results,
            "summary": {
                "highest_risk_day": results[max_idx] if results else None,
                "any_period_soon":  bool(any(preds)),
                "days_flagged":     int(sum(preds)),
                "avg_probability":  round(float(probs.mean()), 4),
            },
        })

    except Exception as e:
        return jsonify({"success": False, "message": f"DB prediction error: {str(e)}"}), 500


@app.get("/model/info")
def model_info():
    return jsonify({"success": True, "model": meta, "phase_encoding": PHASE_ENCODING})


if __name__ == "__main__":
    port = int(os.environ.get("ML_PORT", 5001))
    print(f"🤖 Luna ML Service v{meta['version']} — port {port}")
    print(f"   Accuracy: {meta['accuracy']} | Dataset: {meta['dataset']}")
    print(f"   Phase encoding: {PHASE_ENCODING}")
    app.run(host="0.0.0.0", port=port, debug=False)
