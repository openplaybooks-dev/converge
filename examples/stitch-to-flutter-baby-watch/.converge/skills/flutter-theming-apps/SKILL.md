---
name: flutter-theming-apps
description: Customizes the visual appearance of a Flutter app using the theming system. Use when defining global styles, colors, or typography for an application.
---
# Implementing Flutter Theming and Adaptive Design

## Contents
- [Core Theming Concepts](#core-theming-concepts)
- [Material 3 Guidelines](#material-3-guidelines)
- [Component Theme Normalization](#component-theme-normalization)
- [Button Styling](#button-styling)
- [Workflows](#workflows)
- [Examples](#examples)

## Core Theming Concepts

Flutter applies styling in a strict hierarchy: styles applied to the specific widget -> themes that override the immediate parent theme -> the main app theme.

- Define app-wide themes using the `theme` property of `MaterialApp` with a `ThemeData` instance.
- Override themes for specific widget subtrees by wrapping them in a `Theme` widget and using `Theme.of(context).copyWith(...)`.
- **Do not** use deprecated `ThemeData` properties:
  - Replace `accentColor` with `colorScheme.secondary`.
  - Replace `accentTextTheme` with `textTheme` (using `colorScheme.onSecondary` for contrast).
  - Replace `AppBarTheme.color` with `AppBarTheme.backgroundColor`.

## Material 3 Guidelines

Material 3 is the default theme as of Flutter 3.16.

- **Colors:** Generate color schemes using `ColorScheme.fromSeed(seedColor: Colors.blue)`. This ensures accessible contrast ratios.
- **Elevation:** Material 3 uses `ColorScheme.surfaceTint` to indicate elevation instead of just drop shadows. To revert to M2 shadow behavior, set `surfaceTint: Colors.transparent` and define a `shadowColor`.
- **Typography:** Material 3 updates font sizes, weights, and line heights. If text wrapping breaks legacy layouts, adjust `letterSpacing` on the specific `TextStyle`.
- **Modern Components:**
  - Replace `BottomNavigationBar` with `NavigationBar`.
  - Replace `Drawer` with `NavigationDrawer`.
  - Replace `ToggleButtons` with `SegmentedButton`.
  - Use `FilledButton` for a high-emphasis button without the elevation of `ElevatedButton`.

## Component Theme Normalization

When defining `ThemeData`, use the `*ThemeData` suffix:
- `cardTheme`: Use `CardThemeData` (Not `CardTheme`)
- `dialogTheme`: Use `DialogThemeData` (Not `DialogTheme`)
- `tabBarTheme`: Use `TabBarThemeData` (Not `TabBarTheme`)
- `appBarTheme`: Use `AppBarThemeData` (Not `AppBarTheme`)
- `bottomAppBarTheme`: Use `BottomAppBarThemeData` (Not `BottomAppBarTheme`)
- `inputDecorationTheme`: Use `InputDecorationThemeData` (Not `InputDecorationTheme`)

## Button Styling

Legacy button classes (`FlatButton`, `RaisedButton`, `OutlineButton`) are obsolete.

- Use `TextButton`, `ElevatedButton`, and `OutlinedButton`.
- Configure button appearance using a `ButtonStyle` object.
- For simple overrides: `TextButton.styleFrom(foregroundColor: Colors.blue)`.
- For state-dependent styling: use `WidgetStateProperty.resolveWith`.

## Workflows

### Workflow: Material 3 ThemeData Setup
- [ ] Use `ColorScheme.fromSeed()` for color generation.
- [ ] Use `*ThemeData` classes for component properties.
- [ ] Replace legacy buttons with modern equivalents.
- [ ] Replace `BottomNavigationBar` with `NavigationBar`.
- [ ] Replace `Drawer` with `NavigationDrawer`.

## Examples

### Example: Modern Material 3 ThemeData Setup

```dart
MaterialApp(
  title: 'My App',
  theme: ThemeData(
    colorScheme: ColorScheme.fromSeed(
      seedColor: Colors.deepPurple,
      brightness: Brightness.light,
    ),
    appBarTheme: const AppBarThemeData(
      backgroundColor: Colors.deepPurple,
      elevation: 0,
    ),
    cardTheme: const CardThemeData(
      elevation: 2,
    ),
    textTheme: const TextTheme(
      bodyMedium: TextStyle(letterSpacing: 0.2),
    ),
  ),
  home: const MyHomePage(),
);
```

### Example: State-Dependent ButtonStyle

```dart
TextButton(
  style: ButtonStyle(
    foregroundColor: WidgetStateProperty.all<Color>(Colors.blue),
    overlayColor: WidgetStateProperty.resolveWith<Color?>(
      (Set<WidgetState> states) {
        if (states.contains(WidgetState.hovered)) {
          return Colors.blue.withOpacity(0.04);
        }
        if (states.contains(WidgetState.focused) ||
            states.contains(WidgetState.pressed)) {
          return Colors.blue.withOpacity(0.12);
        }
        return null;
      },
    ),
  ),
  onPressed: () {},
  child: const Text('Button'),
)
```
