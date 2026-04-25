import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import '../../theme/app_theme.dart';
import '../../services/api_service.dart';
import '../../widgets/shared_widgets.dart';

class MedicinesScreen extends StatefulWidget {
  const MedicinesScreen({super.key});
  @override
  State<MedicinesScreen> createState() => _MedicinesScreenState();
}

class _MedicinesScreenState extends State<MedicinesScreen> {
  List<Map<String, dynamic>> _medicines = [];
  List<Map<String, dynamic>> _schedule  = [];
  bool _loading = true;

  @override
  void initState() { super.initState(); _load(); }

  Future<void> _load() async {
    setState(() => _loading = true);
    try {
      final results = await Future.wait([ApiService.getMedicines(), ApiService.getMedicineSchedule()]);
      setState(() {
        _medicines = (results[0]['data']?['medicines'] as List?)?.cast<Map<String,dynamic>>() ?? [];
        _schedule  = (results[1]['data']?['schedule']  as List?)?.cast<Map<String,dynamic>>() ?? [];
        _loading   = false;
      });
    } catch (_) { setState(() => _loading = false); }
  }

  Color _phaseColor(String phase) {
    switch (phase.toLowerCase()) {
      case 'menstrual':  return AppTheme.menstrualColor;
      case 'follicular': return AppTheme.follicularColor;
      case 'luteal':     return AppTheme.lutealColor;
      default:           return AppTheme.primary;
    }
  }

