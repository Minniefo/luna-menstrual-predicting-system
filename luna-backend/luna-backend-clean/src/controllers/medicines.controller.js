/**
 * Medicines Controller
 * ─────────────────────
 * GET    /api/medicines              – all medicines for user
 * POST   /api/medicines              – add a medicine
 * PUT    /api/medicines/:id          – update medicine
 * DELETE /api/medicines/:id          – delete medicine
 * POST   /api/medicines/:id/take     – mark a dose as taken
 * GET    /api/medicines/schedule     – today's schedule
 */

const { store, uuid } = require('../utils/mock-store');

// ── List medicines ────────────────────────────────────────────────────────────
exports.getMedicines = (req, res) => {
  const medicines = store.medicinesFor(req.user.id);
  return res.json({ success: true, data: { medicines, total: medicines.length } });
};

// ── Add medicine ──────────────────────────────────────────────────────────────
exports.addMedicine = (req, res) => {
  const { name, dose, frequency, phase, notes } = req.body;
  if (!name) return res.status(400).json({ success: false, message: 'name is required' });
  const med = store.addMedicine({
    id: uuid(),
    userId: req.user.id,
    name,
    dose:      dose      || '',
    frequency: frequency || 'daily',
    phase:     phase     || 'all',
    notes:     notes     || '',
    taken:     [],
    createdAt: new Date(),
  });
  return res.status(201).json({ success: true, message: 'Medicine added', data: med });
};

// ── Update medicine ───────────────────────────────────────────────────────────
exports.updateMedicine = (req, res) => {
  const { name, dose, frequency, phase, notes } = req.body;
  const updated = store.updateMedicine(req.params.id, { name, dose, frequency, phase, notes });
  if (!updated) return res.status(404).json({ success: false, message: 'Medicine not found' });
  return res.json({ success: true, message: 'Medicine updated', data: updated });
};

// ── Delete medicine ───────────────────────────────────────────────────────────
exports.deleteMedicine = (req, res) => {
  const deleted = store.deleteMedicine(req.params.id);
  if (!deleted) return res.status(404).json({ success: false, message: 'Medicine not found' });
  return res.json({ success: true, message: 'Medicine deleted' });
};

// ── Mark dose taken ───────────────────────────────────────────────────────────
exports.takeDose = (req, res) => {
  const dateStr = req.body.date || new Date().toISOString().split('T')[0];
  const med = store.medicinesFor(req.user.id).find(m => m.id === req.params.id);
  if (!med) return res.status(404).json({ success: false, message: 'Medicine not found' });
  if (!med.taken.includes(dateStr)) med.taken.push(dateStr);
  return res.json({ success: true, message: `Dose recorded for ${dateStr}`, data: med });
};

// ── Today's schedule ──────────────────────────────────────────────────────────
exports.getSchedule = (req, res) => {
  const today     = new Date().toISOString().split('T')[0];
  const medicines = store.medicinesFor(req.user.id);
  const schedule  = medicines.map(m => ({
    ...m,
    takenToday: m.taken.includes(today),
  }));
  return res.json({ success: true, data: { date: today, schedule } });
};
