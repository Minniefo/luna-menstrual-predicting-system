// ── Cycle Tracking Dashboard ──────────────────────────────────────────────────
// IT4031 VAUED — Fonseka W S M (IT22109712)
// Reads from MongoDB via API + ML model predictions
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:table_calendar/table_calendar.dart';
import 'package:intl/intl.dart';
import '../../theme/app_theme.dart';
import '../../services/api_service.dart';
import '../../services/auth_provider.dart';
import '../../widgets/shared_widgets.dart';
import '../medicines/medicines_screen.dart';

class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});
  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  // Data from MongoDB via Node.js API
  Map<String, dynamic>? _overview;       // cycle overview + phase
  Map<String, dynamic>? _calendar;       // monthly calendar data
  Map<String, dynamic>? _mlPrediction;   // ML model prediction
  Map<String, dynamic>? _wearableReading;// latest ESP32 sensor reading
  Map<String, dynamic>? _prediction;     // next period prediction

  bool _loading = true;
  String? _error;
  DateTime _focusedDay = DateTime.now();

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() { _loading = true; _error = null; });
    try {
      // Fetch all data in parallel from MongoDB
      final results = await Future.wait([
        ApiService.getCycleOverview(),
        ApiService.getCalendar(),
        ApiService.mlPredictAuto(),
        ApiService.getLatestReading(),
        ApiService.getNextPeriod(),
      ]);
      if (!mounted) return;
      setState(() {
        _overview        = results[0]['data'] as Map<String, dynamic>?;
        _calendar        = results[1]['data'] as Map<String, dynamic>?;
        _mlPrediction    = results[2] as Map<String, dynamic>?;
        _wearableReading = results[3]['data'] as Map<String, dynamic>?;
        _prediction      = results[4]['data'] as Map<String, dynamic>?;
        _loading         = false;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _error   = 'Could not connect to server. Check your network.';
        _loading = false;
      });
    }
  }

  // ── Helpers ──────────────────────────────────────────────────────────────
  Color _dayColor(Map<String, dynamic> day) {
    if (day['isPeriod']    == true) return AppTheme.menstrualColor;
    if (day['isOvulation'] == true) return AppTheme.ovulationColor;
    if (day['isFertile']   == true) return AppTheme.follicularColor;
    if (day['isPredicted'] == true) return AppTheme.textHint;
    return Colors.transparent;
  }

  int get _daysRemaining =>
      (_prediction?['daysRemaining'] as num?)?.toInt() ??
      (_overview?['prediction']?['daysRemaining'] as num?)?.toInt() ??
      14;

  String get _accuracy =>
      _prediction?['accuracy'] as String? ??
      _overview?['prediction']?['confidence'] as String? ??
      '—';

  bool get _periodSoon =>
      _mlPrediction?['summary']?['any_period_soon'] == true ||
      _daysRemaining <= 5;

  // ── Build ─────────────────────────────────────────────────────────────────
  @override
  Widget build(BuildContext context) {
    final user = context.watch<AuthProvider>().user;
    final name = (user?['name'] as String?)?.split(' ').first ?? 'there';
    final hour = DateTime.now().hour;
    final greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

    return Scaffold(
      backgroundColor: AppTheme.background,
      body: SafeArea(
        child: RefreshIndicator(
          onRefresh: _load,
          color: AppTheme.primary,
          child: _loading
              ? const Center(child: CircularProgressIndicator(color: AppTheme.primary))
              : _error != null
                  ? ErrorMessage(message: _error!, onRetry: _load)
                  : CustomScrollView(slivers: [
                      SliverToBoxAdapter(child: Padding(
                        padding: const EdgeInsets.fromLTRB(20, 20, 20, 32),
                        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [

                          // ── Header ─────────────────────────────────
                          _buildHeader(greeting, name),
                          const SizedBox(height: 20),

                          // ── ML Prediction Banner (from mcPHASES model)
                          PredictionBanner(
                            daysRemaining: _daysRemaining,
                            accuracy: _accuracy,
                            periodSoon: _periodSoon,
                          ),
                          const SizedBox(height: 16),

                          // ── Current Cycle Phase Card ───────────────
                          _buildPhaseCard(),
                          const SizedBox(height: 16),

                          // ── Live Wearable Data (from MongoDB wearable_iot)
                          if (_wearableReading != null) ...[
                            _buildLiveDataSection(),
                            const SizedBox(height: 16),
                          ],

                          // ── Cycle Calendar ─────────────────────────
                          SectionHeader(
                            title: 'Cycle Calendar',
                            subtitle: DateFormat('MMMM yyyy').format(_focusedDay),
                          ),
                          const SizedBox(height: 8),
                          _buildCalendar(),
                          const SizedBox(height: 8),
                          _buildCalendarLegend(),
                          const SizedBox(height: 16),

                          // ── Phase Timeline ─────────────────────────
                          const SectionHeader(title: 'Phase Timeline'),
                          const SizedBox(height: 8),
                          _buildPhaseTimeline(),
                          const SizedBox(height: 16),

                          // ── Cycle Duration History ─────────────────
                          _buildCycleDurationHistory(),
                        ]),
                      )),
                    ]),
        ),
      ),
    );
  }

  // ── Header ────────────────────────────────────────────────────────────────
  Widget _buildHeader(String greeting, String name) => Row(children: [
    Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
      Text('$greeting, $name 👋', style: AppTheme.caption.copyWith(fontSize: 13)),
      const SizedBox(height: 4),
      Row(children: [
        ShaderMask(
          shaderCallback: (bounds) => AppTheme.primaryGradient.createShader(bounds),
          child: const Icon(Icons.mode_night_rounded, color: Colors.white, size: 28),
        ),
        const SizedBox(width: 8),
        const Text('Luna',
          style: TextStyle(
            fontWeight: FontWeight.w700,
            fontSize: 24,
            color: AppTheme.primary,
            letterSpacing: -0.5,
          ),
        ),
      ]),
    ])),
    IconButton(
      icon: const Icon(Icons.medical_services_outlined, color: AppTheme.primary),
      onPressed: () => Navigator.push(
        context, MaterialPageRoute(builder: (_) => const MedicinesScreen())),
      tooltip: 'Medicines',
    ),
    IconButton(
      icon: const Icon(Icons.refresh_outlined, color: AppTheme.textSecondary),
      onPressed: _load,
      tooltip: 'Refresh',
    ),
  ]);

  // ── Phase Card ────────────────────────────────────────────────────────────
  Widget _buildPhaseCard() {
    final phase     = _overview?['phase'] as Map<String, dynamic>?;
    final phaseName = (phase?['phase'] as String?) ?? 'Follicular';
    final cycleDay  = (_overview?['currentCycleDay'] as num?)?.toInt() ?? 1;
    final total     = (_overview?['cycleLength'] as num?)?.toInt() ?? 28;
    final desc      = (phase?['description'] as String?) ?? '';
    final progress  = (cycleDay / total).clamp(0.0, 1.0);

    return LunaCard(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
      Row(children: [
        Container(
          padding: const EdgeInsets.all(8),
          decoration: BoxDecoration(
            color: AppTheme.phaseColor(phaseName).withOpacity(0.1),
            shape: BoxShape.circle,
          ),
          child: Icon(
            AppTheme.phaseIcon(phaseName),
            color: AppTheme.phaseColor(phaseName),
            size: 28,
          ),
        ),
        const SizedBox(width: 12),
        Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Text(phaseName, style: AppTheme.heading3),
          Text('Day $cycleDay of $total', style: AppTheme.caption),
        ])),
        PhaseChip(phase: phaseName),
      ]),
      const SizedBox(height: 12),
      ClipRRect(
        borderRadius: BorderRadius.circular(6),
        child: LinearProgressIndicator(
          value: progress,
          minHeight: 8,
          backgroundColor: AppTheme.divider,
          valueColor: AlwaysStoppedAnimation<Color>(
            AppTheme.phaseColor(phaseName),
          ),
        ),
      ),
      if (desc.isNotEmpty) ...[
        const SizedBox(height: 8),
        Text(desc, style: AppTheme.body.copyWith(fontSize: 13, height: 1.5)),
      ],
    ]));
  }

  // ── Live Wearable Data ────────────────────────────────────────────────────
  Widget _buildLiveDataSection() {
    final r    = _wearableReading!;
    final hr   = r['heartRate'];
    final temp = r['temperature'];
    final sleep= r['sleepHours'];
    final hrLabel   = hr   != null ? '${(hr as num).toStringAsFixed(2)} bpm' : 'No data';
    final tempLabel = temp != null ? '${(temp as num).toStringAsFixed(1)} °C' : 'No data';
    final sleepLabel= sleep!= null ? '${(sleep as num).toStringAsFixed(2)}h' : 'No data';

    return Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
      const SectionHeader(
        title: 'Live Sensor Data',
        subtitle: 'From wearable device (MongoDB)',
      ),
      const SizedBox(height: 8),
      Row(children: [
        Expanded(child: MetricCard(
          label: 'Heart Rate', value: hrLabel, status: 'Good',
          icon: Icons.favorite, color: AppTheme.menstrualColor,
        )),
        const SizedBox(width: 10),
        Expanded(child: MetricCard(
          label: 'Temperature', value: tempLabel, status: 'Warm',
          icon: Icons.thermostat, color: AppTheme.ovulationColor,
        )),
        const SizedBox(width: 10),
        Expanded(child: MetricCard(
          label: 'Sleep', value: sleepLabel, status: 'Fair',
          icon: Icons.bedtime, color: AppTheme.lutealColor,
        )),
      ]),
    ]);
  }

  // ── Calendar ──────────────────────────────────────────────────────────────
  Future<void> _loadCalendar(DateTime day) async {
    try {
      final res = await ApiService.getCalendar(year: day.year, month: day.month);
      if (!mounted) return;
      setState(() {
        _calendar = res['data'] as Map<String, dynamic>?;
        _focusedDay = day;
      });
    } catch (e) {
      debugPrint('Error loading calendar: $e');
    }
  }

  Widget _buildCalendar() {
    final days = (_calendar?['days'] as List?)?.cast<Map<String, dynamic>>() ?? [];
    final dayMap = <String, Map<String, dynamic>>{};
    for (final d in days) {
      final key = d['date'] as String?;
      if (key != null) dayMap[key] = d;
    }

    return LunaCard(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      child: TableCalendar(
        firstDay: DateTime.now().subtract(const Duration(days: 90)),
        lastDay: DateTime.now().add(const Duration(days: 90)),
        focusedDay: _focusedDay,
        headerStyle: HeaderStyle(
          formatButtonVisible: false,
          titleCentered: true,
          titleTextStyle: AppTheme.bodyBold,
          leftChevronIcon: const Icon(Icons.chevron_left, color: AppTheme.primary),
          rightChevronIcon: const Icon(Icons.chevron_right, color: AppTheme.primary),
        ),
        calendarStyle: CalendarStyle(
          todayDecoration: const BoxDecoration(
            color: AppTheme.primary,
            shape: BoxShape.circle,
          ),
          todayTextStyle: const TextStyle(
            color: Colors.white,
            fontWeight: FontWeight.w700,
            fontSize: 14,
          ),
          defaultTextStyle: AppTheme.body.copyWith(color: AppTheme.textPrimary),
          weekendTextStyle: AppTheme.body.copyWith(color: AppTheme.textSecondary),
        ),
        calendarBuilders: CalendarBuilders(
          defaultBuilder: (ctx, day, _) {
            final key = DateFormat('yyyy-MM-dd').format(day);
            final info = dayMap[key];
            if (info == null) return null;
            final dotColor = _dayColor(info);
            if (dotColor == Colors.transparent) return null;
            return Center(
              child: Container(
                width: 34, height: 34,
                decoration: BoxDecoration(
                  color: dotColor.withOpacity(0.18),
                  shape: BoxShape.circle,
                  border: info['isPredicted'] == true
                      ? Border.all(color: dotColor.withOpacity(0.4), width: 1.5)
                      : null,
                ),
                child: Center(
                  child: Text(
                    '${day.day}',
                    style: TextStyle(
                      color: dotColor,
                      fontWeight: FontWeight.w600,
                      fontSize: 13,
                    ),
                  ),
                ),
              ),
            );
          },
        ),
        onPageChanged: _loadCalendar,
        onDaySelected: (selected, _) => setState(() => _focusedDay = selected),
      ),
    );
  }

  Widget _buildCalendarLegend() {
    const items = [
      ('Period',    AppTheme.menstrualColor),
      ('Ovulation', AppTheme.ovulationColor),
      ('Fertile',   AppTheme.follicularColor),
      ('Predicted', AppTheme.textHint),
    ];
    return Wrap(
      spacing: 16,
      runSpacing: 6,
      children: items.map((e) => Row(mainAxisSize: MainAxisSize.min, children: [
        Container(
          width: 10, height: 10,
          decoration: BoxDecoration(color: e.$2, shape: BoxShape.circle),
        ),
        const SizedBox(width: 4),
        Text(e.$1, style: AppTheme.caption),
      ])).toList(),
    );
  }

  // ── Phase Timeline ────────────────────────────────────────────────────────
  Widget _buildPhaseTimeline() {
    const phases = [
      ('Menstrual', Icons.water_drop_rounded, AppTheme.menstrualColor),
      ('Follicular',Icons.auto_awesome_rounded, AppTheme.follicularColor),
      ('Ovulation', Icons.wb_sunny_rounded, AppTheme.ovulationColor),
      ('Luteal',    Icons.mode_night_rounded, AppTheme.lutealColor),
    ];
    final currentPhase =
        (_overview?['phase']?['phase'] as String?) ?? 'Follicular';

    return LunaCard(child: Row(
      children: phases.map((p) {
        final isActive = p.$1.toLowerCase() == currentPhase.toLowerCase();
        return Expanded(child: Column(children: [
          Container(
            width: 38, height: 38,
            decoration: BoxDecoration(
              color: isActive ? p.$3 : p.$3.withOpacity(0.12),
              shape: BoxShape.circle,
            ),
            child: Center(
              child: Icon(
                p.$2,
                color: isActive ? Colors.white : p.$3,
                size: 18,
              ),
            ),
          ),
          const SizedBox(height: 4),
          Text(
            p.$1,
            style: TextStyle(
              color: isActive ? p.$3 : AppTheme.textHint,
              fontWeight: isActive ? FontWeight.w600 : FontWeight.w400,
              fontSize: 10,
            ),
            textAlign: TextAlign.center,
          ),
          if (isActive)
            Container(
              margin: const EdgeInsets.only(top: 2),
              width: 4, height: 4,
              decoration: BoxDecoration(color: p.$3, shape: BoxShape.circle),
            ),
        ]));
      }).toList(),
    ));
  }

  // ── Cycle Duration History ────────────────────────────────────────────────
  Widget _buildCycleDurationHistory() {
    final cycleLen = (_overview?['cycleLength'] as num?)?.toInt() ?? 28;
    final items = [
      ('Jan', 28), ('Feb', 29), ('Mar', 28), ('Current', cycleLen),
    ];

    return Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
      const SectionHeader(title: 'Cycle Duration'),
      const SizedBox(height: 8),
      LunaCard(child: Column(
        children: items.map((e) => Padding(
          padding: const EdgeInsets.symmetric(vertical: 5),
          child: Row(children: [
            SizedBox(
              width: 56,
              child: Text(e.$1, style: AppTheme.body),
            ),
            Expanded(child: ClipRRect(
              borderRadius: BorderRadius.circular(4),
              child: LinearProgressIndicator(
                value: e.$2 / 35.0,
                minHeight: 8,
                backgroundColor: AppTheme.divider,
                valueColor: const AlwaysStoppedAnimation<Color>(AppTheme.primary),
              ),
            )),
            const SizedBox(width: 8),
            Text('${e.$2}', style: AppTheme.caption),
          ]),
        )).toList(),
      )),
    ]);
  }
}
