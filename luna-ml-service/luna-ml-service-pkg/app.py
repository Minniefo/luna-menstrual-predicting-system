"""
Luna ML Prediction Service
──────────────────────────
Flask microservice that wraps the trained RandomForestClassifier from
Menstrual_Cycle_Classification_Model.ipynb.

Endpoints:
  GET  /                   health check
  POST /predict            predict period_soon for a single day's data
  POST /predict/batch      predict for multiple days (rolling window)
  GET  /model/info         model metadata
"""

from flask import Flask, request, jsonify
from flask_cors import CORS
import joblib, json, os
import pandas as pd
import numpy as np

app = Flask(__name__)
CORS(app)

# ── Load model ────────────────────────────────────────────────────────────────
MODEL_PATH = os.path.join(os.path.dirname(__file__), "model", "period_classifier.pkl")
META_PATH  = os.path.join(os.path.dirname(__file__), "model", "model_meta.json")

clf  = joblib.load(MODEL_PATH)
with open(META_PATH) as f:
    meta = json.load(f)

FEATURES = meta["features"]

# ── Helpers ───────────────────────────────────────────────────────────────────

def build_sample(data: dict) -> pd.DataFrame:
    """
    Accept raw wearable fields and compute all derived features
    exactly as the notebook does.

    Required fields:
        hr_mean               – average heart rate (bpm)
        temp_mean             – temperature diff from baseline (°C)
        sleep_disturbance_score – combined sleep disruption score
        cycle_progress        – day in the current cycle (0-indexed)

    Optional (will be computed from rolling averages if absent):
        hr_mean_3, temp_mean_3, sleep_3
    """
    hr    = float(data["hr_mean"])
    temp  = float(data["temp_mean"])
    sleep = float(data["sleep_disturbance_score"])
    prog  = float(data["cycle_progress"])

    sample = {
        "hr_mean":                hr,
        "temp_mean":              temp,
        "sleep_disturbance_score": sleep,
        "hr_mean_3":              float(data.get("hr_mean_3",   hr)),
        "temp_mean_3":            float(data.get("temp_mean_3", temp)),
        "sleep_3":                float(data.get("sleep_3",     sleep)),
        "cycle_progress":         prog,
        "cycle_progress_norm":    prog / 30.0,
        "temp_cycle_interaction": temp * prog,
    }
    return pd.DataFrame([sample])[FEATURES]


def apply_physiological_rules(sample_df: pd.DataFrame, prob: float) -> dict:
    """
    Mirror the predict_period() function from the notebook:

      Rule 1 – cycle day ≥ 24 AND temp diff ≥ 0.75 → high confidence
      Rule 2 – model prob ≥ 0.4 AND cycle day ≥ 18 → model-based warning
      Default – no immediate period expected
    """
    cycle = sample_df["cycle_progress"].values[0]
    temp  = sample_df["temp_mean"].values[0]

    if cycle >= 24 and temp >= 0.75:
        label  = "Period likely within next few days"
        source = "rule_based"
        level  = "high"
    elif prob >= 0.4 and cycle >= 18:
        label  = "Period likely within next few days"
        source = "model"
        level  = "medium"
    else:
        label  = "No immediate period expected"
        source = "model"
        level  = "low"

    return {"label": label, "source": source, "risk_level": level}


# ── Routes ────────────────────────────────────────────────────────────────────

@app.get("/")
def health():
    return jsonify({
        "status": "Luna ML Service running",
        "model":  "period_classifier.pkl",
        "accuracy": meta["accuracy"],
        "version": meta["version"],
    })


