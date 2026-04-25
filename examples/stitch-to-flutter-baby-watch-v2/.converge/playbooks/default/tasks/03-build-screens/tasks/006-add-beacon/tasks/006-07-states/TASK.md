---
id: 006-07-states
title: "States: Add Beacon"
description: "Add empty, loading, and error variants for Add Beacon as a sibling file imported by the screen."
dependencies:
  - 006-06-lift
tags:
  - states
  - screen-add-beacon
inputs:
  - lib/screens/add_beacon/add_beacon_screen.dart
  - .stitch/system/DESIGN.md
  - .stitch/system/tokens.json
outputs:
  - lib/screens/add_beacon/add_beacon_states.dart
  - lib/screens/add_beacon/add_beacon_screen.dart
checks:
  - id: states-file-exists
    description: states file exists
    cmd: test -f lib/screens/add_beacon/add_beacon_states.dart
  - id: states-dart-valid
    description: states file passes dart analyze
    cmd: dart analyze lib/screens/add_beacon/add_beacon_states.dart
  - id: screen-imports-states
    description: screen imports its states file
    cmd: "grep -q '_states.dart' lib/screens/add_beacon/add_beacon_screen.dart"
  - id: states-has-empty
    description: AddBeaconEmptyState widget defined
    cmd: "grep -qE 'class +AddBeaconEmptyState\\b' lib/screens/add_beacon/add_beacon_states.dart"
  - id: states-has-loading
    description: AddBeaconLoadingState widget defined
    cmd: "grep -qE 'class +AddBeaconLoadingState\\b' lib/screens/add_beacon/add_beacon_states.dart"
  - id: states-has-error
    description: AddBeaconErrorState widget defined
    cmd: "grep -qE 'class +AddBeaconErrorState\\b' lib/screens/add_beacon/add_beacon_states.dart"
vars:
  references: ["flutter-riverpod-patterns","flutter-building-layouts"]
  prefix: 006
  screenId: add-beacon
  title: Add Beacon
  widgetName: AddBeacon
  snakeName: add_beacon
  route: /devices/add
  screenPath: lib/screens/add_beacon/add_beacon_screen.dart
  widgetsJsonPath: .stitch/designs/add-beacon/widgets.jsonl
  localWidgetsDir: lib/screens/add_beacon/widgets
  screenTaskId: 006-add-beacon
  specPath: .stitch/designs/add-beacon/SPEC.md
  metaPath: .stitch/designs/add-beacon/META.md
  designPath: .stitch/designs/add-beacon/design.html
  linkedHtmlPath: .stitch/designs/add-beacon/code.html
  statesPath: lib/screens/add_beacon/add_beacon_states.dart
  htmlReference: .stitch/references/th_m_beacon_phase_2/code.html
  htmlReferenceInput: "  - \".stitch/references/th_m_beacon_phase_2/code.html\"\n"
  screenshotReference: .stitch/references/th_m_beacon_phase_2/screen.png
  screenshotReferenceInput: "  - \".stitch/references/th_m_beacon_phase_2/screen.png\"\n"
  prevScreenLastId: 005-07-states
  variant: 
  variantGroup: 
---

# States: Add Beacon

Add empty, loading, and error variants to `add-beacon`. Emit them as three widgets in `lib/screens/add_beacon/add_beacon_states.dart` so the main screen can compose them based on provider `AsyncValue` state.

## Why

Production apps render something useful for every possible provider state. v1 generated "happy path" screens only. v2 ensures every screen has tested, designed empty / loading / error visuals.

## Inputs

- `lib/screens/add_beacon/add_beacon_screen.dart` — the happy-path screen. Read it to learn which providers it will read (phase 05 will add those) and what layout to mirror in the states.
- `.stitch/system/DESIGN.md` — for tone of empty/error messages (nursery-like, calm, per the design system).
- `.stitch/system/tokens.json` — for spacing and semantic colors (peach for error, mint for "all good").

## Output: `lib/screens/add_beacon/add_beacon_states.dart`

```dart
import 'package:flutter/material.dart';

import '../../theme/app_theme.dart';
import '../../theme/app_spacing.dart';

/// Empty state for AddBeaconScreen.
///
/// Rendered when the screen's primary collection is empty (e.g. no beacons
/// paired, no events in history). Uses illustrated empty slot + CTA.
class AddBeaconEmptyState extends StatelessWidget {
  const AddBeaconEmptyState({
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

/// Loading state for AddBeaconScreen.
class AddBeaconLoadingState extends StatelessWidget {
  const AddBeaconLoadingState({super.key});

  @override
  Widget build(BuildContext context) {
    return const Center(
      child: CircularProgressIndicator.adaptive(),
    );
  }
}

/// Error state for AddBeaconScreen.
class AddBeaconErrorState extends StatelessWidget {
  const AddBeaconErrorState({
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

After emitting `lib/screens/add_beacon/add_beacon_states.dart`, modify `lib/screens/add_beacon/add_beacon_screen.dart` to import it:

```dart
import 'add_beacon_states.dart';
```

If the screen reads a provider that phase 05 has already created (e.g. `ref.watch(beaconsProvider)`), wrap the body in:

```dart
body: ref.watch(beaconsProvider).when(
      data: (beacons) => beacons.isEmpty
          ? AddBeaconEmptyState(onPrimaryAction: () => /* nav to scanner */)
          : /* existing happy-path body */,
      loading: () => const AddBeaconLoadingState(),
      error: (e, _) => AddBeaconErrorState(error: e, onRetry: () => ref.invalidate(beaconsProvider)),
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

- `lib/screens/add_beacon/add_beacon_states.dart` exists with three widget classes.
- `lib/screens/add_beacon/add_beacon_screen.dart` imports `add_beacon_states.dart`.
- `dart analyze` passes on both.
