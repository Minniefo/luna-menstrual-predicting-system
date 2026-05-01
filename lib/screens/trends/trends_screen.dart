// ── Trends & Analytics Hub ───────────────────────────────────────────────────
// IT4031 VAUED — Thiyanima H E S (IT22271600)
import 'package:flutter/material.dart';
import '../../theme/app_theme.dart';
import '../../services/api_service.dart';
import '../../widgets/shared_widgets.dart';

class TrendsScreen extends StatefulWidget {
  const TrendsScreen({super.key});
  @override
  State<TrendsScreen> createState() => _TrendsScreenState();
}

class _TrendsScreenState extends State<TrendsScreen> {
  String? _selectedRange; // null means 'Overall'
  List<Map<String, dynamic>> _readings = [];
  List<String> _insights = [];
  int? _focusedIndex;
  bool _loading = true;
  String? _error;

  // Drill-down state
  bool _isDrillDown = false;
  List<Map<String, dynamic>> _hourlyReadings = [];
  String? _drillDownDate;

  @override
  void initState() {
    super.initState();
    _loadData();
  }

  Future<void> _loadData() async {
    setState(() { _loading = true; _error = null; _focusedIndex = null; });
    try {
      // 1. Fetch readings
      final res = await ApiService.getReadings(range: _selectedRange);
      // 2. Fetch analytical patterns
      final patternRes = await ApiService.getPatterns();
      
      if (res['success'] == true) {
        setState(() {
          _readings = (res['data']['readings'] as List).cast<Map<String, dynamic>>();
          if (patternRes['success'] == true) {
            _insights = (patternRes['data']['patterns'] as List).cast<String>();
          }
          _loading = false;
        });
      } else {
        setState(() {
          _error = res['message'] ?? 'Failed to load readings';
          _loading = false;
        });
      }
    } catch (e) {
      setState(() {
        _error = 'Connection error. Please try again.';
        _loading = false;
      });
    }
  }

  Future<void> _enterDrillDown(String date) async {
    setState(() { _loading = true; _isDrillDown = true; _drillDownDate = date; _focusedIndex = null; });
    try {
      final res = await ApiService.getDrilldown(date);
      if (res['success'] == true) {
        setState(() {
          _hourlyReadings = (res['data']['readings'] as List).cast<Map<String, dynamic>>();
          _loading = false;
        });
      } else {
        setState(() { _error = res['message']; _loading = false; });
      }
    } catch (e) {
      setState(() { _error = 'Connection error'; _loading = false; });
    }
  }

  void _exitDrillDown() {
    setState(() {
      _isDrillDown = false;
      _hourlyReadings = [];
      _drillDownDate = null;
      _focusedIndex = null;
    });
  }

  double _calculateAvg(String key) {
    if (_readings.isEmpty) return 0.0;
    final valid = _readings.where((r) => r[key] != null).toList();
    if (valid.isEmpty) return 0.0;
    final sum = valid.fold(0.0, (prev, r) => prev + (r[key] as num).toDouble());
    return sum / valid.length;
  }

  double _calculateTrend(String key) {
    if (_readings.length < 6) return 0.0;
    final valid = _readings.where((r) => r[key] != null).toList();
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
    if (_readings.isEmpty) return 0;
    // Simple heuristic score
    double score = 70.0;
    final avgSleep = _calculateAvg('sleepHours');
    final avgHR = _calculateAvg('heartRate');
    
    if (avgSleep >= 7) score += 10; else if (avgSleep < 6) score -= 10;
    if (avgHR >= 60 && avgHR <= 80) score += 10; else if (avgHR > 90) score -= 10;
    
    return score.clamp(0, 100).toInt();
  }

