# 🌙 Luna — Flutter Mobile App

Wearable Menstrual Wellness Monitoring Dashboard  
**IT4031 Visual Analytics and User Experience Design — SLIIT**

---

## Architecture

```
Luna Flutter App (Mobile)
        │
        │ HTTP REST API
        ▼
Node.js Backend (port 5000)
        │                    │
        ▼                    ▼
  MongoDB Atlas         Flask ML Service (port 5001)
  wearable_iot.readings  period_classifier.pkl
  luna_db                (mcPHASES, 42 subjects, 96% accuracy)
```

---

## Screens (All 4 Dashboard Components)

| Screen | Dashboard | Data Source |
|--------|-----------|-------------|
| 🏠 Home | Cycle Tracking | MongoDB sensor readings + ML model |
| 💗 Health | Health Insights | MongoDB HR/temp/sleep + Luna AI insight |
| 🔔 Alerts | Alerts & Predictions | ML period prediction + rule-based alerts |
| 📈 Trends | Trends & Analytics | Historical cycle data from MongoDB |
| 💊 Medicines | (bonus) | MongoDB medicines collection |
| 👤 Profile | Settings | User profile + wearable sync status |

---

## Quick Start

### 1. Start the backends first

```bash
# Terminal 1 — Node.js API
cd luna-backend
npm install && npm start
# → 🌙 Luna API running on port 5000

# Terminal 2 — Python ML service
cd luna-ml-service
pip install -r requirements.txt
python app.py
# → 🤖 Luna ML Service running on port 5001
```

### 2. Configure API URL

In `lib/services/api_service.dart`, set your server IP:

```dart
// Android emulator (default):
static const String baseUrl = 'http://10.0.2.2:5000/api';

// Physical Android/iOS device (use your machine's local IP):
static const String baseUrl = 'http://192.168.x.x:5000/api';

// iOS simulator:
static const String baseUrl = 'http://localhost:5000/api';
```

### 3. Run the app

```bash
cd luna-app
flutter pub get
flutter run
```

---

## MongoDB Data Flow

The app reads from two MongoDB databases:

**`luna_db`** — user data, cycle entries, alerts, medicines  
**`wearable_iot.readings`** — raw ESP32 sensor data (the document structure you showed)

The ML endpoint `/api/ml/predict/from-wearable` reads directly from  
`wearable_iot.readings` and maps:
- `sensor_data.ecg.bpm` → `hr_mean`
- `sensor_data.temperature.celsius` → `temp_mean` (converted to diff from 36.6°C baseline)
- `sensor_data.imu.acc_mag` → `sleep_disturbance_score`

---

## ML Model Integration

The Home screen banner and Alerts screen both call the ML service:
- `GET /api/ml/predict/auto` — uses Luna DB sensor readings
- `GET /api/ml/predict/from-wearable` — uses raw ESP32 readings from `wearable_iot.readings`

Model: RandomForestClassifier (200 trees), trained on mcPHASES dataset  
9 features: hr_mean, temp_mean, sleep_disturbance_score + 3-day rolling averages  
+ cycle_progress, cycle_progress_norm, temp_cycle_interaction

---

## Login Credentials (Demo)

```
Email:    sara@luna.app
Password: Test@1234
```

---

## Project Structure

```
lib/
├── main.dart                    ← Entry point + splash + auto-login
├── theme/app_theme.dart         ← Colors, gradients, styles
├── services/
│   ├── api_service.dart         ← All 40+ HTTP calls to backend
│   └── auth_provider.dart       ← Auth state management
├── widgets/shared_widgets.dart  ← Charts, cards, banners, metric tiles
└── screens/
    ├── onboarding_screen.dart
    ├── main_shell.dart           ← Bottom navigation
    ├── auth/
    │   ├── login_screen.dart
    │   └── signup_screen.dart
    ├── home/home_screen.dart     ← Cycle Tracking Dashboard
    ├── health/health_screen.dart ← Health Insights Dashboard
    ├── alerts/alerts_screen.dart ← Alerts & Predictions Dashboard
    ├── trends/trends_screen.dart ← Trends & Analytics Dashboard
    ├── medicines/medicines_screen.dart
    └── profile/profile_screen.dart
```
# luna-menstrual-predicting-system
