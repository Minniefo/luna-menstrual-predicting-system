/**
 * mock-store.js
 * ─────────────
 * A simple in-memory store that the controllers fall back to when MongoDB
 * is not connected.  This lets you run and demo every endpoint immediately
 * without a database.
 *
 * Data is lost on restart – attach MongoDB for persistence.
 */

const { v4: uuid } = require('uuid');
const bcrypt = require('bcryptjs');

// ── seed password ────────────────────────────────────────────────────────────
const seedHash = bcrypt.hashSync('Test@1234', 10);

// ── Users ────────────────────────────────────────────────────────────────────
const users = [
  {
    id: 'user-001',
    name: 'Sara Johnson',
    email: 'sara@luna.app',
    password: seedHash,
    age: 26,
    cycleLength: 28,
    periodLength: 5,
    lastPeriodStart: '2026-03-17',
    conditions: ['mild_anemia'],
    sensors: { heartRate: true, temperature: true, sleep: true },
    createdAt: new Date('2026-01-01'),
  },
];

// ── Cycle entries ─────────────────────────────────────────────────────────────
const cycleEntries = [
  { id: uuid(), userId: 'user-001', startDate: '2026-01-18', endDate: '2026-01-23', duration: 28, periodLength: 5, phase: 'menstrual' },
  { id: uuid(), userId: 'user-001', startDate: '2026-02-15', endDate: '2026-02-20', duration: 28, periodLength: 5, phase: 'menstrual' },
  { id: uuid(), userId: 'user-001', startDate: '2026-03-15', endDate: '2026-03-20', duration: 28, periodLength: 5, phase: 'menstrual' },
];

// ── Wearable sensor readings ──────────────────────────────────────────────────
const sensorReadings = (() => {
  const data = [];
  for (let i = 0; i < 30; i++) {
    const d = new Date('2026-03-17');
    d.setDate(d.getDate() + i);
    data.push({
      id: uuid(),
      userId: 'user-001',
      date: d.toISOString().split('T')[0],
      heartRate: Math.round(65 + Math.sin(i / 3) * 10),
      temperature: parseFloat((36.4 + Math.sin(i / 5) * 0.4).toFixed(1)),
      sleepHours: parseFloat((6.5 + Math.sin(i / 4) * 1.2).toFixed(1)),
      sleepDisturbances: Math.round(Math.random() * 5),
      sleepQuality: ['Good', 'Fair', 'Poor'][Math.floor(Math.random() * 3)],
      createdAt: new Date(),
    });
  }
  return data;
})();

// ── Alerts ────────────────────────────────────────────────────────────────────
const alerts = [
  {
    id: uuid(), userId: 'user-001', type: 'period_prediction',
    title: 'Period Prediction', priority: 'high',
    message: 'Next period predicted in 14 days — Sunday 30 March 2026.',
    isRead: false, createdAt: new Date('2026-03-16T21:20:00'),
  },
  {
    id: uuid(), userId: 'user-001', type: 'ovulation_detected',
    title: 'Ovulation Detected', priority: 'high',
    message: 'BBT rose 0.3 °C — peak fertility window.',
    isRead: false, createdAt: new Date('2026-03-17T07:12:00'),
  },
  {
    id: uuid(), userId: 'user-001', type: 'temperature_spike',
    title: 'Temperature Spike', priority: 'medium',
    message: 'Temperature 0.3 °C above baseline.',
    isRead: false, createdAt: new Date('2026-03-17T06:58:00'),
  },
  {
    id: uuid(), userId: 'user-001', type: 'sleep_disturbance',
    title: 'Poor Sleep Detected', priority: 'medium',
    message: '4 disturbances detected last night.',
    isRead: true, createdAt: new Date('2026-03-17T06:00:00'),
  },
];

// ── Notification preferences ──────────────────────────────────────────────────
const notificationPrefs = {
  'user-001': {
    periodReminder: true,
    ovulationAlert: true,
    temperatureSpike: true,
    sleepDisturbance: true,
    morningCheckin: false,
  },
};

// ── Medicines ─────────────────────────────────────────────────────────────────
const medicines = [
  {
    id: uuid(), userId: 'user-001',
    name: 'Iron Supplement', dose: '65 mg', frequency: 'daily',
    phase: 'menstrual', notes: 'Take with food', taken: [],
    createdAt: new Date(),
  },
  {
    id: uuid(), userId: 'user-001',
    name: 'Evening Primrose Oil', dose: '500 mg', frequency: 'daily',
    phase: 'luteal', notes: 'For PMS relief', taken: [],
    createdAt: new Date(),
  },
];

// ── Helper ────────────────────────────────────────────────────────────────────
const store = {
  users,
  cycleEntries,
  sensorReadings,
  alerts,
  notificationPrefs,
  medicines,

  findUser: (predicate) => users.find(predicate),
  addUser: (u) => { users.push(u); return u; },
  updateUser: (id, patch) => {
    const idx = users.findIndex(u => u.id === id);
    if (idx === -1) return null;
    users[idx] = { ...users[idx], ...patch };
    return users[idx];
  },

  addReading: (r) => { sensorReadings.push(r); return r; },
  readingsFor: (userId) => sensorReadings.filter(r => r.userId === userId),
  readingsForDateRange: (userId, from, to) =>
    sensorReadings.filter(r => r.userId === userId && r.date >= from && r.date <= to),

  addCycle: (c) => { cycleEntries.push(c); return c; },
  cyclesFor: (userId) => cycleEntries.filter(c => c.userId === userId),

  alertsFor: (userId) => alerts.filter(a => a.userId === userId),
  addAlert: (a) => { alerts.push(a); return a; },
  markAlertRead: (alertId) => {
    const a = alerts.find(x => x.id === alertId);
    if (a) a.isRead = true;
    return a;
  },
  markAllAlertsRead: (userId) => {
    alerts.filter(a => a.userId === userId).forEach(a => (a.isRead = true));
  },

  medicinesFor: (userId) => medicines.filter(m => m.userId === userId),
  addMedicine: (m) => { medicines.push(m); return m; },
  updateMedicine: (id, patch) => {
    const idx = medicines.findIndex(m => m.id === id);
    if (idx === -1) return null;
    medicines[idx] = { ...medicines[idx], ...patch };
    return medicines[idx];
  },
  deleteMedicine: (id) => {
    const idx = medicines.findIndex(m => m.id === id);
    if (idx === -1) return false;
    medicines.splice(idx, 1);
    return true;
  },

  getPrefs: (userId) => notificationPrefs[userId] || {
    periodReminder: true, ovulationAlert: true,
    temperatureSpike: true, sleepDisturbance: true, morningCheckin: false,
  },
  setPrefs: (userId, prefs) => { notificationPrefs[userId] = prefs; },
};

module.exports = { store, uuid };
