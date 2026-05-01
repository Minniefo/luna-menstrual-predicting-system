import 'package:flutter/material.dart';
import 'package:fl_chart/fl_chart.dart';
import '../theme/app_theme.dart';

// ── App Bar ──────────────────────────────────────────────────────────────────
class LunaAppBar extends StatelessWidget implements PreferredSizeWidget {
  final String title;
  final List<Widget>? actions;
  final Widget? leading;
  const LunaAppBar({super.key, required this.title, this.actions, this.leading});

  @override
  Size get preferredSize => const Size.fromHeight(60);

  @override
  Widget build(BuildContext context) => AppBar(
    leading: leading,
    title: Row(children: [
      const Text('🌙 ', style: TextStyle(fontSize: 18)),
      Text(title, style: AppTheme.heading3),
    ]),
    actions: actions,
    backgroundColor: Colors.transparent,
    elevation: 0,
  );
}

// ── Luna Card ────────────────────────────────────────────────────────────────
class LunaCard extends StatelessWidget {
  final Widget child;
  final EdgeInsets? padding;
  final Color? color;
  const LunaCard({super.key, required this.child, this.padding, this.color});

  @override
  Widget build(BuildContext context) => Container(
    width: double.infinity,
    padding: padding ?? const EdgeInsets.all(16),
    decoration: BoxDecoration(
      color: color ?? AppTheme.surface,
      borderRadius: BorderRadius.circular(16),
      boxShadow: [BoxShadow(
        color: Colors.black.withOpacity(0.04),
        blurRadius: 8,
        offset: const Offset(0, 2),
      )],
    ),
    child: child,
  );
}

// ── Metric Card ──────────────────────────────────────────────────────────────
class MetricCard extends StatelessWidget {
  final String label;
  final String value;
  final String status;
  final IconData icon;
  final Color color;
  const MetricCard({
    super.key,
    required this.label,
    required this.value,
    required this.status,
    required this.icon,
    required this.color,
  });

  @override
  Widget build(BuildContext context) => Container(
    padding: const EdgeInsets.all(12),
    decoration: BoxDecoration(
      color: color.withOpacity(0.08),
      borderRadius: BorderRadius.circular(14),
      border: Border.all(color: color.withOpacity(0.2)),
    ),
    child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
      Row(children: [
        Icon(icon, color: color, size: 16),
        const SizedBox(width: 4),
        Expanded(
          child: Text(label,
            style: TextStyle(
              color: color,
              fontWeight: FontWeight.w600,
              fontSize: 11,
            ),
            overflow: TextOverflow.ellipsis,
          ),
        ),
      ]),
      const SizedBox(height: 6),
      Text(value,
        style: TextStyle(
          fontSize: 16,
          fontWeight: FontWeight.w700,
          color: color,
        ),
      ),
      Text(status, style: AppTheme.caption),
    ]),
  );
}

// ── Trend Arrow ──────────────────────────────────────────────────────────────
class TrendArrow extends StatelessWidget {
  final double value; // positive for up, negative for down
  final bool isUpGood; // true if up is good (e.g. sleep) or false if down is good (e.g. disturbances)
  const TrendArrow({super.key, required this.value, required this.isUpGood});

  @override
  Widget build(BuildContext context) {
    if (value == 0) return const SizedBox.shrink();
    final isUp = value > 0;
    final color = (isUp == isUpGood) ? Colors.green : Colors.red;
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Icon(isUp ? Icons.trending_up : Icons.trending_down, color: color, size: 14),
        const SizedBox(width: 2),
        Text(
          '${value.abs().toStringAsFixed(1)}%',
          style: TextStyle(color: color, fontSize: 10, fontWeight: FontWeight.bold),
        ),
      ],
    );
  }
}

// ── Section Header ───────────────────────────────────────────────────────────
class SectionHeader extends StatelessWidget {
  final String title;
  final String? subtitle;
  final Widget? action;
  const SectionHeader({super.key, required this.title, this.subtitle, this.action});

  @override
  Widget build(BuildContext context) => Padding(
    padding: const EdgeInsets.symmetric(vertical: 6),
    child: Row(children: [
      Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Text(title, style: AppTheme.heading3),
        if (subtitle != null && subtitle!.isNotEmpty)
          Text(subtitle!, style: AppTheme.caption),
      ])),
      if (action != null) action!,
    ]),
  );
}

