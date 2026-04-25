import 'package:flutter/material.dart';

class AppTheme {
  static const Color primary       = Color(0xFFE91E8C);
  static const Color primaryLight  = Color(0xFFF8BBD9);
  static const Color primaryDark   = Color(0xFFC2185B);
  static const Color accent        = Color(0xFFFF6B9D);

  static const Color menstrualColor  = Color(0xFFE91E63);
  static const Color follicularColor = Color(0xFF4CAF50);
  static const Color ovulationColor  = Color(0xFFFF9800);
  static const Color lutealColor     = Color(0xFF9C27B0);

  static const Color background  = Color(0xFFFDF6F9);
  static const Color surface     = Color(0xFFFFFFFF);
  static const Color cardBg      = Color(0xFFFFF0F7);
  static const Color divider     = Color(0xFFF0E0EB);

  static const Color textPrimary   = Color(0xFF1A1A2E);
  static const Color textSecondary = Color(0xFF6B7280);
  static const Color textHint      = Color(0xFFB0B0C3);

  static const Color good    = Color(0xFF4CAF50);
  static const Color fair    = Color(0xFFFF9800);
  static const Color warning = Color(0xFFF44336);

  static const LinearGradient primaryGradient = LinearGradient(
    colors: [Color(0xFFE91E8C), Color(0xFFFF6B9D)],
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
  );

  static ThemeData get theme => ThemeData(
    useMaterial3: true,
    colorScheme: ColorScheme.fromSeed(
      seedColor: primary,
      brightness: Brightness.light,
      primary: primary,
      secondary: accent,
      surface: surface,
    ),
    scaffoldBackgroundColor: background,
    appBarTheme: const AppBarTheme(
      backgroundColor: Colors.transparent,
      elevation: 0,
      centerTitle: false,
      titleTextStyle: TextStyle(
        fontSize: 20,
        fontWeight: FontWeight.w600,
        color: textPrimary,
      ),
      iconTheme: IconThemeData(color: textPrimary),
    ),
    cardTheme: CardThemeData(
      color: surface,
      elevation: 0,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
    ),
    elevatedButtonTheme: ElevatedButtonThemeData(
      style: ElevatedButton.styleFrom(
        backgroundColor: primary,
        foregroundColor: Colors.white,
        elevation: 0,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
        textStyle: const TextStyle(fontWeight: FontWeight.w600, fontSize: 16),
        minimumSize: const Size(double.infinity, 52),
      ),
    ),
    inputDecorationTheme: InputDecorationTheme(
      filled: true,
      fillColor: const Color(0xFFF5F5F5),
      border: OutlineInputBorder(
        borderRadius: BorderRadius.circular(12),
        borderSide: BorderSide.none,
      ),
      contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
    ),
    bottomNavigationBarTheme: const BottomNavigationBarThemeData(
      backgroundColor: surface,
      selectedItemColor: primary,
      unselectedItemColor: textHint,
      type: BottomNavigationBarType.fixed,
      elevation: 8,
      selectedLabelStyle: TextStyle(fontWeight: FontWeight.w600, fontSize: 11),
      unselectedLabelStyle: TextStyle(fontSize: 11),
    ),
  );

  static const TextStyle heading1 = TextStyle(fontSize: 28, fontWeight: FontWeight.w700, color: textPrimary);
  static const TextStyle heading2 = TextStyle(fontSize: 22, fontWeight: FontWeight.w600, color: textPrimary);
  static const TextStyle heading3 = TextStyle(fontSize: 18, fontWeight: FontWeight.w600, color: textPrimary);
  static const TextStyle body     = TextStyle(fontSize: 14, fontWeight: FontWeight.w400, color: textSecondary);
  static const TextStyle bodyBold = TextStyle(fontSize: 14, fontWeight: FontWeight.w600, color: textPrimary);
  static const TextStyle caption  = TextStyle(fontSize: 12, fontWeight: FontWeight.w400, color: textHint);

  static Color phaseColor(String phase) {
    switch (phase.toLowerCase()) {
      case 'menstrual':           return menstrualColor;
      case 'follicular':          return follicularColor;
      case 'ovulation':
      case 'fertility':           return ovulationColor;
      case 'luteal':              return lutealColor;
      default:                    return primary;
    }
  }

  static String phaseEmoji(String phase) {
    switch (phase.toLowerCase()) {
      case 'menstrual':           return '🔴';
      case 'follicular':          return '🌱';
      case 'ovulation':
      case 'fertility':           return '⭐';
      case 'luteal':              return '🌙';
      default:                    return '🌸';
    }
  }
}
