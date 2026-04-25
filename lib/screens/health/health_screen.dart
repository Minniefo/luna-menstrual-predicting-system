// ── Health Insights Dashboard ─────────────────────────────────────────────────
// IT4031 VAUED — Samaraweera W D U I (IT22258526)
import 'package:flutter/material.dart';
import 'dart:async';
import '../../theme/app_theme.dart';
import '../../services/api_service.dart';
import '../../widgets/shared_widgets.dart';

class HealthScreen extends StatefulWidget {
  const HealthScreen({super.key});
  @override
  State<HealthScreen> createState() => _HealthScreenState();
}

class _HealthScreenState extends State<HealthScreen> {
  Map<String, dynamic>? _snapshot;
  Map<String, dynamic>? _hrData;
  Map<String, dynamic>? _tempData;
  Map<String, dynamic>? _sleepData;
  Map<String, dynamic>? _liveReading;
  bool _loading = true;
  String? _error;
  Timer? _liveTimer;

  @override
  void initState() { 
    super.initState(); 
    _load(); 
    _startLivePolling();
  }

  @override
  void dispose() {
    _liveTimer?.cancel();
    super.dispose();
  }

  void _startLivePolling() {
    _liveTimer = Timer.periodic(const Duration(seconds: 10), (timer) {
      if (mounted) _fetchLiveReading();
    });
  }

  Future<void> _fetchLiveReading() async {
    try {
      final res = await ApiService.getLatestReading();
      if (res['success'] == true && mounted) {
        setState(() => _liveReading = res['data'] as Map<String, dynamic>?);
      }
    } catch (_) { /* Silent fail for live polling */ }
  }

  Future<void> _load() async {
    setState(() { _loading = true; _error = null; });
    try {
      final results = await Future.wait([
        ApiService.getHealthSnapshot(),
        ApiService.getHeartRate(days: 7),
        ApiService.getTemperature(days: 14),
        ApiService.getSleep(days: 7),
      ]);
      if (!mounted) return;
      setState(() {
        _snapshot  = results[0]['data'] as Map<String, dynamic>?;
        _hrData    = results[1]['data'] as Map<String, dynamic>?;
        _tempData  = results[2]['data'] as Map<String, dynamic>?;
        _sleepData = results[3]['data'] as Map<String, dynamic>?;
        _loading   = false;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() { _error = 'Unable to load health data.'; _loading = false; });
    }
  }

  double _calculateTrend(String key) {
    final List readings = (_hrData?['trend'] as List?) ?? (_tempData?['trend'] as List?) ?? [];
    if (readings.length < 4) return 0.0;
    
    final valid = readings.where((r) => r[key] != null).toList();
    if (valid.length < 4) return 0.0;
    
    final half = (valid.length / 2).floor();
    final recent = valid.sublist(valid.length - half);
    final previous = valid.sublist(valid.length - (half * 2), valid.length - half);
    
    final avgRecent = recent.fold(0.0, (s, r) => s + (r[key] as num).toDouble()) / recent.length;
    final avgPrev = previous.fold(0.0, (s, r) => s + (r[key] as num).toDouble()) / previous.length;
    
    if (avgPrev == 0) return 0.0;
    return ((avgRecent - avgPrev) / avgPrev) * 100;
  }

  int _calculateHealthScore() {
    final sleep = _snapshot?['sleep'] as Map<String, dynamic>?;
    final hr = _snapshot?['heartRate'] as Map<String, dynamic>?;
    
    double score = 70.0;
    if (sleep != null && (sleep['averageHours'] ?? 0) >= 7) score += 15;
    if (hr != null && (hr['average'] ?? 100) <= 80) score += 15;
    
    return score.clamp(0, 100).toInt();
  }

  @override
  Widget build(BuildContext context) => Scaffold(
    backgroundColor: AppTheme.background,
    appBar: LunaAppBar(
      title: 'Health Insights',
      actions: [IconButton(icon: const Icon(Icons.refresh), onPressed: _load)],
    ),
    body: _loading
        ? const Center(child: CircularProgressIndicator(color: AppTheme.primary))
        : _error != null
            ? ErrorMessage(message: _error!, onRetry: _load)
            : RefreshIndicator(
                onRefresh: _load,
                color: AppTheme.primary,
                child: SingleChildScrollView(
                  physics: const AlwaysScrollableScrollPhysics(),
                  padding: const EdgeInsets.all(20),
                  child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [

                    Text(
                      'Live biometrics from your wearable sensors.',
                      style: AppTheme.body.copyWith(fontSize: 13),
                    ),
                    const SizedBox(height: 16),

                    // Overall health status
                    _buildOverallStatus(),
                    const SizedBox(height: 16),

                    // Quick metric cards
                    _buildMetricsRow(),
                    const SizedBox(height: 20),

                    // Heart Rate chart
                    const SectionHeader(
                      title: 'Heart Rate Variations',
                      subtitle: 'Fluctuations correlated with your cycle phase',
                    ),
                    const SizedBox(height: 8),
                    LunaCard(child: SizedBox(
                      height: 180,
                      child: HRLineChart(
                        data: (_hrData?['trend'] as List?)
                            ?.cast<Map<String, dynamic>>() ?? [],
                      ),
                    )),
                    const SizedBox(height: 24),

                    // Temperature chart + ovulation detection
                    SectionHeader(
                      title: 'Metabolic Trend',
                      subtitle: 'Sustained shifts often indicate ovulation',
                      action: _tempData?['analysis']?['ovulationShift']?['detected'] == true
                        ? Container(
                            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                            decoration: BoxDecoration(
                              color: AppTheme.ovulationColor.withOpacity(0.12),
                              borderRadius: BorderRadius.circular(20),
                            ),
                            child: const Text('Ovulation Peak', style: TextStyle(color: AppTheme.ovulationColor, fontSize: 10, fontWeight: FontWeight.bold)),
                          )
                        : null,
                    ),
                    const SizedBox(height: 8),
                    LunaCard(child: SizedBox(
                      height: 180,
                      child: TempLineChart(
                        data: (_tempData?['trend'] as List?)
                            ?.cast<Map<String, dynamic>>() ?? [],
                        baseline: (_tempData?['baseline'] as num?)?.toDouble() ?? 36.7,
                      ),
                    )),
                    const SizedBox(height: 24),

                    // Sleep Quality chart
                    const SectionHeader(
                      title: 'Rest Quality Index',
                      subtitle: 'Weekly disturbances & pattern analysis',
                    ),
                    const SizedBox(height: 8),
                    _buildSleepLegend(),
                    const SizedBox(height: 12),
                    LunaCard(child: SizedBox(
                      height: 160,
                      child: SleepBarChart(
                        data: (_sleepData?['analysis']?['weekly'] as List?)
                            ?.cast<Map<String, dynamic>>() ?? [],
                      ),
                    )),
                    const SizedBox(height: 24),

                    // Luna's AI Health Insight panel
                    _buildInsightsPanel(),
                    const SizedBox(height: 32),
                  ]),
                ),
              ),
  );