// ── Phase Chip ───────────────────────────────────────────────────────────────
class PhaseChip extends StatelessWidget {
  final String phase;
  final bool large;
  const PhaseChip({super.key, required this.phase, this.large = false});

  @override
  Widget build(BuildContext context) {
    final color = AppTheme.phaseColor(phase);
    final emoji = AppTheme.phaseEmoji(phase);
    return Container(
      padding: EdgeInsets.symmetric(horizontal: large ? 14 : 10, vertical: large ? 6 : 4),
      decoration: BoxDecoration(
        color: color.withOpacity(0.12),
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: color.withOpacity(0.3)),
      ),
      child: Text(
        '$emoji $phase',
        style: TextStyle(
          color: color,
          fontWeight: FontWeight.w600,
          fontSize: large ? 14 : 12,
        ),
      ),
    );
  }
}

// ── Prediction Banner ────────────────────────────────────────────────────────
class PredictionBanner extends StatelessWidget {
  final int daysRemaining;
  final String accuracy;
  final bool periodSoon;
  const PredictionBanner({
    super.key,
    required this.daysRemaining,
    required this.accuracy,
    required this.periodSoon,
  });

  @override
  Widget build(BuildContext context) {
    final color = periodSoon ? AppTheme.warning : AppTheme.primary;
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          colors: [color, color.withOpacity(0.75)],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        borderRadius: BorderRadius.circular(16),
      ),
      child: Row(children: [
        Container(
          width: 54,
          height: 54,
          decoration: const BoxDecoration(
            color: Colors.white24,
            shape: BoxShape.circle,
          ),
          child: Center(
            child: Text(
              '$daysRemaining',
              style: const TextStyle(
                color: Colors.white,
                fontSize: 20,
                fontWeight: FontWeight.w700,
              ),
            ),
          ),
        ),
        const SizedBox(width: 12),
        Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Text(
            periodSoon
                ? 'Period arriving soon!'
                : 'Next Period in $daysRemaining Days',
            style: const TextStyle(
              color: Colors.white,
              fontWeight: FontWeight.w700,
              fontSize: 15,
            ),
          ),
          const SizedBox(height: 2),
          Text(
            'Accuracy: $accuracy  •  AI-powered prediction',
            style: const TextStyle(color: Colors.white70, fontSize: 11),
          ),
        ])),
        const Icon(Icons.chevron_right, color: Colors.white70),
      ]),
    );
  }
}

// ── No Data Widget ───────────────────────────────────────────────────────────
class NoDataWidget extends StatelessWidget {
  final String message;
  const NoDataWidget({super.key, this.message = 'No data available yet'});

  @override
  Widget build(BuildContext context) => Center(
    child: Column(mainAxisAlignment: MainAxisAlignment.center, children: [
      Icon(Icons.sensors_off, color: AppTheme.textHint, size: 36),
      const SizedBox(height: 8),
      Text(message, style: AppTheme.caption, textAlign: TextAlign.center),
    ]),
  );
}

// ── Error Message Widget ─────────────────────────────────────────────────────
class ErrorMessage extends StatelessWidget {
  final String message;
  final VoidCallback? onRetry;
  const ErrorMessage({super.key, required this.message, this.onRetry});

  @override
  Widget build(BuildContext context) => Center(
    child: Padding(
      padding: const EdgeInsets.all(24),
      child: Column(mainAxisAlignment: MainAxisAlignment.center, children: [
        const Icon(Icons.error_outline, color: AppTheme.warning, size: 40),
        const SizedBox(height: 12),
        Text(message,
          style: AppTheme.body.copyWith(color: AppTheme.textSecondary),
          textAlign: TextAlign.center,
        ),
        if (onRetry != null) ...[
          const SizedBox(height: 12),
          TextButton(onPressed: onRetry, child: const Text('Retry')),
        ],
      ]),
    ),
  );
}

// ── HR Line Chart ────────────────────────────────────────────────────────────
class HRLineChart extends StatelessWidget {
  final List<Map<String, dynamic>> data;
  const HRLineChart({super.key, required this.data});

