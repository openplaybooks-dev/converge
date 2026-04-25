---
id: "{{taskId}}"
title: "Test: overlay {{title}}"
description: "Widget test for the {{widgetName}} overlay — pumps it in a Scaffold harness, asserts content, tests markers."
references:
  - flutter-testing-apps
dependencies:
  - "{{prevId}}"
tags:
  - tests
  - overlay-{{overlayId}}
inputs:
  - "{{widgetPath}}"
  - lib/providers/**/*.dart
  - lib/data/mock_data.dart
  - test/helpers/pump_app.dart
outputs:
  - "{{testPath}}"
checks:
  - id: test-file-exists
    cmd: "test -f {{testPath}}"
    description: "overlay test file exists"
  - id: test-dart-valid
    cmd: "dart analyze {{testPath}}"
    description: "dart analyze passes"
  - id: test-passes
    cmd: "flutter test {{testPath}}"
    description: "flutter test exits 0"
---

# Test: overlay {{title}}

Emit `{{testPath}}` that pumps the `{{widgetName}}` overlay widget inside a harness Scaffold. Since overlays are typically invoked via `showModalBottomSheet` / `showDialog`, test **two ways**:

### Path A — direct widget pump (unit-style)

Pump the overlay widget directly inside a `Scaffold`:

```dart
testWidgets('renders overlay content', (tester) async {
  await pumpWidget(
    tester,
    const {{widgetName}}(),
    overrides: [/* provider overrides */],
  );
  expect(find.text(/* reference headline */), findsOneWidget);
});
```

### Path B — invocation-style (integration-ish)

Pump a host widget that invokes `showModalBottomSheet` / `showDialog` with `{{widgetName}}` and assert the overlay appears:

```dart
testWidgets('shows as {{overlayType}} when triggered', (tester) async {
  await pumpApp(
    tester,
    Builder(builder: (context) => Scaffold(
      body: Center(
        child: FilledButton(
          onPressed: () => /* show{{overlayType}} with {{widgetName}}() */,
          child: const Text('open'),
        ),
      ),
    )),
  );
  await tester.tap(find.text('open'));
  await tester.pumpAndSettle();
  expect(find.byType({{widgetName}}), findsOneWidget);
});
```

### Marker handlers

For each `@converge:element` in `{{widgetPath}}`, add a tap test that verifies the expected side effect (close the overlay, call a provider method, emit a result via `Navigator.pop(context, value)`).

## Rules

- Match the overlay invocation to `overlayType` from the screens.json entry: `showModalBottomSheet` for `bottom-sheet`, `showDialog` for `dialog`, inline mount for `persistent-bar`.
- Do NOT mount the parent screen. Test the overlay in isolation.
- If the overlay reads providers, override them with `ProviderScope` overrides passed to `pumpApp`/`pumpWidget`.

## Success Criteria

- `{{testPath}}` exists, passes `dart analyze`, and `flutter test {{testPath}}` exits 0
- At least one direct-pump test and one invocation test
- Every `@converge:element` marker has a tap test