  @override
  Widget build(BuildContext context) {
    final today = DateFormat('EEEE, MMM d').format(DateTime.now());
    return Scaffold(
      backgroundColor: AppTheme.background,
      appBar: LunaAppBar(title: 'My Medicines',
          actions: [IconButton(icon: const Icon(Icons.add), onPressed: _showAddDialog)]),
      body: _loading
          ? const Center(child: CircularProgressIndicator(color: AppTheme.primary))
          : RefreshIndicator(
              onRefresh: _load, color: AppTheme.primary,
              child: SingleChildScrollView(
                physics: const AlwaysScrollableScrollPhysics(),
                padding: const EdgeInsets.all(20),
                child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [

                  // Today's schedule
                  SectionHeader(title: "Today's Schedule", subtitle: today),
                  const SizedBox(height: 8),
                  if (_schedule.isEmpty)
                    LunaCard(child: Center(child: Text('No medicines scheduled for today.', style: AppTheme.body)))
                  else
                    ..._schedule.map(_buildScheduleCard),
                  const SizedBox(height: 20),

                  // 30-day tracking grid
                  const SectionHeader(title: '30-Day Tracker'),
                  const SizedBox(height: 8),
                  _build30DayGrid(),
                  const SizedBox(height: 20),

                  // All medicines
                  SectionHeader(title: 'All Medicines', subtitle: '${_medicines.length} total'),
                  const SizedBox(height: 8),
                  ..._medicines.map(_buildMedicineCard),
                  const SizedBox(height: 32),
                ]))),
      floatingActionButton: FloatingActionButton(
        backgroundColor: AppTheme.primary,
        child: const Icon(Icons.add, color: Colors.white),
        onPressed: _showAddDialog));
  }

  Widget _buildScheduleCard(Map<String, dynamic> m) {
    final takenToday = m['takenToday'] == true;
    final id = m['_id'] as String? ?? m['id'] as String? ?? '';
    final timeStr = m['time'] as String? ?? '08:00';
    return Padding(
      padding: const EdgeInsets.only(bottom: 10),
      child: LunaCard(
        child: Row(children: [
          Container(width: 44, height: 44,
            decoration: BoxDecoration(
              color: takenToday ? AppTheme.good.withOpacity(0.1) : AppTheme.primary.withOpacity(0.1),
              shape: BoxShape.circle),
            child: Icon(takenToday ? Icons.check_circle : Icons.medication,
                color: takenToday ? AppTheme.good : AppTheme.primary, size: 22)),
          const SizedBox(width: 12),
          Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Text(m['name'] as String? ?? '', style: AppTheme.bodyBold),
            Text('$timeStr · ${m['dose'] ?? ''} · ${m['frequency'] ?? 'daily'}', style: AppTheme.caption),
            if ((m['notes'] as String?)?.isNotEmpty == true)
              Text(m['notes'] as String, style: AppTheme.caption.copyWith(color: AppTheme.textHint)),
          ])),
          ElevatedButton(
            onPressed: takenToday ? null : () async {
              await ApiService.takeDose(id);
              await _load();
            },
            style: ElevatedButton.styleFrom(
              backgroundColor: takenToday ? AppTheme.good : AppTheme.primary,
              minimumSize: const Size(70, 34),
              padding: const EdgeInsets.symmetric(horizontal: 12)),
            child: Text(takenToday ? 'Taken ✓' : 'Take', style: const TextStyle(fontSize: 12))),
        ])));
  }

  Widget _build30DayGrid() {
    final now = DateTime.now();
    return LunaCard(
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        const Text('Dose adherence', style: TextStyle(fontWeight: FontWeight.w600, fontSize: 13)),
        const SizedBox(height: 12),
        Wrap(spacing: 6, runSpacing: 6,
          children: List.generate(30, (i) {
            final day = now.subtract(Duration(days: 29 - i));
            final dateStr = DateFormat('yyyy-MM-dd').format(day);
            final taken = _medicines.any((m) => (m['taken'] as List?)?.contains(dateStr) == true);
            return Container(
              width: 28, height: 28,
              decoration: BoxDecoration(
                color: taken ? AppTheme.primary : AppTheme.divider,
                borderRadius: BorderRadius.circular(6)),
              child: Center(child: Text('${day.day}',
                  style: TextStyle(
                      color: taken ? Colors.white : AppTheme.textHint,
                      fontSize: 10,
                      fontWeight: taken ? FontWeight.w600 : FontWeight.w400))));
          })),
      ]));
  }

  Widget _buildMedicineCard(Map<String, dynamic> m) {
    final phase = m['phase'] as String? ?? 'all';
    final color = _phaseColor(phase);
    final id    = m['_id'] as String? ?? m['id'] as String? ?? '';
    final timeStr = m['time'] as String? ?? '08:00';
    return Padding(
      padding: const EdgeInsets.only(bottom: 10),
      child: LunaCard(
        child: Row(children: [
          Container(width: 10, height: 50, decoration: BoxDecoration(
              color: color, borderRadius: BorderRadius.circular(5))),
          const SizedBox(width: 12),
          Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Text(m['name'] as String? ?? '', style: AppTheme.bodyBold),
            Text('$timeStr · ${m['dose'] ?? ''} · ${m['frequency'] ?? ''} · Phase: $phase', style: AppTheme.caption),
          ])),
          IconButton(
            icon: const Icon(Icons.delete_outline, color: AppTheme.warning, size: 20),
            onPressed: () async {
              await ApiService.deleteMedicine(id);
              await _load();
            }),
        ])));
  }

  void _showAddDialog() {
    final name  = TextEditingController();
    final dose  = TextEditingController();
    final notes = TextEditingController();
    TimeOfDay selectedTime = const TimeOfDay(hour: 8, minute: 0);
    String freq  = 'daily';
    String phase = 'all';

    showModalBottomSheet(
      context: context, isScrollControlled: true,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(20))),
      builder: (ctx) => StatefulBuilder(
        builder: (context, setModalState) => Padding(
          padding: EdgeInsets.fromLTRB(24, 20, 24, MediaQuery.of(ctx).viewInsets.bottom + 24),
          child: Column(mainAxisSize: MainAxisSize.min, crossAxisAlignment: CrossAxisAlignment.start, children: [
            Text('Add Medicine', style: AppTheme.heading3),
            const SizedBox(height: 16),
            TextField(controller: name,  decoration: const InputDecoration(hintText: 'Medicine name', labelText: 'Name')),
            const SizedBox(height: 10),
            TextField(controller: dose,  decoration: const InputDecoration(hintText: 'e.g. 500 mg', labelText: 'Dose')),
            const SizedBox(height: 16),
            
            // Time selection
            Row(children: [
              const Icon(Icons.access_time, size: 20, color: AppTheme.primary),
              const SizedBox(width: 8),
              Text('Reminder Time: ${selectedTime.format(context)}', style: AppTheme.bodyBold),
              const Spacer(),
              TextButton(
                onPressed: () async {
                  final time = await showTimePicker(context: context, initialTime: selectedTime);
                  if (time != null) setModalState(() => selectedTime = time);
                },
                child: const Text('Change'),
              ),
            ]),
            
            const SizedBox(height: 10),
            TextField(controller: notes, decoration: const InputDecoration(hintText: 'Optional notes', labelText: 'Notes')),
            const SizedBox(height: 20),
            SizedBox(
              width: double.infinity,
              child: ElevatedButton(
                onPressed: () async {
                  final hh = selectedTime.hour.toString().padLeft(2, '0');
                  final mm = selectedTime.minute.toString().padLeft(2, '0');
                  final timeStr = '$hh:$mm';
                  
                  await ApiService.addMedicine({
                    'name': name.text, 
                    'dose': dose.text, 
                    'frequency': freq, 
                    'phase': phase, 
                    'notes': notes.text,
                    'time': timeStr,
                  });
                  if (mounted) Navigator.pop(context);
                  await _load();
                },
                child: const Text('Add Medicine'),
              ),
            ),
          ]))));
  }
}