@app.post("/predict")
def predict():
    """
    Single prediction.

    Body (JSON):
    {
        "hr_mean": 78,
        "temp_mean": 0.6,
        "sleep_disturbance_score": 0.18,
        "cycle_progress": 22,

        // optional – if omitted, values are equal to the non-rolling fields
        "hr_mean_3": 76,
        "temp_mean_3": 0.55,
        "sleep_3": 0.16
    }

    Response:
    {
        "success": true,
        "prediction": {
            "period_soon": true,
            "probability": 0.87,
            "label": "Period likely within next few days",
            "source": "model",
            "risk_level": "medium",
            "days_until_estimated": "≤ 5"
        }
    }
    """
    body = request.get_json(silent=True)
    if not body:
        return jsonify({"success": False, "message": "JSON body required"}), 400

    required = ["hr_mean", "temp_mean", "sleep_disturbance_score", "cycle_progress"]
    missing  = [f for f in required if f not in body]
    if missing:
        return jsonify({"success": False, "message": f"Missing fields: {missing}"}), 400

    try:
        sample = build_sample(body)
        prob   = float(clf.predict_proba(sample)[0][1])
        binary = bool(clf.predict(sample)[0])
        result = apply_physiological_rules(sample, prob)

        return jsonify({
            "success": True,
            "prediction": {
                "period_soon":           binary,
                "probability":           round(prob, 4),
                "probability_percent":   f"{round(prob * 100, 1)}%",
                "label":                 result["label"],
                "source":                result["source"],
                "risk_level":            result["risk_level"],
                "days_until_estimated":  "≤ 5" if binary else "> 5",
                "features_used":         sample.to_dict(orient="records")[0],
            },
        })
    except (KeyError, ValueError) as e:
        return jsonify({"success": False, "message": str(e)}), 422
    except Exception as e:
        return jsonify({"success": False, "message": f"Prediction error: {str(e)}"}), 500


@app.post("/predict/batch")
def predict_batch():
    """
    Batch prediction — accepts an array of daily readings and computes
    rolling 3-day averages automatically (mirrors the notebook's feature
    engineering step).

    Body:
    {
        "readings": [
            { "hr_mean": 72, "temp_mean": 0.1, "sleep_disturbance_score": 0.08, "cycle_progress": 0 },
            { "hr_mean": 74, "temp_mean": 0.2, "sleep_disturbance_score": 0.10, "cycle_progress": 1 },
            ...
        ]
    }
    """
    body = request.get_json(silent=True)
    if not body or "readings" not in body:
        return jsonify({"success": False, "message": "'readings' array required"}), 400

    readings = body["readings"]
    if not isinstance(readings, list) or len(readings) == 0:
        return jsonify({"success": False, "message": "'readings' must be a non-empty array"}), 400

    try:
        df = pd.DataFrame(readings)

        # Compute rolling 3-day features
        df["hr_mean_3"]   = df["hr_mean"].rolling(3, min_periods=1).mean()
        df["temp_mean_3"] = df["temp_mean"].rolling(3, min_periods=1).mean()
        df["sleep_3"]     = df["sleep_disturbance_score"].rolling(3, min_periods=1).mean()

        df["cycle_progress_norm"]    = df["cycle_progress"] / 30.0
        df["temp_cycle_interaction"] = df["temp_mean"] * df["cycle_progress"]

        X     = df[FEATURES]
        probs = clf.predict_proba(X)[:, 1]
        preds = clf.predict(X)

        results = []
        for i, row in df.iterrows():
            sample_df = X.iloc[[i]]
            prob      = float(probs[i])
            binary    = bool(preds[i])
            rule_res  = apply_physiological_rules(sample_df, prob)
            results.append({
                "cycle_progress":          int(row["cycle_progress"]),
                "period_soon":             binary,
                "probability":             round(prob, 4),
                "probability_percent":     f"{round(prob * 100, 1)}%",
                "label":                   rule_res["label"],
                "risk_level":              rule_res["risk_level"],
                "source":                  rule_res["source"],
            })

        # Summary: highest risk day
        max_prob_idx  = int(np.argmax(probs))
        high_risk_day = results[max_prob_idx]

        return jsonify({
            "success": True,
            "total_days": len(results),
            "predictions": results,
            "summary": {
                "highest_risk_day":  high_risk_day,
                "any_period_soon":   bool(any(preds)),
                "days_flagged":      int(sum(preds)),
                "avg_probability":   round(float(probs.mean()), 4),
            },
        })
    except Exception as e:
        return jsonify({"success": False, "message": f"Batch prediction error: {str(e)}"}), 500


@app.get("/model/info")
def model_info():
    """Return model metadata."""
    return jsonify({"success": True, "model": meta, "features": FEATURES})


# ── Entry point ───────────────────────────────────────────────────────────────
if __name__ == "__main__":
    port = int(os.environ.get("ML_PORT", 5001))
    print(f"🤖 Luna ML Service running on port {port}")
    app.run(host="0.0.0.0", port=port, debug=False)
