import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

@immutable
class AppSemanticColors extends ThemeExtension<AppSemanticColors> {
  const AppSemanticColors({
    required this.mint,
    required this.peach,
    required this.honey,
    required this.alertPeach,
  });

  final Color mint;
  final Color peach;
  final Color honey;
  final Color alertPeach;

  @override
  AppSemanticColors copyWith({
    Color? mint,
    Color? peach,
    Color? honey,
    Color? alertPeach,
  }) {
    return AppSemanticColors(
      mint: mint ?? this.mint,
      peach: peach ?? this.peach,
      honey: honey ?? this.honey,
      alertPeach: alertPeach ?? this.alertPeach,
    );
  }

  @override
  AppSemanticColors lerp(ThemeExtension<AppSemanticColors>? other, double t) {
    if (other is! AppSemanticColors) return this;
    return AppSemanticColors(
      mint: Color.lerp(mint, other.mint, t)!,
      peach: Color.lerp(peach, other.peach, t)!,
      honey: Color.lerp(honey, other.honey, t)!,
      alertPeach: Color.lerp(alertPeach, other.alertPeach, t)!,
    );
  }
}

class AppTheme {
  AppTheme._();

  // Colors from .stitch/system/tokens.json
  static const Color _surface = Color(0xFFFBF9F5);
  static const Color _surfaceContainerLow = Color(0xFFF5F4EE);
  static const Color _surfaceContainer = Color(0xFFEFEEE8);
  static const Color _surfaceContainerHigh = Color(0xFFE8E9E1);
  static const Color _surfaceContainerLowest = Color(0xFFFFFFFF);
  static const Color _onSurface = Color(0xFF31332E);
  static const Color _onSurfaceVariant = Color(0xFF5E6059);
  static const Color _primary = Color(0xFF5E5E5E);
  static const Color _onPrimary = Color(0xFFFAF7F6);
  static const Color _secondary = Color(0xFF4F635E);
  static const Color _tertiaryContainer = Color(0xFFDFF6EE);
  static const Color _error = Color(0xFF9F403D);
  static const Color _errorContainer = Color(0xFFFE8B70);

  static const Color _mint = Color(0xFFD1EEDD);
  static const Color _peach = Color(0xFFFFDAD6);
  static const Color _honey = Color(0xFFFFECB3);
  static const Color _alertPeach = Color(0xFFFCEEE9);

  static const AppSemanticColors _semanticColors = AppSemanticColors(
    mint: _mint,
    peach: _peach,
    honey: _honey,
    alertPeach: _alertPeach,
  );

  static const ColorScheme _lightColorScheme = ColorScheme(
    brightness: Brightness.light,
    primary: _primary,
    onPrimary: _onPrimary,
    secondary: _secondary,
    onSecondary: _onPrimary,
    tertiary: _secondary,
    onTertiary: _onPrimary,
    tertiaryContainer: _tertiaryContainer,
    onTertiaryContainer: _onSurface,
    error: _error,
    onError: _onPrimary,
    errorContainer: _errorContainer,
    onErrorContainer: _onSurface,
    surface: _surface,
    onSurface: _onSurface,
    onSurfaceVariant: _onSurfaceVariant,
    surfaceContainerLowest: _surfaceContainerLowest,
    surfaceContainerLow: _surfaceContainerLow,
    surfaceContainer: _surfaceContainer,
    surfaceContainerHigh: _surfaceContainerHigh,
  );

  static TextTheme _textTheme() {
    final base = GoogleFonts.manropeTextTheme();
    final display = GoogleFonts.plusJakartaSansTextTheme(base);

    const double tightSpacing = -0.02;

    return base.copyWith(
      displayLarge: display.displayLarge?.copyWith(letterSpacing: tightSpacing),
      displayMedium:
          display.displayMedium?.copyWith(letterSpacing: tightSpacing),
      displaySmall: display.displaySmall?.copyWith(letterSpacing: tightSpacing),
      headlineLarge:
          display.headlineLarge?.copyWith(letterSpacing: tightSpacing),
      headlineMedium:
          display.headlineMedium?.copyWith(letterSpacing: tightSpacing),
      headlineSmall:
          display.headlineSmall?.copyWith(letterSpacing: tightSpacing),
      titleLarge: display.titleLarge?.copyWith(letterSpacing: tightSpacing),
    );
  }

  static ThemeData light() {
    return ThemeData(
      useMaterial3: true,
      colorScheme: _lightColorScheme,
      scaffoldBackgroundColor: _surface,
      textTheme: _textTheme(),
      extensions: const <ThemeExtension<dynamic>>[_semanticColors],
    );
  }

  static ThemeData dark() {
    final darkScheme = ColorScheme.fromSeed(
      seedColor: _primary,
      brightness: Brightness.dark,
    );
    return ThemeData(
      useMaterial3: true,
      colorScheme: darkScheme,
      textTheme: _textTheme(),
      extensions: const <ThemeExtension<dynamic>>[_semanticColors],
    );
  }
}
