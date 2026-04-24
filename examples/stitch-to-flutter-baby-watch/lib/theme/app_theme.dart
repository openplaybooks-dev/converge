import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

/// Design tokens and theme configuration.
/// Values are populated by the 02-design-system epic from DESIGN.md.
class AppTheme {
  AppTheme._();

  // ── Brand Colors ─────────────────────────────────────────────
  static const Color brandGreen = Color(0xFF4f635e);
  static const Color brandGreenLight = Color(0xFFCDE3DC);
  static const Color brandGreenDark = Color(0xFF00391C);
  static const Color brandOnSurface = Color(0xFF31332e);
  static const Color brandOnSurfaceVariant = Color(0xFF5e6059);
  static const Color brandSurface = Color(0xFFF4F2EE);
  static const Color brandSurfaceOpaque = Color(0xFFfbf9f5);
  static const Color brandSurfaceContainer = Color(0xFFefeee8);
  static const Color brandBorder = Color(0xFFE7E3DC);
  static const Color brandShadow = Color(0x66E7E3DC);
  static const Color brandShadowDark = Color(0x33000000);
  static const Color brandImageOverlay = Color(0x4D000000);
  static const Color signOutBackground = Color(0xFFfe8b70);
  static const Color signOutForeground = Color(0xFF9e422c);
  static const Color transparent = Colors.transparent;
  static const Color brandLightGreen = Color(0xFFdff6ee);
  static const Color brandLightGreenOverlay = Color(0x66dff6ee);
  static const Color white = Color(0xFFFFFFFF);
  static const Color white80 = Color(0xCCFFFFFF);

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
      cardTheme: CardThemeData(
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
