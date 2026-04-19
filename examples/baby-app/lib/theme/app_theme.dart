import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

/// Design tokens and theme configuration for the Bloom design system.
/// Values derived from DESIGN.md — Pastel Elevation with lilac-tinted shadows.
class AppTheme {
  AppTheme._();

  // ── Color Tokens ─────────────────────────────────────────────
  static const Color canvasColor = Color(0xFFEDE8F7); // Lavender Mist
  static const Color canvasAltColor = Color(0xFFFDEEEE); // Blush Veil
  static const Color surfaceColor = Color(0xFFFFFFFF); // Cloud White
  static const Color surfaceTertiaryColor = Color(0xFFFDF9F8); // Soft Ivory
  static const Color textPrimaryColor = Color(0xFF2A2A3A); // Ink Charcoal
  static const Color textSecondaryColor = Color(0xFF8B8B9C); // Muted Quartz
  static const Color coralColor = Color(0xFFF28B8B); // Coral Bloom
  static const Color coralTintColor = Color(0x1FF28B8B); // Coral Whisper ~12%
  static const Color lilacColor = Color(0xFF8B7ED8); // Lilac Pulse
  static const Color lilacTintColor = Color(0x248B7ED8); // Lilac Whisper ~14%
  static const Color chipBgColor = Color(0x148B7ED8); // ~8%
  static const Color pregnancyPinkColor = Color(0xFFF7D9DC); // Pregnancy mode mid-tone
  static const Color avatarShadowColor = Color(0x298B7ED8); // Avatar lilac shadow
  static const Color successColor = Color(0xFF6DC48A); // Field Green
  static const Color errorColor = Color(0xFFE85C5C); // Fault Red
  static const Color warningColor = Color(0xFFF4C84D); // Caution Amber

  // ── BMI Gauge Colors ──────────────────────────────────────
  static const Color bmiUnderweightColor = Color(0xFF5BB4E5);
  static const Color bmiHealthyColor = Color(0xFF6DC48A);
  static const Color bmiCautionColor = Color(0xFFF4C84D);
  static const Color bmiWarningColor = Color(0xFFF59052);
  static const Color bmiAlertColor = Color(0xFFE85C5C);

  // ── Spacing Tokens ──────────────────────────────────────────
  static const double spaceXs = 4;
  static const double spaceSm = 8;
  static const double spaceMd = 16;
  static const double spaceLg = 24;
  static const double spaceXl = 32;
  static const double screenHPadding = 20; // 1.25rem
  static const double sectionSpacing = 28; // 1.75rem

  static const EdgeInsets screenPadding =
      EdgeInsets.symmetric(horizontal: screenHPadding);
  static const double cardSpacing = 12;

  // ── Radius Tokens ──────────────────────────────────────────
  static const double radiusSm = 8;
  static const double radiusMd = 12;
  static const double radiusLg = 16;
  static const double radiusCard = 24;
  static const double radiusHero = 32;
  static const double radiusFull = 9999;

  // ── Shadow Tokens (lilac-tinted) ────────────────────────────
  static const List<BoxShadow> shadowSubtle = [
    BoxShadow(
      color: Color(0x148B7ED8),
      blurRadius: 8,
      offset: Offset(0, 2),
    ),
  ];
  static const List<BoxShadow> shadowStandard = [
    BoxShadow(
      color: Color(0x1F8B7ED8),
      blurRadius: 20,
      offset: Offset(0, 4),
    ),
  ];
  static const List<BoxShadow> shadowProminent = [
    BoxShadow(
      color: Color(0x248B7ED8),
      blurRadius: 32,
      offset: Offset(0, 8),
    ),
  ];
  static const List<BoxShadow> shadowNav = [
    BoxShadow(
      color: Color(0x148B7ED8),
      blurRadius: 20,
      offset: Offset(0, -4),
    ),
  ];

  // ── Animation Tokens ───────────────────────────────────────
  static const Duration cardDuration = Duration(milliseconds: 450);
  static const Curve springCurve = Cubic(0.34, 1.56, 0.64, 1);
  static const Duration exitDuration = Duration(milliseconds: 180);
  static const Curve exitCurve = Cubic(0.25, 0, 0, 1);
  static const Duration countUpDuration = Duration(milliseconds: 800);
  static const Duration staggerDelay = Duration(milliseconds: 80);
  static const Duration pageTransitionDuration = Duration(milliseconds: 350);
  static const Curve pageTransitionCurve = Cubic(0.34, 1.56, 0.64, 1);
  static const Duration microDuration = Duration(milliseconds: 200);
  static const Curve microCurve = Curves.easeOut;
  static const Duration heroDuration = Duration(milliseconds: 350);

