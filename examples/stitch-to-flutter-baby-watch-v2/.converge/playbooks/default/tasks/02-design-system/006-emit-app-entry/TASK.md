---
id: 006-emit-app-entry
title: Emit main.dart and app.dart entry points
description: Create lib/main.dart and lib/app.dart so the Flutter project is bootable and testable before phase 03 starts.
skill: flutter-architecting-apps
dependencies:
  - 004-emit-flutter-theme
tags:
  - entry
  - flutter
inputs:
  - lib/theme/app_theme.dart
  - .stitch/system/tokens.json
outputs:
  - lib/main.dart
  - lib/app.dart
  - lib/router/app_router.dart
checks:
  - id: main-exists
    cmd: test -f lib/main.dart
    description: lib/main.dart exists
  - id: app-exists
    cmd: test -f lib/app.dart
    description: lib/app.dart exists
  - id: router-stub-exists
    cmd: test -f lib/router/app_router.dart
    description: lib/router/app_router.dart exists (phase 03 appends routes to it)
  - id: entry-dart-valid
    cmd: dart analyze lib/main.dart lib/app.dart lib/router/app_router.dart
    description: dart analyze passes on the entry files
---

# Emit main.dart + app.dart

Produce the three bootstrap files so `flutter run` and `flutter test` succeed from phase 02 onwards (before any screens exist). Phase 03-convert later appends routes to `lib/router/app_router.dart` as each screen is built.

## Files to emit

### `lib/main.dart`

```dart
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'app.dart';

void main() {
  runApp(const ProviderScope(child: BabyWatchApp()));
}
```

Keep `main` minimal — no SharedPreferences bootstrap, no async setup. Phase 05 (providers) may add SharedPreferences-backed providers but those read the instance lazily.

### `lib/app.dart`

```dart
import 'package:flutter/material.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'router/app_router.dart';
import 'theme/app_theme.dart';

class BabyWatchApp extends ConsumerWidget {
  const BabyWatchApp({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return MaterialApp.router(
      title: 'Baby Watch',
      debugShowCheckedModeBanner: false,
      theme: AppTheme.light(),
      darkTheme: AppTheme.dark(),
      routerConfig: appRouter,
      locale: const Locale('vi'),
      supportedLocales: const [Locale('vi'), Locale('en')],
      localizationsDelegates: const [
        GlobalMaterialLocalizations.delegate,
        GlobalWidgetsLocalizations.delegate,
        GlobalCupertinoLocalizations.delegate,
      ],
    );
  }
}
```

Title: "Baby Watch". Default locale: `vi` (references are Vietnamese). If phase 01's APP.md or UX.md names a different primary locale, use that instead.

### `lib/router/app_router.dart`

Stub with just the root `/` route returning a placeholder. Phase 03-convert will append more `GoRoute` entries as screens are generated.

```dart
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

final appRouter = GoRouter(
  initialLocation: '/',
  routes: <RouteBase>[
    GoRoute(
      path: '/',
      builder: (context, state) => const _PendingHome(),
    ),
  ],
);

/// Placeholder home shown when the real home screen has not been generated yet.
/// Phase 03 replaces this route with the actual home screen(s).
class _PendingHome extends StatelessWidget {
  const _PendingHome();

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Center(
        child: Text(
          'Screens pending — phase 03 will generate them.',
          style: Theme.of(context).textTheme.bodyLarge,
        ),
      ),
    );
  }
}
```

## pubspec requirement

`flutter_localizations` is not yet in `pubspec.yaml`. Before emitting, add it to `dependencies:`:

```yaml
  flutter_localizations:
    sdk: flutter
```

If the current `pubspec.yaml` already has it, skip. Do NOT add anything else — keep the dep set small.

## Banned

- Adding business logic to main.dart (runs once; keep to ProviderScope + runApp).
- Hardcoding colors in app.dart — theme comes from `AppTheme.light()`/`AppTheme.dark()`.
- Omitting the router stub — phase 03 assumes `lib/router/app_router.dart` exists and contains a `GoRouter` it can append to.

## Success Criteria

- `lib/main.dart`, `lib/app.dart`, `lib/router/app_router.dart` exist
- `dart analyze lib/main.dart lib/app.dart lib/router/app_router.dart` exits 0
- `flutter test` succeeds (even with zero tests — verifies the app compiles)