  Widget _buildOverallStatus() {
    final overall  = _snapshot?['overallHealth'] as Map<String, dynamic>?;
    final status   = (overall?['status'] as String?) ?? 'Good';
    final color    = status == 'Good'
        ? AppTheme.good
        : status == 'Fair'
            ? AppTheme.fair
            : AppTheme.warning;
    final phase    = (_snapshot?['currentPhase']?['phase'] as String?) ?? 'Follicular';
    final day      = (_snapshot?['cycleDay'] as num?)?.toInt() ?? 1;

    return LunaCard(
      color: color.withOpacity(0.06),
      child: Row(children: [
        Stack(
          alignment: Alignment.center,
          children: [
             SizedBox(
              width: 52, height: 52,
              child: CircularProgressIndicator(
                value: _calculateHealthScore() / 100,
                strokeWidth: 4,
                color: color,
                backgroundColor: color.withOpacity(0.1),
              ),
            ),
            Text('${_calculateHealthScore()}%', style: TextStyle(color: color, fontWeight: FontWeight.bold, fontSize: 12)),
          ],
        ),
        const SizedBox(width: 14),
        Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Text(
            'Overall Health: $status',
            style: TextStyle(
              color: color,
              fontWeight: FontWeight.w700,
              fontSize: 15,
            ),
          ),
          Text('$phase Phase · Day $day', style: AppTheme.caption),
        ])),
        PhaseChip(phase: phase),
      ]),
    );
  }

  Widget _buildMetricsRow() {
    // Favor live polling data over the static snapshot if available
    final liveHR    = _liveReading?['heartRate'];
    final liveTemp  = _liveReading?['temperature'];
    final liveDist  = _liveReading?['sleepDisturbances'];

    final hr    = _snapshot?['heartRate'] as Map<String, dynamic>?;
    final temp  = _snapshot?['temperature'] as Map<String, dynamic>?;
    final sleep = _snapshot?['sleep'] as Map<String, dynamic>?;

    // Heart Rate Logic
    final hrVal = liveHR != null 
        ? '${(liveHR as num).toInt()} bpm' 
        : (hr?['current'] != null ? '${(hr!['current'] as num).toInt()} bpm' : '—');
    
    // Temperature Logic
    final tempVal = liveTemp != null
        ? '${(liveTemp as num).toStringAsFixed(1)} °C'
        : (temp?['current'] != null ? '${(temp!['current'] as num).toStringAsFixed(1)} °C' : '—');

    // Adaptive Sleep/Activity Logic
    final now = DateTime.now();
    final isNight = now.hour >= 21 || now.hour < 7;
    
    String sleepLabel = isNight ? 'Sleep Dist.' : 'Activity Lvl';
    IconData sleepIcon = isNight ? Icons.bedtime : Icons.directions_run;
    
    final sleepVal = liveDist != null
        ? (isNight ? '$liveDist events' : (liveDist > 5 ? 'High' : 'Moderate'))
        : (sleep?['current']?['hours'] != null ? '${sleep!['current']['hours']}h' : '—');

    return Row(children: [
      Expanded(child: Column(
        children: [
          MetricCard(
            label: 'Heart Rate',
            value: hrVal,
            status: liveHR != null ? 'Live' : ((hr?['classification']?['label'] as String?) ?? 'Normal'),
            icon: Icons.favorite,
            color: AppTheme.menstrualColor,
          ),
          const SizedBox(height: 4),
          if (liveHR == null) TrendArrow(value: _calculateTrend('heartRate'), isUpGood: false),
        ],
      )),
      const SizedBox(width: 10),
      Expanded(child: Column(
        children: [
          MetricCard(
            label: 'Temperature',
            value: tempVal,
            status: liveTemp != null ? 'Live' : ((temp?['classification']?['label'] as String?) ?? 'Normal'),
            icon: Icons.thermostat,
            color: AppTheme.ovulationColor,
          ),
          const SizedBox(height: 4),
          if (liveTemp == null) TrendArrow(value: _calculateTrend('temperature'), isUpGood: true),
        ],
      )),
      const SizedBox(width: 10),
      Expanded(child: Column(
        children: [
          MetricCard(
            label: sleepLabel,
            value: sleepVal,
            status: liveDist != null ? 'Detected' : 'Synced',
            icon: sleepIcon,
            color: AppTheme.lutealColor,
          ),
          const SizedBox(height: 4),
          if (liveDist == null) TrendArrow(value: _calculateTrend('sleepHours'), isUpGood: true),
        ],
      )),
    ]);
  }

  Widget _buildSleepLegend() => Row(children: [
    _dot('Good', AppTheme.good),
    const SizedBox(width: 12),
    _dot('Fair', AppTheme.fair),
    const SizedBox(width: 12),
    _dot('Poor', AppTheme.warning),
    const SizedBox(width: 4),
    Text('0–8 disturbances', style: AppTheme.caption),
  ]);

  Widget _dot(String label, Color color) => Row(mainAxisSize: MainAxisSize.min, children: [
    Container(width: 10, height: 10, decoration: BoxDecoration(color: color, shape: BoxShape.circle)),
    const SizedBox(width: 4),
    Text(label, style: AppTheme.caption),
  ]);

  Widget _buildInsightsPanel() {
    final insights = (_snapshot?['insights'] as List?)?.cast<String>() ?? [];
    if (insights.isEmpty) return const SizedBox.shrink();

    return Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
      const SectionHeader(title: "Luna's Health Insight"),
      const SizedBox(height: 8),
      ...insights.map((insight) {
        IconData icon = Icons.lightbulb_outline;
        Color color = AppTheme.primary;
        if (insight.contains('ovulation')) { icon = Icons.thermostat; color = AppTheme.ovulationColor; }
        if (insight.contains('Heart rate')) { icon = Icons.favorite; color = AppTheme.menstrualColor; }
        if (insight.contains('Sleep')) { icon = Icons.bedtime; color = AppTheme.lutealColor; }
        
        return Container(
          margin: const EdgeInsets.only(bottom: 10),
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: color.withOpacity(0.05),
            borderRadius: BorderRadius.circular(16),
            border: Border.all(color: color.withOpacity(0.1)),
          ),
          child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Icon(icon, color: color, size: 20),
            const SizedBox(width: 12),
            Expanded(child: Text(
              insight,
              style: AppTheme.body.copyWith(fontSize: 13, height: 1.5),
            )),
          ]),
        );
      }).toList(),
    ]);
  }
}
