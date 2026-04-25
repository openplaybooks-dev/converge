---
id: 005-07-states
title: "States: Beacon Detail"
description: "Add empty, loading, and error variants for Beacon Detail as a sibling file imported by the screen."
dependencies:
  - 005-06-lift
tags:
  - states
  - screen-beacon-detail
inputs:
  - lib/screens/beacon_detail/beacon_detail_screen.dart
  - .stitch/system/DESIGN.md
  - .stitch/system/tokens.json
outputs:
  - lib/screens/beacon_detail/beacon_detail_states.dart
  - lib/screens/beacon_detail/beacon_detail_screen.dart
checks:
  - id: states-file-exists
    description: states file exists
    cmd: test -f lib/screens/beacon_detail/beacon_detail_states.dart
  - id: states-dart-valid
    description: states file passes dart analyze
    cmd: dart analyze lib/screens/beacon_detail/beacon_detail_states.dart
  - id: screen-imports-states
    description: screen imports its states file
    cmd: "grep -q '_states.dart' lib/screens/beacon_detail/beacon_detail_screen.dart"
  - id: states-has-empty
    description: BeaconDetailEmptyState widget defined
    cmd: "grep -qE 'class +BeaconDetailEmptyState\\b' lib/screens/beacon_detail/beacon_detail_states.dart"
  - id: states-has-loading
    description: BeaconDetailLoadingState widget defined
    cmd: "grep -qE 'class +BeaconDetailLoadingState\\b' lib/screens/beacon_detail/beacon_detail_states.dart"
  - id: states-has-error
    description: BeaconDetailErrorState widget defined
    cmd: "grep -qE 'class +BeaconDetailErrorState\\b' lib/screens/beacon_detail/beacon_detail_states.dart"
vars:
  references: ["flutter-riverpod-patterns","flutter-building-layouts"]
  prefix: 005
  screenId: beacon-detail
  title: Beacon Detail
  widgetName: BeaconDetail
  snakeName: beacon_detail
  route: /devices
  screenPath: lib/screens/beacon_detail/beacon_detail_screen.dart
  widgetsJsonPath: .stitch/designs/beacon-detail/widgets.jsonl
  localWidgetsDir: lib/screens/beacon_detail/widgets
  screenTaskId: 005-beacon-detail
  specPath: .stitch/designs/beacon-detail/SPEC.md
  metaPath: .stitch/designs/beacon-detail/META.md
  designPath: .stitch/designs/beacon-detail/design.html
  linkedHtmlPath: .stitch/designs/beacon-detail/code.html
  statesPath: lib/screens/beacon_detail/beacon_detail_states.dart
  htmlReference: .stitch/references/chi_ti_t_beacon_phase_2/code.html
  htmlReferenceInput: "  - \".stitch/references/chi_ti_t_beacon_phase_2/code.html\"\n"
  screenshotReference: .stitch/references/chi_ti_t_beacon_phase_2/screen.png
  screenshotReferenceInput: "  - \".stitch/references/chi_ti_t_beacon_phase_2/screen.png\"\n"
  prevScreenLastId: 004-07-states
  variant: 
  variantGroup: 
---

# States: Beacon Detail

Add empty, loading, and error variants to `beacon-detail`. Emit them as three widgets in `lib/screens/beacon_detail/beacon_detail_states.dart` so the main screen can compose them based on provider `AsyncValue` state.

## Why

Production apps render something useful for every possible provider state. v1 generated "happy path" screens only. v2 ensures every screen has tested, designed empty / loading / error visuals.

## Inputs

- `lib/screens/beacon_detail/beacon_detail_screen.dart` — the happy-path screen. Read it to learn which providers it will read (phase 05 will add those) and what layout to mirror in the states.
- `.stitch/system/DESIGN.md` — for tone of empty/error messages (nursery-like, calm, per the design system).
- `.stitch/system/tokens.json` — for spacing and semantic colors (peach for error, mint for "all good").

## Output: `lib/screens/beacon_detail/beacon_detail_states.dart`

```dart
import 'package:flutter/material.dart';

import '../../theme/app_theme.dart';
import '../../theme/app_spacing.dart';

/// Empty state for BeaconDetailScreen.
///
/// Rendered when the screen's primary collection is empty (e.g. no beacons
/// paired, no events in history). Uses illustrated empty slot + CTA.
class BeaconDetailEmptyState extends StatelessWidget {
  const BeaconDetailEmptyState({
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

/// Loading state for BeaconDetailScreen.
class BeaconDetailLoadingState extends StatelessWidget {
  const BeaconDetailLoadingState({super.key});

  @override
  Widget build(BuildContext context) {
    return const Center(
      child: CircularProgressIndicator.adaptive(),
    );
  }
}

/// Error state for BeaconDetailScreen.
class BeaconDetailErrorState extends StatelessWidget {
  const BeaconDetailErrorState({
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

After emitting `lib/screens/beacon_detail/beacon_detail_states.dart`, modify `lib/screens/beacon_detail/beacon_detail_screen.dart` to import it:

```dart
import 'beacon_detail_states.dart';
```

If the screen reads a provider that phase 05 has already created (e.g. `ref.watch(beaconsProvider)`), wrap the body in:

```dart
body: ref.watch(beaconsProvider).when(
      data: (beacons) => beacons.isEmpty
          ? BeaconDetailEmptyState(onPrimaryAction: () => /* nav to scanner */)
          : /* existing happy-path body */,
      loading: () => const BeaconDetailLoadingState(),
      error: (e, _) => BeaconDetailErrorState(error: e, onRetry: () => ref.invalidate(beaconsProvider)),
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

- `lib/screens/beacon_detail/beacon_detail_states.dart` exists with three widget classes.
- `lib/screens/beacon_detail/beacon_detail_screen.dart` imports `beacon_detail_states.dart`.
- `dart analyze` passes on both.
