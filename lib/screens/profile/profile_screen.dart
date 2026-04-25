// ── Profile & Settings Screen ─────────────────────────────────────────────────
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../theme/app_theme.dart';
import '../../services/api_service.dart';
import '../../services/auth_provider.dart';
import '../../widgets/shared_widgets.dart';
import '../onboarding_screen.dart';

class ProfileScreen extends StatefulWidget {
  const ProfileScreen({super.key});
  @override
  State<ProfileScreen> createState() => _ProfileScreenState();
}

class _ProfileScreenState extends State<ProfileScreen> {
  Map<String, dynamic>? _syncStatus;
  Map<String, dynamic>? _modelInfo;
  bool _loading = true;

  @override
  void initState() { super.initState(); _load(); }

  Future<void> _load() async {
    setState(() => _loading = true);
    try {
      final results = await Future.wait([
        ApiService.getSyncStatus(),
        ApiService.mlModelInfo(),
      ]);
      if (!mounted) return;
      setState(() {
        _syncStatus = results[0]['data'] as Map<String, dynamic>?;
        _modelInfo  = results[1]['model'] as Map<String, dynamic>?;
        _loading    = false;
      });
    } catch (_) {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _refreshUser(AuthProvider auth) async {
    try {
      final res = await ApiService.getProfile();
      if (res['success'] == true && mounted) {
        auth.updateUser(res['user'] as Map<String, dynamic>);
      }
    } catch (_) {}
  }

  @override
  Widget build(BuildContext context) {
    final auth      = context.watch<AuthProvider>();
    final user      = auth.user ?? {};
    final name      = (user['name'] as String?) ?? 'User';
    final email     = (user['email'] as String?) ?? '';
    final cycleLen  = (user['cycleLength'] as num?)?.toInt() ?? 28;
    final periodLen = (user['periodLength'] as num?)?.toInt() ?? 5;
    final sensors   = (user['sensors'] as Map<String, dynamic>?) ?? {};
    final initials  = name.isNotEmpty ? name[0].toUpperCase() : 'L';

    return Scaffold(
      backgroundColor: AppTheme.background,
      body: SafeArea(
        child: RefreshIndicator(
          onRefresh: _load,
          color: AppTheme.primary,
          child: CustomScrollView(slivers: [
            // Header
            SliverToBoxAdapter(child: Padding(
              padding: const EdgeInsets.fromLTRB(20, 28, 20, 0),
              child: Column(children: [
                Container(
                  width: 86, height: 86,
                  decoration: const BoxDecoration(
                    gradient: AppTheme.primaryGradient,
                    shape: BoxShape.circle,
                  ),
                  child: Center(child: Text(
                    initials,
                    style: const TextStyle(
                      color: Colors.white,
                      fontSize: 34,
                      fontWeight: FontWeight.w700,
                    ),
                  )),
                ),
                const SizedBox(height: 10),
                Text(name, style: AppTheme.heading2),
                Text(email, style: AppTheme.body),
                const SizedBox(height: 4),
                TextButton.icon(
                  icon: const Icon(Icons.edit, size: 14, color: AppTheme.primary),
                  label: const Text('Edit Profile',
                    style: TextStyle(color: AppTheme.primary, fontSize: 12)),
                  onPressed: () => _showEditProfile(context, user, auth),
                ),
                const SizedBox(height: 20),
              ]),
            )),

            SliverToBoxAdapter(child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 20),
              child: _loading
                  ? const Center(child: CircularProgressIndicator(color: AppTheme.primary))
                  : Column(crossAxisAlignment: CrossAxisAlignment.start, children: [

                // Wearable Sync
                _sectionTitle('Wearable Device', Icons.watch),
                const SizedBox(height: 8),
                LunaCard(child: Column(children: [
                  _infoRow('Status',
                    (_syncStatus?['status'] as String?) ?? 'Unknown',
                    color: (_syncStatus?['connected'] == true) ? AppTheme.good : AppTheme.warning,
                  ),
                  _infoRow('Last Sync',    (_syncStatus?['lastSync']       as String?) ?? 'Never'),
                  _infoRow('Readings',     '${(_syncStatus?['totalReadings'] as num?)?.toInt() ?? 0}'),
                ])),
                const SizedBox(height: 16),

                // Sensor Toggles
                _sectionTitle('Sensor Settings', Icons.sensors),
                const SizedBox(height: 8),
                LunaCard(child: Column(children: [
                  _sensorToggle('Heart Rate Sensor', 'heartRate', sensors, user, auth, Icons.favorite_outline),
                  _sensorToggle('Temperature Sensor', 'temperature', sensors, user, auth, Icons.thermostat_outlined),
                  _sensorToggle('Sleep Tracker', 'sleep', sensors, user, auth, Icons.bedtime_outlined),
                ])),
                const SizedBox(height: 16),

                // Cycle Settings
                _sectionTitle('Cycle Settings', Icons.loop),
                const SizedBox(height: 8),
                LunaCard(child: Column(children: [
                  _sliderRow('Cycle Length', cycleLen, 21, 40, (v) async {
                    await ApiService.updateCycleSettings({'cycleLength': v.round()});
                    await _refreshUser(auth);
                  }),
                  _sliderRow('Period Length', periodLen, 2, 10, (v) async {
                    await ApiService.updateCycleSettings({'periodLength': v.round()});
                    await _refreshUser(auth);
                  }),
                  Padding(
                    padding: const EdgeInsets.symmetric(vertical: 8),
                    child: Row(children: [
                      Expanded(child: Text('Last Period Start', style: AppTheme.body)),
                      TextButton(
                        onPressed: () => _pickLastPeriod(context, auth),
                        child: Text(
                          (user['lastPeriodStart'] as String?) ?? 'Set date',
                          style: const TextStyle(
                            color: AppTheme.primary,
                            fontWeight: FontWeight.w600,
                            fontSize: 13,
                          ),
                        ),
                      ),
                    ]),
                  ),
                ])),
                const SizedBox(height: 16),

                // AI Model Info
                _sectionTitle('AI Model Info', Icons.psychology),
                const SizedBox(height: 8),
                LunaCard(child: Column(children: [
                  _infoRow('Algorithm', 'RandomForestClassifier'),
                  _infoRow('Dataset', (_modelInfo?['dataset'] as String?) ?? 'mcPHASES v1.0.0'),
                  _infoRow('Accuracy',
                    '${(((_modelInfo?['accuracy'] as num?)?.toDouble() ?? 0.9) * 100).toInt()}%'),
                  _infoRow('Version', (_modelInfo?['version'] as String?) ?? '1.0.0'),
                  _infoRow('Features', '${(_modelInfo?['features'] as List?)?.length ?? 9} features'),
                ])),
                const SizedBox(height: 16),

                // App info
                _sectionTitle('App', Icons.info_outline),
                const SizedBox(height: 8),
                LunaCard(child: Column(children: [
                  _actionTile(Icons.info_outline, 'About Luna', () => _showAbout(context)),
                  _actionTile(Icons.privacy_tip_outlined, 'Privacy Policy', () {}),
                  _actionTile(Icons.help_outline, 'Help & Support', () {}),
                ])),
                const SizedBox(height: 16),

                // Sign out
                OutlinedButton.icon(
                  icon: const Icon(Icons.logout, color: AppTheme.warning),
                  label: const Text('Sign Out',
                    style: TextStyle(color: AppTheme.warning, fontWeight: FontWeight.w600)),
                  style: OutlinedButton.styleFrom(
                    side: const BorderSide(color: AppTheme.warning),
                    minimumSize: const Size(double.infinity, 50),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                  ),
                  onPressed: () async {
                    await auth.logout();
                    if (mounted) {
                      Navigator.pushAndRemoveUntil(
                        context,
                        MaterialPageRoute(builder: (_) => const OnboardingScreen()),
                        (_) => false,
                      );
                    }
                  },
                ),
                const SizedBox(height: 40),
              ]),
            )),
          ]),
        ),
      ),
    );
  }

