---
id: 004-07-states
title: "States: Home — Alert"
description: "Add empty, loading, and error variants for Home — Alert as a sibling file imported by the screen."
dependencies:
  - 004-06-lift
tags:
  - states
  - screen-home-alert
inputs:
  - lib/screens/home_alert/home_alert_screen.dart
  - .stitch/system/DESIGN.md
  - .stitch/system/tokens.json
outputs:
  - lib/screens/home_alert/home_alert_states.dart
  - lib/screens/home_alert/home_alert_screen.dart
checks:
  - id: states-file-exists
    description: states file exists
    cmd: test -f lib/screens/home_alert/home_alert_states.dart
  - id: states-dart-valid
    description: states file passes dart analyze
    cmd: dart analyze lib/screens/home_alert/home_alert_states.dart
  - id: screen-imports-states
    description: screen imports its states file
    cmd: "grep -q '_states.dart' lib/screens/home_alert/home_alert_screen.dart"
  - id: states-has-empty
    description: HomeAlertEmptyState widget defined
    cmd: "grep -qE 'class +HomeAlertEmptyState\\b' lib/screens/home_alert/home_alert_states.dart"
  - id: states-has-loading
    description: HomeAlertLoadingState widget defined
    cmd: "grep -qE 'class +HomeAlertLoadingState\\b' lib/screens/home_alert/home_alert_states.dart"
  - id: states-has-error
    description: HomeAlertErrorState widget defined
    cmd: "grep -qE 'class +HomeAlertErrorState\\b' lib/screens/home_alert/home_alert_states.dart"
vars:
  references: ["flutter-riverpod-patterns","flutter-building-layouts"]
  prefix: 004
  screenId: home-alert
  title: Home — Alert
  widgetName: HomeAlert
  snakeName: home_alert
  route: /home
  screenPath: lib/screens/home_alert/home_alert_screen.dart
  widgetsJsonPath: .stitch/designs/home-alert/widgets.jsonl
  localWidgetsDir: lib/screens/home_alert/widgets
  screenTaskId: 004-home-alert
  specPath: .stitch/designs/home-alert/SPEC.md
  metaPath: .stitch/designs/home-alert/META.md
  designPath: .stitch/designs/home-alert/design.html
  linkedHtmlPath: .stitch/designs/home-alert/code.html
  statesPath: lib/screens/home_alert/home_alert_states.dart
  htmlReference: .stitch/references/babyguard_home_phase_2_alert/code.html
  htmlReferenceInput: "  - \".stitch/references/babyguard_home_phase_2_alert/code.html\"\n"
  screenshotReference: .stitch/references/babyguard_home_phase_2_alert/screen.png
  screenshotReferenceInput: "  - \".stitch/references/babyguard_home_phase_2_alert/screen.png\"\n"
  prevScreenLastId: 003-07-states
  variant: alert
  variantGroup: home
---

# States: Home — Alert

Add empty, loading, and error variants to `home-alert`. Emit them as three widgets in `lib/screens/home_alert/home_alert_states.dart` so the main screen can compose them based on provider `AsyncValue` state.

## Why

Production apps render something useful for every possible provider state. v1 generated "happy path" screens only. v2 ensures every screen has tested, designed empty / loading / error visuals.

## Inputs

- `lib/screens/home_alert/home_alert_screen.dart` — the happy-path screen. Read it to learn which providers it will read (phase 05 will add those) and what layout to mirror in the states.
- `.stitch/system/DESIGN.md` — for tone of empty/error messages (nursery-like, calm, per the design system).
- `.stitch/system/tokens.json` — for spacing and semantic colors (peach for error, mint for "all good").

## Output: `lib/screens/home_alert/home_alert_states.dart`