  // ── Theme Data ─────────────────────────────────────────────

  static ThemeData get light {
    final colorScheme = ColorScheme.fromSeed(
      seedColor: coralColor,
      brightness: Brightness.light,
      surface: surfaceColor,
      onSurface: textPrimaryColor,
      error: errorColor,
    );
    return _buildTheme(colorScheme);
  }

  static ThemeData get dark {
    final colorScheme = ColorScheme.fromSeed(
      seedColor: coralColor,
      brightness: Brightness.dark,
    );
    return _buildTheme(colorScheme);
  }

  static ThemeData _buildTheme(ColorScheme colorScheme) {
    final textTheme = GoogleFonts.plusJakartaSansTextTheme().copyWith(
      displayLarge: GoogleFonts.plusJakartaSans(fontWeight: FontWeight.w800),
      displayMedium: GoogleFonts.plusJakartaSans(fontWeight: FontWeight.w800),
      displaySmall: GoogleFonts.plusJakartaSans(fontWeight: FontWeight.w800),
      headlineLarge: GoogleFonts.plusJakartaSans(fontWeight: FontWeight.w700),
      headlineMedium: GoogleFonts.plusJakartaSans(fontWeight: FontWeight.w700),
      headlineSmall: GoogleFonts.plusJakartaSans(fontWeight: FontWeight.w700),
      titleLarge: GoogleFonts.plusJakartaSans(fontWeight: FontWeight.w600),
      titleMedium: GoogleFonts.plusJakartaSans(fontWeight: FontWeight.w600),
      titleSmall: GoogleFonts.plusJakartaSans(fontWeight: FontWeight.w600),
      bodyLarge: GoogleFonts.plusJakartaSans(fontWeight: FontWeight.w400),
      bodyMedium: GoogleFonts.plusJakartaSans(fontWeight: FontWeight.w400),
      bodySmall: GoogleFonts.plusJakartaSans(fontWeight: FontWeight.w400),
      labelLarge: GoogleFonts.plusJakartaSans(fontWeight: FontWeight.w500),
      labelMedium: GoogleFonts.plusJakartaSans(fontWeight: FontWeight.w500),
      labelSmall: GoogleFonts.plusJakartaSans(fontWeight: FontWeight.w700),
    );

    return ThemeData(
      useMaterial3: true,
      colorScheme: colorScheme,
      textTheme: textTheme,
      scaffoldBackgroundColor: canvasColor,
      cardTheme: CardThemeData(
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(radiusCard),
        ),
        elevation: 0,
        color: surfaceColor,
      ),
      elevatedButtonTheme: ElevatedButtonThemeData(
        style: ElevatedButton.styleFrom(
          backgroundColor: coralColor,
          foregroundColor: surfaceColor,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(radiusFull),
          ),
          padding: const EdgeInsets.symmetric(
            horizontal: spaceLg,
            vertical: spaceMd,
          ),
        ),
      ),
      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: surfaceTertiaryColor,
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(radiusSm),
        ),
        contentPadding: const EdgeInsets.symmetric(
          horizontal: spaceMd,
          vertical: spaceSm,
        ),
      ),
      bottomSheetTheme: const BottomSheetThemeData(
        backgroundColor: surfaceColor,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.vertical(
            top: Radius.circular(28),
          ),
        ),
        showDragHandle: true,
      ),
      navigationBarTheme: NavigationBarThemeData(
        backgroundColor: surfaceColor,
        indicatorColor: coralTintColor,
        iconTheme: WidgetStateProperty.resolveWith((states) {
          if (states.contains(WidgetState.selected)) {
            return const IconThemeData(color: coralColor, size: 22);
          }
          return const IconThemeData(color: textSecondaryColor, size: 22);
        }),
        labelTextStyle: WidgetStateProperty.resolveWith((states) {
          if (states.contains(WidgetState.selected)) {
            return GoogleFonts.plusJakartaSans(
              fontSize: 11,
              fontWeight: FontWeight.w700,
              color: coralColor,
            );
          }
          return GoogleFonts.plusJakartaSans(
            fontSize: 11,
            fontWeight: FontWeight.w700,
            color: textSecondaryColor,
          );
        }),
      ),
    );
  }
}
