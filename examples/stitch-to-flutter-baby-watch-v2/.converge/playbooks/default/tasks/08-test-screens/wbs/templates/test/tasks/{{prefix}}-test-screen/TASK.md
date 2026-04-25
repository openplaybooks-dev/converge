---
id: "{{taskId}}"
title: "Test: {{title}}"
description: "Widget test for {{widgetName}}Screen covering reference copy, @converge:element handlers, and loading/empty/error states."
references:
  - flutter-testing-apps
  - flutter-managing-state
dependencies:
  - "{{prevId}}"
tags:
  - tests
  - screen-{{screenId}}
inputs:
  - "{{screenPath}}"
  - "{{statesPath}}"
  - lib/providers/**/*.dart
  - lib/data/mock_data.dart
  - test/helpers/pump_app.dart
  - navigations.json
outputs:
  - "{{testPath}}"
checks:
  - id: test-file-exists
    cmd: "test -f {{testPath}}"
    description: "test file exists"
  - id: test-dart-valid
    cmd: "dart analyze {{testPath}}"
    description: "dart analyze passes on test file"
  - id: test-passes
    cmd: "flutter test {{testPath}}"
    description: "flutter test {{testPath}} exits 0"
  - id: test-has-marker-coverage
    cmd: "bash -c 'markers=$(grep -c \"@converge:element\" {{screenPath}} || echo 0); if [ \"$markers\" -eq 0 ]; then exit 0; fi; tests=$(grep -cE \"(tapAt|tap|ensureVisible)\" {{testPath}} || echo 0); test \"$tests\" -gt 0'"
    description: "if screen has markers, test taps at least one widget"
  - id: test-covers-three-states
    cmd: "bash -c 'grep -q \"LoadingState\" {{testPath}} && grep -q \"EmptyState\" {{testPath}} && grep -q \"ErrorState\" {{testPath}}'"
    description: "test references all three state widgets"
---

# Test: {{title}}

Emit `{{testPath}}` with a `group('{{widgetName}}Screen', …)` containing tests for:

1. **Happy path** — pumps the screen with mock providers populated from `lib/data/mock_data.dart`; asserts that headline copy and at least one structural widget from the reference are rendered.
2. **Marker handlers** — for each `@converge:element` in `{{screenPath}}`, taps the widget and asserts the expected side effect (provider method called, route pushed, dialog shown). Use `navigations.json` to resolve what each marker should do.
3. **Loading state** — overrides the primary provider with `AsyncValue.loading()`; asserts `{{widgetName}}LoadingState` is on screen.
4. **Empty state** — overrides provider with `AsyncValue.data(<empty collection>)`; asserts `{{widgetName}}EmptyState` is on screen.
5. **Error state** — overrides provider with `AsyncValue.error(Exception('boom'), StackTrace.empty)`; asserts `{{widgetName}}ErrorState` is on screen.

## Skeleton

```dart
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';
import 'package:mocktail/mocktail.dart';

import 'package:<package_name>/screens/{{snakeName}}/{{snakeName}}_screen.dart';
import 'package:<package_name>/screens/{{snakeName}}/{{snakeName}}_states.dart';
// import providers + models as needed

import '../../helpers/pump_app.dart';

void main() {
  group('{{widgetName}}Screen', () {
    testWidgets('renders happy-path content from mock data', (tester) async {
      await pumpApp(
        tester,
        const {{widgetName}}Screen(),
        overrides: [
          // <providerOverride>(mockBeaconsState)
        ],
      );
      // Reference-derived copy assertion. Pick 1-2 strings that appear in
      // the reference HTML and should be rendered by the screen.
      expect(find.text(/* reference headline */), findsOneWidget);
    });

    testWidgets('shows LoadingState when provider is loading', (tester) async {
      await pumpApp(
        tester,
        const {{widgetName}}Screen(),
        overrides: [
          // <provider>.overrideWith(() => const AsyncValue.loading()),
        ],
      );
      expect(find.byType({{widgetName}}LoadingState), findsOneWidget);
    });

    testWidgets('shows EmptyState when collection is empty', (tester) async {
      await pumpApp(
        tester,
        const {{widgetName}}Screen(),
        overrides: [
          // <provider>.overrideWith(() => AsyncValue.data([])),
        ],
      );
      expect(find.byType({{widgetName}}EmptyState), findsOneWidget);
    });

    testWidgets('shows ErrorState when provider errors', (tester) async {
      await pumpApp(
        tester,
        const {{widgetName}}Screen(),
        overrides: [
          // <provider>.overrideWith(() => AsyncValue.error(Exception('boom'), StackTrace.empty)),
        ],
      );
      expect(find.byType({{widgetName}}ErrorState), findsOneWidget);
    });

    // ── Marker handler tests ─────────────────────────────────────────
    // For each @converge:element in {{screenPath}}, add a testWidgets block:
    //
    // testWidgets('tapping <slug> triggers <expected action>', (tester) async {
    //   // set up overrides and a spy / mock on the expected provider method
    //   await pumpApp(tester, const {{widgetName}}Screen(), overrides: […]);
    //   await tester.tap(find.byKey(const Key('<slug>')));
    //   await tester.pumpAndSettle();
    //   verify(() => mock.method()).called(1);
    // });
  });
}
```

## Rules

- **Every marker in `{{screenPath}}` must have a corresponding tap test.** Parse markers from the Dart file; for each one, write a test that taps and verifies. Use `find.byKey(Key('<slug>'))` as the finder — requires 03-convert to emit `key: const Key('<slug>')` on marked widgets. If 03-convert did NOT emit keys, fall back to `find.byType(<widget>)` with a unique descendant-match or tap by text.
- **Use mocktail**, not `any()`-style fakes, for provider method spying.
- **Do not import** actual backend services. Overrides isolate the widget.
- **Keep the `package:<package_name>` string** in imports — fill with the actual package name from `pubspec.yaml`.

## Banned

- `testWidgets('it works', ...)` — every test name must describe the behavior.
- `expect(finder, findsWidgets)` when exactly one is expected — use `findsOneWidget`.
- Calling `tester.pump(Duration(seconds: 2))` instead of `pumpAndSettle()` for animations.
- Touching real SharedPreferences, HTTP, or platform channels.

## Success Criteria

- `{{testPath}}` exists and passes `dart analyze`
- `flutter test {{testPath}}` exits 0
- Every `@converge:element` in the screen has a corresponding tap test
- All three state widgets (Loading/Empty/Error) are referenced
