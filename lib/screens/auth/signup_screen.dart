import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../theme/app_theme.dart';
import '../../services/auth_provider.dart';
import '../main_shell.dart';

class SignupScreen extends StatefulWidget {
  const SignupScreen({super.key});
  @override
  State<SignupScreen> createState() => _SignupScreenState();
}

class _SignupScreenState extends State<SignupScreen> {
  final _name     = TextEditingController();
  final _email    = TextEditingController();
  final _password = TextEditingController();
  int _cycleLength  = 28;
  int _periodLength = 5;
  bool _obscure     = true;

  @override
  void dispose() {
    _name.dispose();
    _email.dispose();
    _password.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthProvider>();
    return Scaffold(
      appBar: AppBar(
        title: const Text('Create Account',
          style: TextStyle(fontWeight: FontWeight.w600)),
      ),
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(24),
          child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Text('Join Luna 🌙', style: AppTheme.heading2),
            const SizedBox(height: 4),
            Text('Set up your wellness profile', style: AppTheme.body),
            const SizedBox(height: 24),

            if (auth.error != null)
              Container(
                margin: const EdgeInsets.only(bottom: 16),
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: AppTheme.warning.withOpacity(0.1),
                  borderRadius: BorderRadius.circular(10),
                ),
                child: Text(auth.error!,
                  style: const TextStyle(color: AppTheme.warning)),
              ),

            _label('Full Name'),
            TextField(
              controller: _name,
              decoration: const InputDecoration(
                hintText: 'Your name',
                prefixIcon: Icon(Icons.person_outline),
              ),
            ),
            const SizedBox(height: 14),

            _label('Email'),
            TextField(
              controller: _email,
              keyboardType: TextInputType.emailAddress,
              decoration: const InputDecoration(
                hintText: 'you@email.com',
                prefixIcon: Icon(Icons.email_outlined),
              ),
            ),
            const SizedBox(height: 14),

            _label('Password'),
            TextField(
              controller: _password,
              obscureText: _obscure,
              decoration: InputDecoration(
                hintText: 'At least 8 characters',
                prefixIcon: const Icon(Icons.lock_outline),
                suffixIcon: IconButton(
                  icon: Icon(_obscure ? Icons.visibility_off : Icons.visibility),
                  onPressed: () => setState(() => _obscure = !_obscure),
                ),
              ),
            ),
            const SizedBox(height: 20),

            // Cycle settings
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: AppTheme.cardBg,
                borderRadius: BorderRadius.circular(14),
              ),
              child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                Text('Cycle Settings', style: AppTheme.bodyBold),
                const SizedBox(height: 12),
                _sliderRow('Cycle Length', _cycleLength, 21, 40,
                  (v) => setState(() => _cycleLength = v.round()), 'days'),
                const SizedBox(height: 8),
                _sliderRow('Period Length', _periodLength, 2, 10,
                  (v) => setState(() => _periodLength = v.round()), 'days'),
              ]),
            ),
            const SizedBox(height: 28),

            ElevatedButton(
              onPressed: auth.loading ? null : () async {
                print('DEBUG: Signup button pressed');
                if (_name.text.trim().isEmpty || _email.text.trim().isEmpty || _password.text.isEmpty) {
                  print('DEBUG: Signup aborted - empty fields');
                  return;
                }
                print('DEBUG: Signup Email: "${_email.text.trim()}", Password: "${_password.text}"');
                final ok = await auth.register({
                  'fullName':      _name.text.trim(),
                  'email':         _email.text.trim().toLowerCase(),
                  'password':      _password.text,
                  'cycleLength':   _cycleLength,
                  'periodLength':  _periodLength,
                  'lastPeriodStart': DateTime.now().toIso8601String().split('T')[0],
                });
                print('DEBUG: auth.register returned: $ok');
                if (ok && mounted) {
                  Navigator.pushAndRemoveUntil(
                    context,
                    MaterialPageRoute(builder: (_) => const MainShell()),
                    (_) => false,
                  );
                }
              },
              child: auth.loading
                  ? const SizedBox(
                      height: 22, width: 22,
                      child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2),
                    )
                  : const Text('Create Account'),
            ),
          ]),
        ),
      ),
    );
  }

  Widget _label(String text) => Padding(
    padding: const EdgeInsets.only(bottom: 6),
    child: Text(text,
      style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 13, color: AppTheme.textPrimary)),
  );

  Widget _sliderRow(String label, int value, int min, int max, ValueChanged<double> onChanged, String unit) =>
      Row(children: [
        SizedBox(width: 110, child: Text(label, style: AppTheme.body)),
        Expanded(child: Slider(
          value: value.toDouble(),
          min: min.toDouble(),
          max: max.toDouble(),
          activeColor: AppTheme.primary,
          onChanged: onChanged,
        )),
        Text('$value $unit', style: AppTheme.bodyBold),
      ]);
}
