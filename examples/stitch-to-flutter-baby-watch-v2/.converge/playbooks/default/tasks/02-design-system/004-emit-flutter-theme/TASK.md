---
id: 004-emit-flutter-theme
title: Emit Flutter theme from tokens.json
description: Deterministically generate lib/theme/app_theme.dart from tokens.json. No creative judgment.
skill: flutter-theming-apps
dependencies:
  - 003-extract-tokens
tags:
  - design
  - theme
  - flutter
inputs:
  - .stitch/system/tokens.json
  - .stitch/system/DESIGN.md
outputs:
  - lib/theme/app_theme.dart
  - lib/theme/app_spacing.dart
checks:
  - id: pub-get-ran
    cmd: test -f .dart_tool/package_config.json
    description: flutter pub get has been run (package_config.json exists)
  - id: theme-exists
    cmd: test -f lib/theme/app_theme.dart
    description: app_theme.dart exists
  - id: spacing-exists
    cmd: test -f lib/theme/app_spacing.dart
    description: app_spacing.dart exists
  - id: theme-valid-dart
    cmd: dart analyze lib/theme/
    description: theme files pass dart analyze
  - id: theme-exports-material3
    cmd: 'grep -q "useMaterial3: true" lib/theme/app_theme.dart'
    description: Theme uses Material 3
  - id: theme-has-colorscheme
    cmd: grep -q "ColorScheme" lib/theme/app_theme.dart
    description: Theme has a ColorScheme
  - id: theme-no-hardcoded-hex
    cmd: bash -c 'count=$(grep -cE "Color\\(0x[0-9a-fA-F]{8}\\)" lib/theme/app_theme.dart); test "$count" -ge 5'
    description: Theme references hex colors (not abstract constants) so tokens are visibly sourced
---

# Emit Flutter theme from tokens

Mechanical translation: `tokens.json` → `lib/theme/app_theme.dart` + `lib/theme/app_spacing.dart`. No AI creativity. Every value in the Dart file must be traceable to a value in tokens.json.

## Step 0 — Bootstrap `flutter pub get`

Before writing any Dart, run `flutter pub get` from the project root. Without it, `dart analyze` cannot resolve `package:flutter/*` imports and every subsequent check in this phase and beyond will fail.

```bash
flutter pub get
```

Verify `.dart_tool/package_config.json` exists after. If `flutter` is not on PATH in the agent sandbox, run `dart pub get` as a fallback — Flutter's pub is a thin wrapper.

If pub get reports lock-file conflicts, **do not** modify `pubspec.yaml` to work around them — surface the conflict as a failure and stop. The pubspec is configured upstream and must not drift.

## Inputs

- `.stitch/system/tokens.json` — SSoT
- `.stitch/system/DESIGN.md` — for context only (e.g. what roles colors fill)

## Translation rules

### Colors → ColorScheme

Map tokens.json `colors` keys to Material 3 `ColorScheme` roles:

| tokens.json key          | ColorScheme role              |
| ------------------------ | ----------------------------- |
| surface                  | surface                       |
| surfaceContainerLow      | surfaceContainerLow           |
| surfaceContainer         | surfaceContainer              |
| surfaceContainerHigh     | surfaceContainerHigh          |
| surfaceContainerLowest   | surfaceContainerLowest        |
| onSurface                | onSurface                     |
| onSurfaceVariant         | onSurfaceVariant              |
| primary                  | primary                       |
| onPrimary                | onPrimary                     |
| secondary                | secondary                     |
| tertiaryContainer        | tertiaryContainer             |
| error                    | error                         |
| errorContainer           | errorContainer                |

App-specific semantic colors (`mint`, `peach`, `honey`, `alertPeach`) do not fit the ColorScheme. Emit them on an `AppSemanticColors` `ThemeExtension<AppSemanticColors>` attached to the ThemeData. This makes them available as `Theme.of(context).extension<AppSemanticColors>()!.mint` from any widget.

### Typography → TextTheme

Use `GoogleFonts.<family>TextTheme()` from `google_fonts` package if available, otherwise fall back to built-in `Typography`. Use `tokens.json > typography.fontFamilies.display` for headlines (displayLarge, headlineLarge, titleLarge) and `…fontFamilies.body` for body and labels.

Letter-spacing for headlines: tokens.json → `typography.letterSpacingTight` (negative value).

### Radius → ShapeTheme (not used directly, exposed as constants)

Emit a separate `lib/theme/app_spacing.dart` containing:

```dart
class AppRadius {
  AppRadius._();
  static const double sm   = 8;
  static const double md   = 16;
  static const double lg   = 32;
  static const double xl   = 48;
  static const double full = 9999;
}

class AppSpacing {
  AppSpacing._();
  static const double xs = 4;
  static const double sm = 8;
  static const double md = 24;
  static const double lg = 32;
  static const double xl = 40;
}
```

Every value straight from tokens.json.

### Shadow

Emit `AppShadows.soft = BoxShadow(...)` mechanically from the shadow spec string (parse `offset`, `blur`, `color`). If the string is hard to parse, fall back to the values given in DESIGN.md §Elevation.

## File layout

```
lib/theme/
├── app_theme.dart       // AppTheme class with .light() and .dark() ThemeData factories
├── app_spacing.dart     // AppRadius, AppSpacing, AppShadows constants
```

## Banned

- Handwritten hex values not present in tokens.json.
- `Colors.X` (Material named colors) anywhere — all colors come from tokens.
- Hardcoded TextStyle fontSize in widgets — use textTheme roles.
- Emitting a dark theme palette that was not in tokens.json (if tokens.json has no dark entries, `.dark()` returns a ThemeData derived via `ColorScheme.fromSeed(seedColor: primary, brightness: Brightness.dark)`).

## Success Criteria

- Both files exist
- `dart analyze lib/theme/` exits 0
- Theme uses `useMaterial3: true`
- At least 5 `Color(0xFF…)` literals (proves tokens flowed through)
- `AppSemanticColors` `ThemeExtension` is registered on the ThemeData
