# 🌙 Luna Backend API

> **IT4031 – Visual Analytics and User Experience Design**  
> Wearable Menstrual Wellness Monitoring Dashboard — Backend  
> SLIIT, Specializing in Data Science

---

## Overview

A complete Node.js/Express REST API serving all four dashboard components defined in the assignment:

| Dashboard Component | Owner | Endpoints |
|---|---|---|
| Cycle Tracking Dashboard | Fonseka W S M (IT22109712) | `/api/cycle/*` `/api/predictions/*` |
| Health Insights Dashboard | Samaraweera W D U I (IT22258526) | `/api/health/*` |
| Alerts & Predictions Dashboard | Abeykoon S N (IT22184030) | `/api/alerts/*` |
| Trends & Analytics Dashboard | Thiyanima H E S (IT22271600) | `/api/trends/*` |

---

## Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Copy env file
cp .env.example .env

# 3. Start the API (no database needed – runs on in-memory store)
npm start
# → 🌙 Luna API running on port 5000

# 4. Test the root
curl http://localhost:5000/
```

---

## Authentication

All protected routes require a **Bearer token** in the `Authorization` header.

```
Authorization: Bearer <your_jwt_token>
```

### Seed credentials (built-in for demo)
```
Email:    sara@luna.app
Password: Test@1234
```

---

## API Endpoints

### 🔐 Auth — `/api/auth`

| Method | Route | Description |
|--------|-------|-------------|
| POST | `/register` | Create a new account |
| POST | `/login` | Login and get JWT token |
| POST | `/refresh` | Refresh access token |
| POST | `/logout` | Logout |

**Register body:**
```json
{
  "name": "Dishani Aluthwaththa",
  "email": "dishani@luna.app",
  "password": "SecurePass@1",
  "age": 26,
  "cycleLength": 28,
  "periodLength": 5
}
```

**Login body:**
```json
{ "email": "sara@luna.app", "password": "Test@1234" }
```

---

### 👤 User Profile — `/api/users` (Protected)

| Method | Route | Description |
|--------|-------|-------------|
| GET | `/` | Get user profile |
| PUT | `/profile` | Update name / age |
| PUT | `/cycle-settings` | Update cycleLength, periodLength, lastPeriodStart |
| PUT | `/sensors` | Toggle wearable sensor switches |
| PUT | `/conditions` | Update health conditions |
| DELETE | `/account` | Delete account |

---

### 🌸 Cycle Tracking — `/api/cycle` (Protected)

| Method | Route | Description |
|--------|-------|-------------|
| GET | `/overview` | **Full cycle dashboard** — phase, prediction, ovulation |
| GET | `/phase` | Current menstrual phase |
| GET | `/prediction` | Next period prediction (wearable-refined) |
| GET | `/calendar?year=2026&month=3` | Monthly calendar with phase colours |
| GET | `/history` | All logged cycles |
| POST | `/log` | Log a new period start date |
| GET | `/ovulation` | Ovulation & fertile window dates |

**Log period body:**
```json
{ "startDate": "2026-04-15", "endDate": "2026-04-20" }
```

---

### 💗 Health Insights — `/api/health` (Protected)

| Method | Route | Description |
|--------|-------|-------------|
| GET | `/snapshot` | **Full health dashboard** — all indicators + insights |
| GET | `/heart-rate?days=7` | Heart rate trend (line chart data) |
| GET | `/temperature?days=14` | BBT trend + ovulation shift detection |
| GET | `/sleep?days=7` | Sleep quality trend (bar chart data) |
| GET | `/insights` | Natural-language health insights ("Luna's Health Insight") |
| GET | `/status` | Overall health status card |

---

### 🔔 Alerts & Predictions — `/api/alerts` (Protected)

| Method | Route | Description |
|--------|-------|-------------|
| GET | `/` | All alerts (newest first) |
| GET | `/unread` | Unread alerts only |
| POST | `/evaluate` | Trigger alert evaluation from wearable data |
| GET | `/prediction` | Prediction summary panel |
| GET | `/preferences` | Notification preferences |
| PUT | `/preferences` | Update preferences |
| PUT | `/:id/read` | Mark one alert as read |
| PUT | `/read-all` | Mark all alerts as read |
| DELETE | `/:id` | Dismiss an alert |

**Preferences body:**
```json
{
  "periodReminder": true,
  "ovulationAlert": true,
  "temperatureSpike": true,
  "sleepDisturbance": true,
  "morningCheckin": false
}
```

---

### 📈 Trends & Analytics — `/api/trends` (Protected)

| Method | Route | Description |
|--------|-------|-------------|
| GET | `/overview` | **Full trends dashboard** — all chart data |
| GET | `/cycle-duration` | Cycle duration trend (line chart) |
| GET | `/cycle-comparison?n=6` | Bar chart comparing last N cycles |
| GET | `/regularity` | Cycle regularity analysis |
| GET | `/sleep` | Long-term sleep pattern trend |
| GET | `/temperature` | Long-term BBT trend |
| GET | `/patterns` | Recurring pattern insights |

---

### 💊 Medicines — `/api/medicines` (Protected)

| Method | Route | Description |
|--------|-------|-------------|
| GET | `/` | All medicines |
| POST | `/` | Add a medicine |
| GET | `/schedule` | Today's medication schedule |
| PUT | `/:id` | Update medicine |
| DELETE | `/:id` | Delete medicine |
| POST | `/:id/take` | Mark dose as taken |

---

### ⌚ Wearable Sensor — `/api/wearable` (Protected)

| Method | Route | Description |
|--------|-------|-------------|
| POST | `/readings` | Ingest a new sensor reading |
| GET | `/readings?from=2026-03-01&to=2026-03-31` | List readings with date range |
| GET | `/readings/latest` | Most recent reading |
| GET | `/sync-status` | Wearable connection status |

**Add reading body:**
```json
{
  "date": "2026-04-17",
  "heartRate": 72,
  "temperature": 36.6,
  "sleepHours": 7.2,
  "sleepDisturbances": 1,
  "sleepQuality": "Good"
}
```

---

### 🔮 Predictions — `/api/predictions` (Protected)

| Method | Route | Description |
|--------|-------|-------------|
| GET | `/next-period` | Next period prediction with confidence score |
| GET | `/ovulation` | Ovulation window |
| GET | `/phase-timeline` | Full phase timeline with "You are here" marker |
| GET | `/confidence` | Prediction confidence score breakdown |

---

## Services Architecture

```
src/
├── services/
│   ├── cycle.service.js      # Phase detection, period prediction, wearable refinement
│   ├── health.service.js     # HR/temp/sleep analysis, insight generation
│   ├── alerts.service.js     # Alert evaluation, prediction summary
│   └── trends.service.js     # Long-term trend analysis, cycle comparison
├── controllers/              # HTTP request handlers (thin layer)
├── routes/                   # Express route definitions
├── middleware/
│   └── auth.middleware.js    # JWT Bearer token validation
└── utils/
    ├── mock-store.js         # In-memory data store (no DB needed for demo)
    ├── scheduler.js          # Daily cron job for automated alerts
    └── db.js                 # MongoDB connection helper
