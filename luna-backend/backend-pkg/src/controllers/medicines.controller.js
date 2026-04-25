/**
 * Medicines Controller — MongoDB
 */
const Medicine = require('../models/Medicine');

exports.getMedicines = async (req, res) => {
  try {
    const medicines = await Medicine.find({ userId: req.user.id }).lean();
    return res.json({ success: true, data: { medicines, total: medicines.length } });
  } catch (err) { return res.status(500).json({ success: false, message: err.message }); }
};

exports.addMedicine = async (req, res) => {
  try {
    const { name, dose, frequency, phase, notes, time } = req.body;
    if (!name) return res.status(400).json({ success: false, message: 'name is required' });
    const med = await Medicine.create({ 
      userId: req.user.id, 
      name, 
      dose: dose || '', 
      frequency: frequency || 'daily', 
      phase: phase || 'all', 
      notes: notes || '',
      time: time || '08:00'
    });
    return res.status(201).json({ success: true, message: 'Medicine added', data: med });
  } catch (err) { return res.status(500).json({ success: false, message: err.message }); }
};

exports.updateMedicine = async (req, res) => {
  try {
    const { name, dose, frequency, phase, notes, time } = req.body;
    const med = await Medicine.findOneAndUpdate(
      { _id: req.params.id, userId: req.user.id },
      { name, dose, frequency, phase, notes, time },
      { new: true }
    );
    if (!med) return res.status(404).json({ success: false, message: 'Medicine not found' });
    return res.json({ success: true, message: 'Medicine updated', data: med });
  } catch (err) { return res.status(500).json({ success: false, message: err.message }); }
};

exports.deleteMedicine = async (req, res) => {
  try {
    const med = await Medicine.findOneAndDelete({ _id: req.params.id, userId: req.user.id });
    if (!med) return res.status(404).json({ success: false, message: 'Medicine not found' });
    return res.json({ success: true, message: 'Medicine deleted' });
  } catch (err) { return res.status(500).json({ success: false, message: err.message }); }
};

exports.takeDose = async (req, res) => {
  try {
    const dateStr = req.body.date || new Date().toISOString().split('T')[0];
    const med = await Medicine.findOne({ _id: req.params.id, userId: req.user.id });
    if (!med) return res.status(404).json({ success: false, message: 'Medicine not found' });
    if (!med.taken.includes(dateStr)) {
      med.taken.push(dateStr);
      await med.save();
    }
    return res.json({ success: true, message: `Dose recorded for ${dateStr}`, data: med });
  } catch (err) { return res.status(500).json({ success: false, message: err.message }); }
};

exports.getSchedule = async (req, res) => {
  try {
    const today     = new Date().toISOString().split('T')[0];
    const medicines = await Medicine.find({ userId: req.user.id }).sort({ time: 1 }).lean();
    const schedule  = medicines.map(m => ({ ...m, takenToday: m.taken.includes(today) }));
    return res.json({ success: true, data: { date: today, schedule } });
  } catch (err) { return res.status(500).json({ success: false, message: err.message }); }
};