  // ── Widget helpers ─────────────────────────────────────────────────────────
  Widget _sectionTitle(String title, IconData icon) => Row(children: [
    Icon(icon, size: 15, color: AppTheme.primary),
    const SizedBox(width: 6),
    Text(title,
      style: const TextStyle(color: AppTheme.primary, fontWeight: FontWeight.w600, fontSize: 14)),
  ]);

  Widget _infoRow(String label, String value, {Color? color}) => Padding(
    padding: const EdgeInsets.symmetric(vertical: 7),
    child: Row(children: [
      Expanded(child: Text(label, style: AppTheme.body.copyWith(fontSize: 13))),
      Text(value,
        style: TextStyle(
          fontWeight: FontWeight.w600,
          fontSize: 13,
          color: color ?? AppTheme.textPrimary,
        )),
    ]),
  );

  Widget _actionTile(IconData icon, String label, VoidCallback onTap) => InkWell(
    onTap: onTap,
    child: Padding(
      padding: const EdgeInsets.symmetric(vertical: 10),
      child: Row(children: [
        Icon(icon, size: 18, color: AppTheme.textSecondary),
        const SizedBox(width: 10),
        Expanded(child: Text(label, style: AppTheme.body.copyWith(fontSize: 13))),
        const Icon(Icons.chevron_right, size: 18, color: AppTheme.textHint),
      ]),
    ),
  );

