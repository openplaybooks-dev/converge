import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

/// Design tokens and theme configuration.
/// Values are populated by the 02-design-system epic from DESIGN.md.
class AppTheme {
  AppTheme._();

  // ── Spacing Tokens ──────────────────────────────────────────
  static const double spaceXs = 4;
  static const double spaceSm = 8;
  static const double spaceMd = 16;
  static const double spaceLg = 24;
  static const double spaceXl = 32;

  static const EdgeInsets screenPadding =
      EdgeInsets.symmetric(horizontal: spaceMd);
  static const double sectionSpacing = spaceLg;
  static const double cardSpacing = 12;

  // ── Radius Tokens ──────────────────────────────────────────
  static const double radiusSm = 8;
  static const double radiusMd = 12;
  static const double radiusLg = 16;
  static const double radiusFull = 9999;

  // ── Animation Tokens ───────────────────────────────────────
  static const Duration pageTransitionDuration = Duration(milliseconds: 300);
  static const Curve pageTransitionCurve = Curves.easeOutCubic;
  static const Duration microDuration = Duration(milliseconds: 200);
  static const Curve microCurve = Curves.easeOut;
  static const Duration heroDuration = Duration(milliseconds: 350);
  static const Duration staggerDelay = Duration(milliseconds: 50);

  // ── Theme Data ─────────────────────────────────────────────

  static ThemeData get light {
    final colorScheme = ColorScheme.fromSeed(
      seedColor: const Color(0xFFD4A520),
      brightness: Brightness.light,
    );
    return _buildTheme(colorScheme);
  }

  static ThemeData get dark {
    final colorScheme = ColorScheme.fromSeed(
      seedColor: const Color(0xFFD4A520),
      brightness: Brightness.dark,
      surface: const Color(0xFF16213E),
      onSurface: const Color(0xFFE8E6E3),
    );
    return _buildTheme(colorScheme);
  }

  static ThemeData _buildTheme(ColorScheme colorScheme) {
    final textTheme = GoogleFonts.outfitTextTheme().copyWith(
      displayLarge: GoogleFonts.outfit(fontWeight: FontWeight.w700),
      headlineMedium: GoogleFonts.outfit(fontWeight: FontWeight.w600),
      titleLarge: GoogleFonts.outfit(fontWeight: FontWeight.w600),
      titleMedium: GoogleFonts.outfit(fontWeight: FontWeight.w500),
      bodyLarge: GoogleFonts.outfit(fontWeight: FontWeight.w400),
      bodyMedium: GoogleFonts.outfit(fontWeight: FontWeight.w400),
      labelLarge: GoogleFonts.outfit(fontWeight: FontWeight.w500),
      labelSmall: GoogleFonts.outfit(fontWeight: FontWeight.w500),
    );

    return ThemeData(
      useMaterial3: true,
      colorScheme: colorScheme,
      textTheme: textTheme,
      cardTheme: CardTheme(
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(radiusMd),
        ),
        elevation: 2,
      ),
      elevatedButtonTheme: ElevatedButtonThemeData(
        style: ElevatedButton.styleFrom(
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(radiusSm),
          ),
          padding: const EdgeInsets.symmetric(
            horizontal: spaceMd,
            vertical: spaceSm,
          ),
        ),
      ),
      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(radiusSm),
        ),
        contentPadding: const EdgeInsets.symmetric(
          horizontal: spaceMd,
          vertical: spaceSm,
        ),
      ),
      bottomSheetTheme: const BottomSheetThemeData(
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.vertical(
            top: Radius.circular(radiusLg),
          ),
        ),
        showDragHandle: true,
      ),
    );
  }
}