  @override
  Widget build(BuildContext context) {
    if (data.isEmpty) return const NoDataWidget(message: 'No heart rate data yet.\nSync your wearable device.');
    final spots = data.asMap().entries.map((e) {
      final bpm = (e.value['heartRate'] as num?)?.toDouble() ?? 72.0;
      return FlSpot(e.key.toDouble(), bpm);
    }).toList();

    return LineChart(LineChartData(
      minY: 40, maxY: 120, // Proper scale for resting/active HR
      lineTouchData: LineTouchData(
        touchTooltipData: LineTouchTooltipData(
          getTooltipColor: (_) => AppTheme.menstrualColor,
          getTooltipItems: (touchedSpots) => touchedSpots.map((s) => LineTooltipItem(
            '${s.y.toInt()} BPM',
            const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 12),
          )).toList(),
        ),
      ),
      gridData: FlGridData(
        show: true,
        drawVerticalLine: false,
        getDrawingHorizontalLine: (_) =>
            FlLine(color: AppTheme.divider, strokeWidth: 1),
      ),
      titlesData: FlTitlesData(
        leftTitles: AxisTitles(sideTitles: SideTitles(
          showTitles: true,
          reservedSize: 36,
          getTitlesWidget: (v, _) =>
              Text('${v.toInt()}', style: AppTheme.caption),
        )),
        bottomTitles: AxisTitles(sideTitles: SideTitles(
          showTitles: true,
          reservedSize: 20,
          getTitlesWidget: (v, _) {
            final idx = v.toInt();
            if (idx >= 0 && idx < data.length && idx % 2 == 0) {
              final d = (data[idx]['date'] as String?) ?? '';
              final label = d.length >= 5 ? d.substring(5) : d;
              return Text(label, style: AppTheme.caption);
            }
            return const Text('');
          },
        )),
        topTitles: const AxisTitles(sideTitles: SideTitles(showTitles: false)),
        rightTitles: const AxisTitles(sideTitles: SideTitles(showTitles: false)),
      ),
      borderData: FlBorderData(show: false),
      lineBarsData: [LineChartBarData(
        spots: spots,
        isCurved: true,
        color: AppTheme.menstrualColor,
        barWidth: 3,
        dotData: const FlDotData(show: true),
        belowBarData: BarAreaData(
          show: true,
          color: AppTheme.menstrualColor.withOpacity(0.12),
        ),
      )],
    ));
  }
}

// ── Temperature Line Chart ───────────────────────────────────────────────────
class TempLineChart extends StatelessWidget {
  final List<Map<String, dynamic>> data;
  final double baseline;
  const TempLineChart({super.key, required this.data, this.baseline = 36.6});

  @override
  Widget build(BuildContext context) {
    if (data.isEmpty) return const NoDataWidget(message: 'No temperature data yet.\nSync your wearable device.');
    final spots = data.asMap().entries.map((e) {
      final temp = (e.value['temperature'] as num?)?.toDouble() ?? baseline;
      return FlSpot(e.key.toDouble(), temp);
    }).toList();

    return LineChart(LineChartData(
      minY: 35.5, maxY: 38.0, // Critical: Tight scale to show 0.2C shifts
      lineTouchData: LineTouchData(
        touchTooltipData: LineTouchTooltipData(
          getTooltipColor: (_) => AppTheme.ovulationColor,
          getTooltipItems: (touchedSpots) => touchedSpots.map((s) => LineTooltipItem(
            '${s.y.toStringAsFixed(1)} °C',
            const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 12),
          )).toList(),
        ),
      ),
      gridData: FlGridData(
        show: true,
        drawVerticalLine: false,
        getDrawingHorizontalLine: (_) =>
            FlLine(color: AppTheme.divider, strokeWidth: 1),
      ),
      titlesData: FlTitlesData(
        leftTitles: AxisTitles(sideTitles: SideTitles(
          showTitles: true,
          reservedSize: 42,
          getTitlesWidget: (v, _) =>
              Text(v.toStringAsFixed(1), style: AppTheme.caption),
        )),
        bottomTitles: const AxisTitles(sideTitles: SideTitles(showTitles: false)),
        topTitles: const AxisTitles(sideTitles: SideTitles(showTitles: false)),
        rightTitles: const AxisTitles(sideTitles: SideTitles(showTitles: false)),
      ),
      borderData: FlBorderData(show: false),
      extraLinesData: ExtraLinesData(horizontalLines: [
        HorizontalLine(
          y: baseline,
          color: AppTheme.lutealColor.withOpacity(0.4),
          strokeWidth: 1.5,
          dashArray: [8, 4],
          label: HorizontalLineLabel(
            show: true,
            alignment: Alignment.topRight,
            padding: const EdgeInsets.only(right: 8, bottom: 4),
            labelResolver: (_) => 'Baseline',
            style: const TextStyle(color: AppTheme.lutealColor, fontSize: 10, fontWeight: FontWeight.bold),
          ),
        ),
      ]),
      lineBarsData: [LineChartBarData(
        spots: spots,
        isCurved: true,
        preventCurveOverShooting: true, // Prevents line from dipping below axes
        color: AppTheme.ovulationColor,
        barWidth: 3,
        dotData: const FlDotData(show: true),
        belowBarData: BarAreaData(
          show: true,
          color: AppTheme.ovulationColor.withOpacity(0.1),
        ),
      )],
      clipData: const FlClipData.all(), // Ensures no overlap with other widgets
    ));
  }
}

