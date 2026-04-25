import 'package:flutter/material.dart';
import '../theme/app_theme.dart';
import 'auth/login_screen.dart';
import 'auth/signup_screen.dart';

class OnboardingScreen extends StatefulWidget {
  const OnboardingScreen({super.key});
  @override
  State<OnboardingScreen> createState() => _OnboardingScreenState();
}

class _OnboardingScreenState extends State<OnboardingScreen> {
  final _controller = PageController();
  int _page = 0;

  static const _pages = [
    _OnboardPage(
      emoji: '🌙',
      title: 'Track Your Cycle\nAutomatically',
      body: 'Luna reads from your wearable sensor and tracks your menstrual cycle without manual input.',
      bg: Color(0xFFFFF0F7),
    ),
    _OnboardPage(
      emoji: '💗',
      title: 'AI-Powered\nHealth Insights',
      body: 'Our model analyses heart rate, temperature and sleep to predict your phase and upcoming period with 96% accuracy.',
      bg: Color(0xFFF0F4FF),
    ),
    _OnboardPage(
      emoji: '🔔',
      title: 'Smart Alerts &\nPredictions',
      body: 'Get notified before your period starts and understand your body\'s signals in real time.',
      bg: Color(0xFFFFF8E1),
    ),
  ];

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) => Scaffold(
    body: SafeArea(
      child: Column(children: [
        Expanded(
          child: PageView.builder(
            controller: _controller,
            itemCount: _pages.length,
            onPageChanged: (i) => setState(() => _page = i),
            itemBuilder: (_, i) => _pages[i],
          ),
        ),
        // Dot indicators
        Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: List.generate(_pages.length, (i) =>
            AnimatedContainer(
              duration: const Duration(milliseconds: 300),
              margin: const EdgeInsets.symmetric(horizontal: 4, vertical: 16),
              width: _page == i ? 24 : 8,
              height: 8,
              decoration: BoxDecoration(
                color: _page == i ? AppTheme.primary : AppTheme.divider,
                borderRadius: BorderRadius.circular(4),
              ),
            ),
          ),
        ),
        // Buttons
        Padding(
          padding: const EdgeInsets.fromLTRB(24, 0, 24, 32),
          child: Column(children: [
            ElevatedButton(
              onPressed: () => Navigator.push(
                context,
                MaterialPageRoute(builder: (_) => const SignupScreen()),
              ),
              child: const Text('Get Started'),
            ),
            const SizedBox(height: 12),
            TextButton(
              onPressed: () => Navigator.push(
                context,
                MaterialPageRoute(builder: (_) => const LoginScreen()),
              ),
              child: const Text(
                'Already have an account? Sign in',
                style: TextStyle(color: AppTheme.primary, fontWeight: FontWeight.w500),
              ),
            ),
          ]),
        ),
      ]),
    ),
  );
}

class _OnboardPage extends StatelessWidget {
  final String emoji;
  final String title;
  final String body;
  final Color bg;
  const _OnboardPage({required this.emoji, required this.title, required this.body, required this.bg});

  @override
  Widget build(BuildContext context) => Container(
    color: bg,
    padding: const EdgeInsets.all(40),
    child: Column(mainAxisAlignment: MainAxisAlignment.center, children: [
      Text(emoji, style: const TextStyle(fontSize: 80)),
      const SizedBox(height: 32),
      Text(title,
        style: AppTheme.heading1.copyWith(fontSize: 30),
        textAlign: TextAlign.center,
      ),
      const SizedBox(height: 16),
      Text(body,
        style: AppTheme.body.copyWith(fontSize: 16, height: 1.6),
        textAlign: TextAlign.center,
      ),
    ]),
  );
}
