---
id: 000-test-helper
title: Create pumpApp test helper
description: Create test/helpers/pump_app.dart with reusable helpers for pumping any screen inside a ProviderScope with mock data.
references:
  - flutter-testing-apps
tags:
  - tests
  - helpers
outputs:
  - test/helpers/pump_app.dart
checks:
  - id: helper-exists
    cmd: test -f test/helpers/pump_app.dart
    description: pump_app.dart exists
  - id: helper-dart-valid
    cmd: dart analyze test/helpers/pump_app.dart
    description: dart analyze passes on helper
  - id: helper-exports-pumpApp
    cmd: grep -qE "Future<void>\\s+pumpApp" test/helpers/pump_app.dart
    description: pumpApp function defined
---

# Create pumpApp test helper

Emit `test/helpers/pump_app.dart` — a single helper file reused by every `_test.dart` under `test/screens/` and `test/overlays/`.

## Content requirements

```dart
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';

import 'package:<package_name>/theme/app_theme.dart';

/// Pumps [child] inside a minimal MaterialApp + ProviderScope with the given
/// [overrides] and optional [router]. Use this in every screen test.
Future<void> pumpApp(
  WidgetTester tester,
  Widget child, {
  List<Override> overrides = const [],
  GoRouter? router,
  Locale locale = const Locale('vi'),
}) async {
  final effectiveRouter = router ??
      GoRouter(
        routes: [
          GoRoute(path: '/', builder: (_, __) => child),
        ],
      );

  await tester.pumpWidget(
    ProviderScope(
      overrides: overrides,
      child: MaterialApp.router(
        theme: AppTheme.light(),
        darkTheme: AppTheme.dark(),
        routerConfig: effectiveRouter,
        locale: locale,
        supportedLocales: const [Locale('vi'), Locale('en')],
      ),
    ),
  );
  await tester.pump(); // settle one frame
}

/// Convenience: pump [child] directly (no router), useful for overlay tests
/// where the overlay is wrapped in a `Scaffold` manually.
Future<void> pumpWidget(
  WidgetTester tester,
  Widget child, {
  List<Override> overrides = const [],
}) async {
  await tester.pumpWidget(
    ProviderScope(
      overrides: overrides,
      child: MaterialApp(
        theme: AppTheme.light(),
        home: Scaffold(body: child),
      ),
    ),
  );
  await tester.pump();
}
```

## Steps

1. Read `pubspec.yaml` to extract the package `name` (used in imports).
2. Emit the file at `test/helpers/pump_app.dart` with the package-name placeholder filled.
3. Verify `dart analyze test/helpers/pump_app.dart` is clean. If the `go_router` or `flutter_riverpod` imports fail, check that `pubspec.yaml` already has them as `dev_dependencies` or `dependencies` — they should be present (v2 requires them).

## Banned

- Creating a `pumpApp` that doesn't take an `overrides` list — provider override is the whole point.
- Adding fake dependencies to `pubspec.yaml` from this task (don't touch pubspec).

## Success Criteria

- `test/helpers/pump_app.dart` exists and passes `dart analyze`
- Exports `pumpApp` and `pumpWidget` functions