// ── Combined Sensor Chart (PRO) ───────────────────────────────────────────────────
class CombinedSensorChart extends StatelessWidget {
  final List<Map<String, dynamic>> data;
  final int? focusedIndex;
  final Function(int)? onFocusChange;
  final bool isHourly;

  const CombinedSensorChart({
    super.key,
    required this.data,
    this.focusedIndex,
    this.onFocusChange,
    this.isHourly = false,
  });

  @override
  Widget build(BuildContext context) {
    if (data.isEmpty) return const NoDataWidget(message: 'No sensor data found.');
    
    final hrSpots = <FlSpot>[];
    final tempSpots = <FlSpot>[];
    
    for (int i = 0; i < data.length; i++) {
      final hr = (data[i]['heartRate'] as num?)?.toDouble();
      final temp = (data[i]['temperature'] as num?)?.toDouble();
      if (hr != null) hrSpots.add(FlSpot(i.toDouble(), hr));
      if (temp != null) tempSpots.add(FlSpot(i.toDouble(), temp));
    }

    return LineChart(LineChartData(
      lineTouchData: LineTouchData(
        handleBuiltInTouches: true,
        touchCallback: (event, response) {
          if (onFocusChange != null && response != null && response.lineBarSpots != null) {
            if (event is FlTapUpEvent || event is FlPanEndEvent) {
               // Keep selection or clear on double tap logic can go here
            } else {
              onFocusChange!(response.lineBarSpots!.first.x.toInt());
            }
          }
        },
        touchTooltipData: LineTouchTooltipData(
          getTooltipColor: (_) => Colors.white.withOpacity(0.9),
          getTooltipItems: (touchedSpots) {
            return touchedSpots.map((s) {
              final isHR = s.barIndex == 0;
              return LineTooltipItem(
                isHR ? '${s.y.toInt()} BPM' : '${s.y.toStringAsFixed(1)} °C',
                TextStyle(
                  color: isHR ? AppTheme.primary : AppTheme.ovulationColor,
                  fontWeight: FontWeight.bold,
                  fontSize: 12,
                ),
              );
            }).toList();
          },
        ),
      ),
      extraLinesData: ExtraLinesData(
        verticalLines: focusedIndex == null ? [] : [
          VerticalLine(
            x: focusedIndex!.toDouble(),
            color: AppTheme.primary.withOpacity(0.2),
            strokeWidth: 2,
            dashArray: [5, 5],
          ),
        ],
      ),
      gridData: const FlGridData(show: false),
      titlesData: FlTitlesData(
        leftTitles: AxisTitles(sideTitles: SideTitles(
          showTitles: true,
          reservedSize: 32,
          getTitlesWidget: (v, _) => Text('${v.toInt()}', style: AppTheme.caption),
        )),
        bottomTitles: AxisTitles(sideTitles: SideTitles(
          showTitles: true,
          reservedSize: 22,
          getTitlesWidget: (v, _) {
            final idx = v.toInt();
            if (idx >= 0 && idx < data.length) {
              if (isHourly) {
                // For hourly drilldown, show labels every 4 hours or start/end
                bool show = idx == 0 || idx == data.length - 1 || idx % 4 == 0;
                if (show) {
                  final time = (data[idx]['time'] as String?) ?? '';
                  return Text(time, style: AppTheme.caption.copyWith(fontSize: 9));
                }
              } else {
                bool show = data.length < 10 || idx == 0 || idx == data.length - 1 || idx == (data.length / 2).floor();
                if (show) {
                  final d = (data[idx]['date'] as String?) ?? '';
                  return Text(d.length > 5 ? d.substring(5) : d, style: AppTheme.caption);
                }
              }
            }
            return const Text('');
          },
        )),
        rightTitles: const AxisTitles(sideTitles: SideTitles(showTitles: false)),
        topTitles: const AxisTitles(sideTitles: SideTitles(showTitles: false)),
      ),
      borderData: FlBorderData(show: false),
      lineBarsData: [
        LineChartBarData(
          spots: hrSpots,
          isCurved: true,
          color: AppTheme.primary,
          barWidth: 3,
          dotData: FlDotData(show: data.length < 15 || focusedIndex != null, 
            getDotPainter: (spot, percent, barData, index) {
              return FlDotCirclePainter(
                radius: (index == focusedIndex) ? 6 : 0,
                color: AppTheme.primary,
                strokeWidth: 2,
                strokeColor: Colors.white,
              );
            }
          ),
          belowBarData: BarAreaData(show: true, color: AppTheme.primary.withOpacity(0.05)),
        ),
        LineChartBarData(
          spots: tempSpots,
          isCurved: true,
          color: AppTheme.ovulationColor,
          barWidth: 2,
          dotData: FlDotData(show: data.length < 15 || focusedIndex != null,
            getDotPainter: (spot, percent, barData, index) {
              return FlDotCirclePainter(
                radius: (index == focusedIndex) ? 4 : 0,
                color: AppTheme.ovulationColor,
                strokeWidth: 2,
                strokeColor: Colors.white,
              );
            }
          ),
        ),
      ],
    ));
  }
}