  @override
  Widget build(BuildContext context) {
    final activeData = _isDrillDown ? _hourlyReadings : _readings;
    final Map<String, dynamic>? focusedReading = 
        (_focusedIndex != null && _focusedIndex! < activeData.length) ? activeData[_focusedIndex!] : null;

    return Scaffold(
      backgroundColor: AppTheme.background,
      appBar: const LunaAppBar(title: 'Health Analytics'),
      body: Stack(
        children: [
          RefreshIndicator(
            onRefresh: _loadData,
            color: AppTheme.primary,
            child: SingleChildScrollView(
              physics: const AlwaysScrollableScrollPhysics(),
              padding: const EdgeInsets.only(left: 20, right: 20, top: 20, bottom: 120),
              child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                // ── 1. Analytical Narrative Header ────────────────────────
                _buildAnalyticalHeader(),
                const SizedBox(height: 24),

                if (_loading)
                  const Center(child: Padding(
                    padding: EdgeInsets.all(60.0),
                    child: CircularProgressIndicator(),
                  ))
                else if (_error != null)
                  ErrorMessage(message: _error!, onRetry: _loadData)
                else ...[
                  // ── 2. Summary KPIs ──────────────────────────────────────
                  _buildSummaryKPIs(focusedReading),
                  const SizedBox(height: 24),

                  // ── 3. Main Combined Analysis Hub ────────────────────────
                  const SectionHeader(
                    title: 'Vitals Correlation',
                    subtitle: 'Heart Rate (Pink) / Temperature (Orange)',
                  ),
                  const SizedBox(height: 12),
                  SizedBox(
                    height: 260,
                    child: LunaCard(
                      child: CombinedSensorChart(
                        data: activeData,
                        isHourly: _isDrillDown,
                        focusedIndex: _focusedIndex,
                        onFocusChange: (idx) {
                          if (!_isDrillDown) {
                            // On multi-day view, a tap triggers drill-down
                            final date = _readings[idx]['date'];
                            if (date != null) _enterDrillDown(date);
                          } else {
                            setState(() => _focusedIndex = idx);
                          }
                        },
                      ),
                    ),
                  ),
                  const SizedBox(height: 24),

                  // ── 4. Secondary Trends (Sleep) ──────────────────────────
                  const SectionHeader(
                    title: 'Sleep Disruptions',
                    subtitle: 'Nightly disturbances & quality patterns',
                  ),
                  const SizedBox(height: 12),
                  SizedBox(
                    height: 160,
                    child: LunaCard(
                      child: SleepBarChart(
                        data: activeData,
                        isHourly: _isDrillDown,
                        focusedIndex: _focusedIndex,
                        onFocusChange: (idx) => setState(() => _focusedIndex = idx),
                      ),
                    ),
                  ),
                  const SizedBox(height: 24),

                  // ── 5. Smart Findings (Backend-driven) ────────────────────
                  const SectionHeader(title: 'Clinical Insights'),
                  const SizedBox(height: 12),
                  ..._insights.map((msg) => _insightTile(msg)).toList(),
                  if (_insights.isEmpty) _insightTile('No significant deviations detected for this period.'),
                  
                  const SizedBox(height: 40),
                ],
              ]),
            ),
          ),

          // ── 6. Precision Drill-down Panel (Fixed Bottom) ──────────────────
          Align(
            alignment: Alignment.bottomCenter,
            child: DayFocusPanel(
              reading: focusedReading,
              onClear: () => setState(() => _focusedIndex = null),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildAnalyticalHeader() {
    if (_isDrillDown) {
      return Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text('Daily Breakdown', style: AppTheme.heading2),
              TextButton.icon(
                onPressed: _exitDrillDown,
                icon: const Icon(Icons.arrow_back, size: 16),
                label: const Text('Back to Trends'),
                style: TextButton.styleFrom(foregroundColor: AppTheme.primary),
              ),
            ],
          ),
          Text('Detailed hourly view for ${_drillDownDate ?? ""}', style: AppTheme.caption),
          const SizedBox(height: 12),
        ],
      );
    }
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          _selectedRange == null ? 'Overall Narrative' : 'Analysis: ${_selectedRange!.toUpperCase()}',
          style: AppTheme.heading2,
        ),
        const SizedBox(height: 12),
        Row(
          children: [
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
              decoration: BoxDecoration(
                color: AppTheme.primary,
                borderRadius: BorderRadius.circular(12),
              ),
              child: Column(
                children: [
                  const Text('Wellness Score', style: TextStyle(color: Colors.white70, fontSize: 10)),
                  Text('${_calculateHealthScore()}%', style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 18)),
                ],
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Text(
                'Correlation between activity, sleep, and metabolic patterns.',
                style: AppTheme.caption,
              ),
            ),
          ],
        ),
        const SizedBox(height: 12),
        SingleChildScrollView(
          scrollDirection: Axis.horizontal,
          child: Row(
            children: [null, '7d', '14d', '30d'].map((r) {
              final isSelected = _selectedRange == r;
              final label = r == null ? 'ALL TIME' : r.toUpperCase();
              return Padding(
                padding: const EdgeInsets.only(right: 8),
                child: ChoiceChip(
                  label: Text(label),
                  selected: isSelected,
                  onSelected: (val) {
                    if (val) {
                      setState(() => _selectedRange = r);
                      _loadData();
                    }
                  },
                  selectedColor: AppTheme.primary,
                  labelStyle: TextStyle(
                    color: isSelected ? Colors.white : AppTheme.textSecondary,
                    fontWeight: FontWeight.w600,
                    fontSize: 10,
                  ),
                  elevation: isSelected ? 4 : 0,
                  pressElevation: 8,
                  showCheckmark: false,
                ),
              );
            }).toList(),
          ),
        ),
      ],
    );
  }

  Widget _buildSummaryKPIs(Map<String, dynamic>? focused) {
    // If focused is available, show focused data, else show range averages
    final hr = focused != null ? focused['heartRate'] : _calculateAvg('heartRate').toInt();
    final temp = focused != null ? focused['temperature'] : _calculateAvg('temperature');
    final sleep = focused != null ? focused['sleepHours'] : _calculateAvg('sleepHours');
    
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(children: [
          Expanded(child: Column(
            children: [
              MetricCard(
                label: 'VITALS (HR)',
                value: '$hr BPM',
                status: focused != null ? 'Punctual' : 'Avg BPM',
                icon: Icons.monitor_heart,
                color: AppTheme.primary,
              ),
              if (focused == null) Padding(
                padding: const EdgeInsets.only(top: 4, left: 8),
                child: TrendArrow(value: _calculateTrend('heartRate'), isUpGood: false),
              ),
            ],
          )),
          const SizedBox(width: 12),
          Expanded(child: Column(
            children: [
              MetricCard(
                label: 'METABOLIC',
                value: '${(temp ?? 0.0).toStringAsFixed(1)}°C',
                status: focused != null ? 'Punctual' : 'Avg Temp',
                icon: Icons.device_thermostat,
                color: AppTheme.ovulationColor,
              ),
              if (focused == null) Padding(
                padding: const EdgeInsets.only(top: 4, left: 8),
                child: TrendArrow(value: _calculateTrend('temperature'), isUpGood: true),
              ),
            ],
          )),
        ]),
        const SizedBox(height: 12),
        Row(children: [
          Expanded(child: Column(
            children: [
              MetricCard(
                label: 'SLEEP QUALITY',
                value: '${(sleep ?? 0.0).toStringAsFixed(1)}h',
                status: 'Consistency',
                icon: Icons.bedtime,
                color: AppTheme.lutealColor,
              ),
              if (focused == null) Padding(
                padding: const EdgeInsets.only(top: 4, left: 8),
                child: TrendArrow(value: _calculateTrend('sleepHours'), isUpGood: true),
              ),
            ],
          )),
          const SizedBox(width: 12),
          Expanded(child: Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: AppTheme.primary.withOpacity(0.05),
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: AppTheme.primary.withOpacity(0.1)),
              boxShadow: [BoxShadow(color: Colors.black.withOpacity(0.02), blurRadius: 4)],
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text('COVERAGE', style: AppTheme.caption),
                const SizedBox(height: 4),
                Text('${_readings.length} Days', style: AppTheme.bodyBold.copyWith(color: AppTheme.primary, fontSize: 18)),
                Text('Monitored History', style: AppTheme.caption.copyWith(fontSize: 10)),
              ],
            ),
          )),
        ]),
      ],
    );
  }

  Widget _insightTile(String message) {
    IconData icon = Icons.auto_awesome;
    Color iconColor = AppTheme.primary;
    
    if (message.contains('sleep') || message.contains('Sleep')) {
      icon = Icons.bedtime;
      iconColor = AppTheme.lutealColor;
    } else if (message.contains('heart') || message.contains('heartRate')) {
      icon = Icons.favorite;
      iconColor = Colors.redAccent;
    } else if (message.contains('temperature') || message.contains('ovulation')) {
      icon = Icons.thermostat;
      iconColor = AppTheme.ovulationColor;
    } else if (message.contains('cycle') || message.contains('Regularity')) {
      icon = Icons.calendar_month;
    }

    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppTheme.surface,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppTheme.primary.withOpacity(0.05)),
        boxShadow: [BoxShadow(color: Colors.black.withOpacity(0.03), blurRadius: 5, offset: const Offset(0, 2))],
      ),
      child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Container(
          padding: const EdgeInsets.all(8),
          decoration: BoxDecoration(
            color: iconColor.withOpacity(0.1),
            shape: BoxShape.circle,
          ),
          child: Icon(icon, color: iconColor, size: 20),
        ),
        const SizedBox(width: 12),
        Expanded(child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              message.split(':').first,
              style: AppTheme.bodyBold.copyWith(fontSize: 14, color: iconColor),
            ),
            const SizedBox(height: 4),
            Text(
              message.contains(':') ? message.split(':').last.trim() : message,
              style: AppTheme.body.copyWith(fontSize: 13, height: 1.4, color: AppTheme.textSecondary),
            ),
          ],
        )),
      ]),
    );
  }
}
