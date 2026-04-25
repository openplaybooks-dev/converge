---
id: 003-07-states
title: "States: Home — Weak Signal"
description: "Add empty, loading, and error variants for Home — Weak Signal as a sibling file imported by the screen."
dependencies:
  - 003-06-lift
tags:
  - states
  - screen-home-weak
inputs:
  - lib/screens/home_weak/home_weak_screen.dart
  - .stitch/system/DESIGN.md
  - .stitch/system/tokens.json
outputs:
  - lib/screens/home_weak/home_weak_states.dart
  - lib/screens/home_weak/home_weak_screen.dart
checks:
  - id: states-file-exists
    description: states file exists
    cmd: test -f lib/screens/home_weak/home_weak_states.dart
  - id: states-dart-valid
    description: states file passes dart analyze
    cmd: dart analyze lib/screens/home_weak/home_weak_states.dart
  - id: screen-imports-states
    description: screen imports its states file
    cmd: "grep -q '_states.dart' lib/screens/home_weak/home_weak_screen.dart"
  - id: states-has-empty
    description: HomeWeakEmptyState widget defined
    cmd: "grep -qE 'class +HomeWeakEmptyState\\b' lib/screens/home_weak/home_weak_states.dart"
  - id: states-has-loading
    description: HomeWeakLoadingState widget defined
    cmd: "grep -qE 'class +HomeWeakLoadingState\\b' lib/screens/home_weak/home_weak_states.dart"
  - id: states-has-error
    description: HomeWeakErrorState widget defined
    cmd: "grep -qE 'class +HomeWeakErrorState\\b' lib/screens/home_weak/home_weak_states.dart"
vars:
  references: ["flutter-riverpod-patterns","flutter-building-layouts"]
  prefix: 003
  screenId: home-weak
  title: Home — Weak Signal
  widgetName: HomeWeak
  snakeName: home_weak
  route: /home
  screenPath: lib/screens/home_weak/home_weak_screen.dart
  widgetsJsonPath: .stitch/designs/home-weak/widgets.jsonl
  localWidgetsDir: lib/screens/home_weak/widgets
  screenTaskId: 003-home-weak
  specPath: .stitch/designs/home-weak/SPEC.md
  metaPath: .stitch/designs/home-weak/META.md
  designPath: .stitch/designs/home-weak/design.html
  linkedHtmlPath: .stitch/designs/home-weak/code.html
  statesPath: lib/screens/home_weak/home_weak_states.dart
  htmlReference: .stitch/references/babyguard_home_phase_2_weak_signal/code.html
  htmlReferenceInput: "  - \".stitch/references/babyguard_home_phase_2_weak_signal/code.html\"\n"
  screenshotReference: .stitch/references/babyguard_home_phase_2_weak_signal/screen.png
  screenshotReferenceInput: "  - \".stitch/references/babyguard_home_phase_2_weak_signal/screen.png\"\n"
  prevScreenLastId: 002-07-states
  variant: weak
  variantGroup: home
---

# States: Home — Weak Signal

Add empty, loading, and error variants to `home-weak`. Emit them as three widgets in `lib/screens/home_weak/home_weak_states.dart` so the main screen can compose them based on provider `AsyncValue` state.

## Why

Production apps render something useful for every possible provider state. v1 generated "happy path" screens only. v2 ensures every screen has tested, designed empty / loading / error visuals.

## Inputs

- `lib/screens/home_weak/home_weak_screen.dart` — the happy-path screen. Read it to learn which providers it will read (phase 05 will add those) and what layout to mirror in the states.
- `.stitch/system/DESIGN.md` — for tone of empty/error messages (nursery-like, calm, per the design system).
- `.stitch/system/tokens.json` — for spacing and semantic colors (peach for error, mint for "all good").

## Output: `lib/screens/home_weak/home_weak_states.dart`

```dart
import 'package:flutter/material.dart';

import '../../theme/app_theme.dart';
import '../../theme/app_spacing.dart';

/// Empty state for HomeWeakScreen.
///
/// Rendered when the screen's primary collection is empty (e.g. no beacons
/// paired, no events in history). Uses illustrated empty slot + CTA.
class HomeWeakEmptyState extends StatelessWidget {
  const HomeWeakEmptyState({
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

/// Loading state for HomeWeakScreen.
class HomeWeakLoadingState extends StatelessWidget {
  const HomeWeakLoadingState({super.key});

  @override
  Widget build(BuildContext context) {
    return const Center(
      child: CircularProgressIndicator.adaptive(),
    );
  }
}

/// Error state for HomeWeakScreen.
class HomeWeakErrorState extends StatelessWidget {
  const HomeWeakErrorState({
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

After emitting `lib/screens/home_weak/home_weak_states.dart`, modify `lib/screens/home_weak/home_weak_screen.dart` to import it:

```dart
import 'home_weak_states.dart';
```

If the screen reads a provider that phase 05 has already created (e.g. `ref.watch(beaconsProvider)`), wrap the body in:

```dart
body: ref.watch(beaconsProvider).when(
      data: (beacons) => beacons.isEmpty
          ? HomeWeakEmptyState(onPrimaryAction: () => /* nav to scanner */)
          : /* existing happy-path body */,
      loading: () => const HomeWeakLoadingState(),
      error: (e, _) => HomeWeakErrorState(error: e, onRetry: () => ref.invalidate(beaconsProvider)),
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

- `lib/screens/home_weak/home_weak_states.dart` exists with three widget classes.
- `lib/screens/home_weak/home_weak_screen.dart` imports `home_weak_states.dart`.
- `dart analyze` passes on both.