```

---

## Features Implemented (Assignment Mapping)

### Cycle Tracking Dashboard (IT22109712)
- ✅ Automatic cycle tracking using wearable physiological data
- ✅ Accurate period predictions (calendar + BBT-refined)
- ✅ Current cycle phase detection (Menstrual / Follicular / Ovulation / Luteal)
- ✅ Monthly calendar with phase colour-coding
- ✅ Ovulation & fertile window calculation
- ✅ Cycle history logging

### Health Insights Dashboard (IT22258526)
- ✅ Heart rate monitoring and trend analysis
- ✅ Basal body temperature tracking and ovulation shift detection
- ✅ Sleep quality monitoring and scoring
- ✅ Overall health status computation
- ✅ Natural-language "Luna's Health Insight" generation
- ✅ Connection of physiological changes to menstrual cycle phases

### Alerts & Predictions Dashboard (IT22184030)
- ✅ Automated period reminder alerts (1 / 3 / 7 days in advance)
- ✅ Ovulation detection alert (BBT spike ≥ 0.2 °C)
- ✅ Temperature spike alert
- ✅ Poor sleep disturbance alert
- ✅ Elevated heart rate alert
- ✅ Priority-coded alerts (high / medium / low) — avoids alert fatigue
- ✅ Notification preferences per user
- ✅ Notification history
- ✅ Daily cron job for automated alert evaluation

### Trends & Analytics Dashboard (IT22271600)
- ✅ Cycle duration trend (line chart data)
- ✅ Historical cycle comparison (bar chart data)
- ✅ Cycle regularity analysis (standard deviation)
- ✅ Long-term sleep pattern trend
- ✅ Long-term body temperature trend with baseline
- ✅ Recurring pattern identification
- ✅ Monthly / overall summaries

---

## Connecting to Flutter App

In your Flutter app, replace mock data calls with HTTP requests:

```dart
// Example: Get cycle overview
final response = await http.get(
  Uri.parse('http://localhost:5000/api/cycle/overview'),
  headers: { 'Authorization': 'Bearer $token' },
);
```

---

## Notes

- **No database required** — the API ships with a seeded in-memory store for immediate demo use.
- To enable MongoDB persistence: set `MONGODB_URI` in `.env` and extend controllers to use Mongoose models.
- All physiological analysis (BBT, HR, sleep) is performed server-side in the service layer.
