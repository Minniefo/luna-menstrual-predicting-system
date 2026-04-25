// ── Alerts & Predictions Dashboard ───────────────────────────────────────────
// IT4031 VAUED — Abeykoon S N (IT22184030)
import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import '../../theme/app_theme.dart';
import '../../services/api_service.dart';
import '../../widgets/shared_widgets.dart';

class AlertsScreen extends StatefulWidget {
  const AlertsScreen({super.key});
  @override
  State<AlertsScreen> createState() => _AlertsScreenState();
}

class _AlertsScreenState extends State<AlertsScreen> {
  Map<String, dynamic>? _prediction;
  List<Map<String, dynamic>> _alerts = [];
  Map<String, dynamic>? _prefs;
  bool _loading = true;
  String? _error;

  @override
  void initState() { super.initState(); _load(); }

  Future<void> _load() async {
    setState(() { _loading = true; _error = null; });
    try {
      final results = await Future.wait([
        ApiService.getPredictionSummary(),
        ApiService.getAlerts(),
        ApiService.getNotifPrefs(),
      ]);
      if (!mounted) return;
      setState(() {
        _prediction = results[0]['data'] as Map<String, dynamic>?;
        _alerts     = (results[1]['data']?['alerts'] as List?)
            ?.cast<Map<String, dynamic>>() ?? [];
        _prefs      = results[2]['data'] as Map<String, dynamic>?;
        _loading    = false;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() { _error = 'Unable to load alerts.'; _loading = false; });
    }
  }

  Future<void> _evaluate() async {
    try {
      await ApiService.evaluateAlerts();
      await _load();
    } catch (_) {}
  }

  IconData _alertIcon(String type) {
    switch (type) {
      case 'period_reminder':    return Icons.calendar_today;
      case 'period_prediction':  return Icons.calendar_month;
      case 'ovulation_detected': return Icons.star;
      case 'temperature_spike':  return Icons.thermostat;
      case 'sleep_disturbance':  return Icons.bedtime;
      case 'heart_rate_alert':   return Icons.favorite;
      case 'medicine':           return Icons.medication;
      default:                   return Icons.notifications;
    }
  }

  Color _priorityColor(String priority) {
    switch (priority) {
      case 'high':   return AppTheme.warning;
      case 'medium': return AppTheme.fair;
      default:       return AppTheme.primary;
    }
  }

  @override
  Widget build(BuildContext context) => Scaffold(
    backgroundColor: AppTheme.background,
    appBar: LunaAppBar(
      title: 'Alerts & Notifications',
      actions: [
        IconButton(
          icon: const Icon(Icons.sync),
          onPressed: _evaluate,
          tooltip: 'Evaluate from wearable data',
        ),
        IconButton(
          icon: const Icon(Icons.done_all),
          onPressed: () async {
            await ApiService.markAllRead();
            await _load();
          },
          tooltip: 'Mark all read',
        ),
      ],
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

                    // Prediction Overview Panel
                    //_buildPredictionPanel(),
                    //const SizedBox(height: 20),

                    // Health Alerts list
                    SectionHeader(
                      title: 'Health Alerts',
                      subtitle: '${_alerts.where((a) => a['isRead'] != true).length} unread',
                    ),
                    const SizedBox(height: 8),

                    if (_alerts.isEmpty)
                      LunaCard(child: Center(child: Padding(
                        padding: const EdgeInsets.all(16),
                        child: Column(children: [
                          const Icon(Icons.notifications_none, size: 40, color: AppTheme.textHint),
                          const SizedBox(height: 8),
                          Text('No alerts yet.', style: AppTheme.body),
                          const SizedBox(height: 4),
                          TextButton(
                            onPressed: _evaluate,
                            child: const Text('Evaluate from wearable data'),
                          ),
                        ]),
                      )))
                    else
                      ..._alerts.map(_buildAlertCard),

                    const SizedBox(height: 20),

                    // Notification Preferences
                    _buildPreferences(),
                    const SizedBox(height: 32),
                  ]),
                ),
              ),
  );

  // ── Prediction Panel ───────────────────────────────────────────────────────
  /*Widget _buildPredictionPanel() {
    final np          = _prediction?['nextPeriod'] as Map<String, dynamic>?;
    final days        = (np?['daysRemaining'] as num?)?.toInt() ?? 0;
    final acc         = (np?['accuracy'] as String?) ?? '—';
    final date        = (np?['date'] as String?) ?? '—';
    final luteal      = (_prediction?['lutealPhaseStarts'] as String?) ?? '—';
    
    // Period soon if ML flagged it or calendar shows <= 5 days
    final bool periodSoon = acc.contains('Edge ML') || days <= 5;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        PredictionBanner(
          daysRemaining: days,
          accuracy: acc,
          periodSoon: periodSoon,
        ),
        const SizedBox(height: 12),
        LunaCard(
          padding: const EdgeInsets.symmetric(vertical: 12, horizontal: 16),
          child: Row(children: [
            _timelineItem('Luteal Phase', 'starts\n$luteal', AppTheme.lutealColor),
            Expanded(child: Container(height: 2, color: AppTheme.divider)),
            _timelineItem('Period', 'expected\n$date', AppTheme.menstrualColor),
            Expanded(child: Container(height: 2, color: AppTheme.divider)),
            _timelineItem('Ovulation', 'complete', AppTheme.ovulationColor),
          ]),
        ),
      ],
    );
  }

  Widget _timelineItem(String title, String sub, Color color) =>
      Column(children: [
        Container(
          width: 12, height: 12,
          decoration: BoxDecoration(color: color, shape: BoxShape.circle),
        ),
        const SizedBox(height: 4),
        Text(title,
          style: TextStyle(color: color, fontWeight: FontWeight.w600, fontSize: 10),
          textAlign: TextAlign.center,
        ),
        Text(sub,
          style: AppTheme.caption.copyWith(fontSize: 9),
          textAlign: TextAlign.center,
        ),
      ]);*/

  // ── Alert Card ─────────────────────────────────────────────────────────────
  Widget _buildAlertCard(Map<String, dynamic> alert) {
    final type     = (alert['type'] as String?) ?? '';
    final title    = (alert['title'] as String?) ?? '';
    final message  = (alert['message'] as String?) ?? '';
    final priority = (alert['priority'] as String?) ?? 'medium';
    final isRead   = alert['isRead'] == true;
    final id       = (alert['_id'] as String?) ?? (alert['id'] as String?) ?? '';
    final color    = _priorityColor(priority);
    final createdAt= (alert['createdAt'] as String?) ?? '';

    String timeAgo = '';
    try {
      final dt   = DateTime.parse(createdAt);
      final diff = DateTime.now().difference(dt);
      if (diff.inHours < 1)       timeAgo = '${diff.inMinutes}m ago';
      else if (diff.inDays < 1)   timeAgo = '${diff.inHours}h ago';
      else                        timeAgo = DateFormat('MMM d').format(dt);
    } catch (_) {}

    return Padding(
      padding: const EdgeInsets.only(bottom: 10),
      child: Dismissible(
        key: Key(id.isEmpty ? UniqueKey().toString() : id),
        direction: DismissDirection.endToStart,
        background: Container(
          alignment: Alignment.centerRight,
          padding: const EdgeInsets.only(right: 16),
          decoration: BoxDecoration(
            color: AppTheme.warning.withOpacity(0.15),
            borderRadius: BorderRadius.circular(14),
          ),
          child: const Icon(Icons.delete_outline, color: AppTheme.warning),
        ),
        onDismissed: (_) async {
          if (id.isNotEmpty) await ApiService.dismissAlert(id);
          setState(() => _alerts.removeWhere(
              (a) => (a['_id'] ?? a['id']) == id));
        },
        child: GestureDetector(
          onTap: () async {
            if (!isRead && id.isNotEmpty) {
              await ApiService.markAlertRead(id);
              setState(() => alert['isRead'] = true);
            }
            _showAlertDetail(alert);
          },
          child: Container(
            padding: const EdgeInsets.all(14),
            decoration: BoxDecoration(
              color: isRead ? AppTheme.surface : color.withOpacity(0.05),
              borderRadius: BorderRadius.circular(14),
              border: Border.all(
                color: isRead ? AppTheme.divider : color.withOpacity(0.3),
              ),
              boxShadow: [BoxShadow(
                color: Colors.black.withOpacity(0.03),
                blurRadius: 4,
                offset: const Offset(0, 2),
              )],
            ),
            child: Row(children: [
              Container(
                width: 38, height: 38,
                decoration: BoxDecoration(
                  color: color.withOpacity(0.12),
                  shape: BoxShape.circle,
                ),
                child: Icon(_alertIcon(type), color: color, size: 18),
              ),
              const SizedBox(width: 12),
              Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                Row(children: [
                  Expanded(child: Text(title,
                    style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 13, color: AppTheme.textPrimary),
                  )),
                  if (!isRead)
                    Container(
                      width: 8, height: 8,
                      decoration: BoxDecoration(color: color, shape: BoxShape.circle),
                    ),
                ]),
                const SizedBox(height: 2),
                Text(message,
                  style: AppTheme.body.copyWith(fontSize: 12),
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                ),
                const SizedBox(height: 4),
                Text(timeAgo, style: AppTheme.caption),
              ])),
            ]),
          ),
        ),
      ),
    );
  }

  void _showAlertDetail(Map<String, dynamic> alert) {
    showModalBottomSheet(
      context: context,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (_) => Padding(
        padding: const EdgeInsets.all(24),
        child: Column(mainAxisSize: MainAxisSize.min, crossAxisAlignment: CrossAxisAlignment.start, children: [
          Text((alert['title'] as String?) ?? '', style: AppTheme.heading3),
          const SizedBox(height: 8),
          Text(
            (alert['message'] as String?) ?? '',
            style: AppTheme.body.copyWith(height: 1.6),
          ),
          const SizedBox(height: 16),
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: AppTheme.cardBg,
              borderRadius: BorderRadius.circular(10),
            ),
            child: Row(children: [
              const Icon(Icons.info_outline, color: AppTheme.primary, size: 16),
              const SizedBox(width: 8),
              Text(
                'Priority: ${alert['priority'] ?? 'medium'}',
                style: AppTheme.caption.copyWith(fontWeight: FontWeight.w600),
              ),
            ]),
          ),
          const SizedBox(height: 8),
        ]),
      ),
    );
  }

  // ── Notification Preferences ───────────────────────────────────────────────
  Widget _buildPreferences() {
    if (_prefs == null) return const SizedBox.shrink();
    const prefDefs = [
      ('periodReminder',   'Period Reminder',     '1 day before period',          Icons.calendar_today),
      ('ovulationAlert',   'Ovulation Alert',     'When ovulation is predicted',  Icons.star),
      ('temperatureSpike', 'Temperature Spike',   '>0.2°C above baseline',        Icons.thermostat),
      ('sleepDisturbance', 'Sleep Disturbance',   'Multiple sleep disturbances',  Icons.bedtime),
      ('morningCheckin',   'Morning Check-in',    'Quick mood & symptoms check',  Icons.wb_sunny),
    ];

    return Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
      const SectionHeader(title: 'Notification Preferences'),
      const SizedBox(height: 8),
      LunaCard(child: Column(
        children: prefDefs.map((p) => Padding(
          padding: const EdgeInsets.symmetric(vertical: 6),
          child: Row(children: [
            Container(
              width: 36, height: 36,
              decoration: BoxDecoration(
                color: AppTheme.primary.withOpacity(0.1),
                shape: BoxShape.circle,
              ),
              child: Icon(p.$4, color: AppTheme.primary, size: 18),
            ),
            const SizedBox(width: 12),
            Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Text(p.$2,
                style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 13, color: AppTheme.textPrimary)),
              Text(p.$3, style: AppTheme.caption),
            ])),
            Switch.adaptive(
              value: _prefs?[p.$1] == true,
              activeColor: AppTheme.primary,
              onChanged: (val) async {
                setState(() => _prefs![p.$1] = val);
                await ApiService.updateNotifPrefs({p.$1: val});
              },
            ),
          ]),
        )).toList(),
      )),
    ]);
  }
}