// ── Sleep Bar Chart (PRO) ──────────────────────────────────────────────────────────
class SleepBarChart extends StatelessWidget {
  final List<Map<String, dynamic>> data;
  final int? focusedIndex;
  final Function(int?)? onFocusChange;
  final bool isHourly;

  const SleepBarChart({
    super.key,
    required this.data,
    this.focusedIndex,
    this.onFocusChange,
    this.isHourly = false,
  });

  @override
  Widget build(BuildContext context) {
    if (data.isEmpty) return const NoDataWidget(message: 'No sleep data yet.');
    
    final barWidth = data.length > 15 ? 7.0 : (data.length > 7 ? 12.0 : 20.0);

    final bars = data.asMap().entries.map((e) {
      final isFocused = focusedIndex == e.key;
      final disturbances = (e.value['disturbances'] ?? e.value['sleepDisturbances'] as num?)?.toDouble() ?? 0.0;
      return BarChartGroupData(x: e.key, barRods: [
        BarChartRodData(
          toY: disturbances,
          color: isFocused ? AppTheme.lutealColor : AppTheme.lutealColor.withOpacity(0.7),
          width: isFocused ? barWidth + 4 : barWidth,
          borderRadius: BorderRadius.circular(4),
          backDrawRodData: BackgroundBarChartRodData(
            show: true,
            toY: 12,
            color: AppTheme.lutealColor.withOpacity(0.04),
          ),
        ),
      ]);
    }).toList();

    return BarChart(BarChartData(
      barTouchData: BarTouchData(
        touchCallback: (event, response) {
          if (onFocusChange != null && response != null && response.spot != null) {
            onFocusChange!(response.spot!.touchedBarGroupIndex);
          }
        },
        touchTooltipData: BarTouchTooltipData(
          getTooltipColor: (_) => AppTheme.lutealColor,
          getTooltipItem: (group, groupIndex, rod, rodIndex) => BarTooltipItem(
            '${rod.toY.toInt()} disturbances',
            const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 12),
          ),
        ),
      ),
      gridData: const FlGridData(show: false),
      titlesData: FlTitlesData(
        leftTitles: AxisTitles(sideTitles: SideTitles(
          showTitles: true,
          reservedSize: 28,
          getTitlesWidget: (v, _) =>
              Text('${v.toInt()}', style: AppTheme.caption),
        )),
        bottomTitles: AxisTitles(sideTitles: SideTitles(
          showTitles: true,
          reservedSize: 22,
          getTitlesWidget: (v, _) {
            final idx = v.toInt();
            if (idx >= 0 && idx < data.length) {
              if (isHourly) {
                bool show = idx == 0 || idx == data.length - 1 || idx % 4 == 0;
                if (show) {
                  final time = (data[idx]['time'] as String?) ?? '';
                  return Text(time, style: AppTheme.caption.copyWith(fontSize: 8));
                }
              } else {
                bool show = data.length < 10 || idx == 0 || idx == data.length - 1 || idx == (data.length / 2).floor();
                if (show) {
                  final d = (data[idx]['date'] as String?) ?? '';
                  return Text(d.length > 5 ? d.substring(5) : d, style: AppTheme.caption);
                }
              }
            }
            return const Text('');
          },
        )),
        topTitles: const AxisTitles(sideTitles: SideTitles(showTitles: false)),
        rightTitles: const AxisTitles(sideTitles: SideTitles(showTitles: false)),
      ),
      borderData: FlBorderData(show: false),
      barGroups: bars,
    ));
  }
}