  Widget _sliderRow(String label, int value, int min, int max, ValueChanged<double> onChanged) =>
      Padding(
        padding: const EdgeInsets.symmetric(vertical: 4),
        child: Row(children: [
          SizedBox(width: 100, child: Text(label, style: AppTheme.body.copyWith(fontSize: 13))),
          Expanded(child: Slider(
            value: value.toDouble(),
            min: min.toDouble(),
            max: max.toDouble(),
            activeColor: AppTheme.primary,
            onChanged: onChanged,
          )),
          SizedBox(width: 38, child: Text('$value d', style: AppTheme.caption)),
        ]),
      );

  Widget _sensorToggle(
    String label,
    String key,
    Map<String, dynamic> sensors,
    Map<String, dynamic> user,
    AuthProvider auth,
    IconData icon,
  ) =>
      Padding(
        padding: const EdgeInsets.symmetric(vertical: 6),
        child: Row(children: [
          Icon(icon, size: 18, color: AppTheme.textSecondary),
          const SizedBox(width: 10),
          Expanded(child: Text(label, style: AppTheme.body.copyWith(fontSize: 13))),
          Switch.adaptive(
            value: sensors[key] == true,
            activeColor: AppTheme.primary,
            onChanged: (val) async {
              await ApiService.updateSensors({key: val});
              await _refreshUser(auth);
            },
          ),
        ]),
      );

  Future<void> _pickLastPeriod(BuildContext context, AuthProvider auth) async {
    final picked = await showDatePicker(
      context: context,
      initialDate: DateTime.now().subtract(const Duration(days: 14)),
      firstDate: DateTime.now().subtract(const Duration(days: 90)),
      lastDate: DateTime.now(),
      builder: (ctx, child) => Theme(
        data: Theme.of(ctx).copyWith(
          colorScheme: const ColorScheme.light(primary: AppTheme.primary),
        ),
        child: child!,
      ),
    );
    if (picked != null && mounted) {
      final d = '${picked.year}-${picked.month.toString().padLeft(2,'0')}-${picked.day.toString().padLeft(2,'0')}';
      await ApiService.updateCycleSettings({'lastPeriodStart': d});
      await _refreshUser(auth);
    }
  }

  void _showEditProfile(BuildContext context, Map<String, dynamic> user, AuthProvider auth) {
    final ctrl = TextEditingController(text: user['name'] as String? ?? '');
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (ctx) => Padding(
        padding: EdgeInsets.fromLTRB(24, 20, 24, MediaQuery.of(ctx).viewInsets.bottom + 24),
        child: Column(mainAxisSize: MainAxisSize.min, crossAxisAlignment: CrossAxisAlignment.start, children: [
          Text('Edit Profile', style: AppTheme.heading3),
          const SizedBox(height: 16),
          TextField(
            controller: ctrl,
            decoration: const InputDecoration(
              labelText: 'Full Name',
              prefixIcon: Icon(Icons.person_outline),
            ),
          ),
          const SizedBox(height: 16),
          ElevatedButton(
            onPressed: () async {
              if (ctrl.text.trim().isEmpty) return;
              await ApiService.updateProfile({'name': ctrl.text.trim()});
              await _refreshUser(auth);
              if (mounted) Navigator.pop(context);
            },
            child: const Text('Save Changes'),
          ),
        ]),
      ),
    );
  }

  void _showAbout(BuildContext context) => showAboutDialog(
    context: context,
    applicationName: '🌙 Luna',
    applicationVersion: '1.0.0',
    applicationLegalese: 'Wearable Menstrual Wellness Monitoring Dashboard\nIT4031 – SLIIT Data Science',
    children: [
      const SizedBox(height: 12),
      const Text(
        'Powered by RandomForestClassifier trained on the mcPHASES dataset (42 subjects, 96% accuracy).\n\nData is fetched live from MongoDB Atlas via a secure Node.js REST API.',
        style: TextStyle(fontSize: 13),
      ),
    ],
  );
}