```dart
import 'package:flutter/material.dart';

import '../../theme/app_theme.dart';
import '../../theme/app_spacing.dart';

/// Empty state for HomeAlertScreen.
///
/// Rendered when the screen's primary collection is empty (e.g. no beacons
/// paired, no events in history). Uses illustrated empty slot + CTA.
class HomeAlertEmptyState extends StatelessWidget {
  const HomeAlertEmptyState({
    super.key,
    this.onPrimaryAction,
    this.primaryActionLabel,
  });

  final VoidCallback? onPrimaryAction;
  final String? primaryActionLabel;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(AppSpacing.lg),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(
              Icons.inbox_outlined,
              size: 64,
              color: theme.colorScheme.onSurfaceVariant,
            ),
            const SizedBox(height: AppSpacing.md),
            Text(
              /* localized empty headline suited to this screen */,
              style: theme.textTheme.titleLarge,
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: AppSpacing.sm),
            Text(
              /* one-sentence explanation suited to this screen */,
              style: theme.textTheme.bodyMedium,
              textAlign: TextAlign.center,
            ),
            if (onPrimaryAction != null) ...[
              const SizedBox(height: AppSpacing.lg),
              FilledButton(
                onPressed: onPrimaryAction,
                child: Text(primaryActionLabel ?? ''),
              ),
            ],
          ],
        ),
      ),
    );
  }
}

/// Loading state for HomeAlertScreen.
class HomeAlertLoadingState extends StatelessWidget {
  const HomeAlertLoadingState({super.key});

  @override
  Widget build(BuildContext context) {
    return const Center(
      child: CircularProgressIndicator.adaptive(),
    );
  }
}

/// Error state for HomeAlertScreen.
class HomeAlertErrorState extends StatelessWidget {
  const HomeAlertErrorState({
    super.key,
    required this.error,
    this.onRetry,
  });

  final Object error;
  final VoidCallback? onRetry;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final appSemantic = theme.extension<AppSemanticColors>()!;
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(AppSpacing.lg),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(
              Icons.error_outline,
              size: 64,
              color: theme.colorScheme.error,
            ),
            const SizedBox(height: AppSpacing.md),
            Text(
              /* calm error headline (e.g. "Something went sideways") */,
              style: theme.textTheme.titleLarge,
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: AppSpacing.sm),
            Text(
              error.toString(),
              style: theme.textTheme.bodySmall,
              textAlign: TextAlign.center,
            ),
            if (onRetry != null) ...[
              const SizedBox(height: AppSpacing.lg),
              FilledButton.tonal(
                onPressed: onRetry,
                child: const Text('Try again'),
              ),
            ],
          ],
        ),
      ),
    );
  }
}
```

## Per-screen customization

Before emitting, think about this specific screen's semantics:

- **What is empty?** For `beacon-scanner` empty = no devices found. For `history` empty = no events yet. For `safe-zones` empty = no zones defined. Write the empty headline + body + CTA to match.
- **Is loading infrequent?** Most screens load on mount. Loading is brief — don't over-design.
- **Is error likely?** For screens that read from background scan providers, BLE errors are real. For pure local-data screens, errors are rare.

Localize copy to match the reference's locale (Vietnamese when references are in Vietnamese).

## Update the screen file

After emitting `lib/screens/home_alert/home_alert_states.dart`, modify `lib/screens/home_alert/home_alert_screen.dart` to import it:

```dart
import 'home_alert_states.dart';
```

If the screen reads a provider that phase 05 has already created (e.g. `ref.watch(beaconsProvider)`), wrap the body in:

```dart
body: ref.watch(beaconsProvider).when(
      data: (beacons) => beacons.isEmpty
          ? HomeAlertEmptyState(onPrimaryAction: () => /* nav to scanner */)
          : /* existing happy-path body */,
      loading: () => const HomeAlertLoadingState(),
      error: (e, _) => HomeAlertErrorState(error: e, onRetry: () => ref.invalidate(beaconsProvider)),
    ),
```

If phase 05 hasn't created the provider yet (this screen runs before 05 is fully done), leave a comment in the screen:

```dart
// TODO(phase-05): wrap body in ref.watch(<provider>).when(...) once provider exists.
```

…and still import the states file so they're ready to be used.

## Banned

- Placeholders like "Lorem ipsum" in copy.
- Hardcoded colors — use `theme.colorScheme` and `appSemantic`.
- Empty/Error state without a retry or CTA where action makes sense.

## Success Criteria

- `lib/screens/home_alert/home_alert_states.dart` exists with three widget classes.
- `lib/screens/home_alert/home_alert_screen.dart` imports `home_alert_states.dart`.
- `dart analyze` passes on both.