// ── Day Focus Panel ─────────────────────────────────────────────────────────
class DayFocusPanel extends StatelessWidget {
  final Map<String, dynamic>? reading;
  final VoidCallback onClear;

  const DayFocusPanel({super.key, this.reading, required this.onClear});

  @override
  Widget build(BuildContext context) {
    if (reading == null) return const SizedBox.shrink();

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppTheme.surface,
        borderRadius: const BorderRadius.vertical(top: Radius.circular(24)),
        boxShadow: [BoxShadow(color: Colors.black.withOpacity(0.05), blurRadius: 10)],
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Row(children: [
            Text('Details for ${reading!['date']}', style: AppTheme.heading3),
            const Spacer(),
            IconButton(icon: const Icon(Icons.close), onPressed: onClear),
          ]),
          const SizedBox(height: 12),
          Row(mainAxisAlignment: MainAxisAlignment.spaceAround, children: [
            _miniStat('HR', '${reading!['heartRate']?.toInt() ?? "--"}', AppTheme.primary),
            _miniStat('Temp', '${reading!['temperature']?.toStringAsFixed(1) ?? "--"}°', AppTheme.ovulationColor),
            _miniStat('Sleep', '${reading!['sleepHours']?.toStringAsFixed(1) ?? "--"}h', AppTheme.lutealColor),
            _miniStat('Wake', '${reading!['sleepDisturbances'] ?? "0"}', AppTheme.lutealColor),
          ]),
        ],
      ),
    );
  }

  Widget _miniStat(String label, String value, Color color) {
    return Column(children: [
      Text(label, style: AppTheme.caption),
      Text(value, style: AppTheme.bodyBold.copyWith(color: color, fontSize: 18)),
    ]);
  }
}

// ── Cycle Duration Bar Chart ─────────────────────────────────────────────────
class CycleDurationChart extends StatelessWidget {
  final List<Map<String, dynamic>> data;
  const CycleDurationChart({super.key, required this.data});

  @override
  Widget build(BuildContext context) {
    if (data.isEmpty) return const NoDataWidget(message: 'No cycle history yet.');
    final bars = data.asMap().entries.map((e) {
      final duration = (e.value['duration'] as num?)?.toDouble() ?? 28.0;
      return BarChartGroupData(x: e.key, barRods: [
        BarChartRodData(
          toY: duration,
          color: AppTheme.primary,
          width: 18,
          borderRadius: BorderRadius.circular(5),
        ),
      ]);
    }).toList();

    return BarChart(BarChartData(
      gridData: FlGridData(
        drawVerticalLine: false,
        getDrawingHorizontalLine: (_) =>
            FlLine(color: AppTheme.divider, strokeWidth: 1),
      ),
      titlesData: FlTitlesData(
        leftTitles: AxisTitles(sideTitles: SideTitles(
          showTitles: true,
          reservedSize: 28,
          getTitlesWidget: (v, _) =>
              Text('${v.toInt()}', style: AppTheme.caption),
        )),
        bottomTitles: AxisTitles(sideTitles: SideTitles(
          showTitles: true,
          reservedSize: 20,
          getTitlesWidget: (v, _) {
            final i = v.toInt();
            if (i < data.length) {
              final month = (data[i]['month'] as String?) ?? '';
              return Text(month, style: AppTheme.caption);
            }
            return const Text('');
          },
        )),
        topTitles: const AxisTitles(sideTitles: SideTitles(showTitles: false)),
        rightTitles: const AxisTitles(sideTitles: SideTitles(showTitles: false)),
      ),
      borderData: FlBorderData(show: false),
      barGroups: bars,
    ));
  }
}
