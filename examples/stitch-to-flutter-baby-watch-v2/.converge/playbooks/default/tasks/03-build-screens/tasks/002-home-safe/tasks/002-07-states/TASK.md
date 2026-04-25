---
id: 002-07-states
title: "States: Home — Safe"
description: "Add empty, loading, and error variants for Home — Safe as a sibling file imported by the screen."
dependencies:
  - 002-06-lift
tags:
  - states
  - screen-home-safe
inputs:
  - lib/screens/home_safe/home_safe_screen.dart
  - .stitch/system/DESIGN.md
  - .stitch/system/tokens.json
outputs:
  - lib/screens/home_safe/home_safe_states.dart
  - lib/screens/home_safe/home_safe_screen.dart
checks:
  - id: states-file-exists
    description: states file exists
    cmd: test -f lib/screens/home_safe/home_safe_states.dart
  - id: states-dart-valid
    description: states file passes dart analyze
    cmd: dart analyze lib/screens/home_safe/home_safe_states.dart
  - id: screen-imports-states
    description: screen imports its states file
    cmd: "grep -q '_states.dart' lib/screens/home_safe/home_safe_screen.dart"
  - id: states-has-empty
    description: HomeSafeEmptyState widget defined
    cmd: "grep -qE 'class +HomeSafeEmptyState\\b' lib/screens/home_safe/home_safe_states.dart"
  - id: states-has-loading
    description: HomeSafeLoadingState widget defined
    cmd: "grep -qE 'class +HomeSafeLoadingState\\b' lib/screens/home_safe/home_safe_states.dart"
  - id: states-has-error
    description: HomeSafeErrorState widget defined
    cmd: "grep -qE 'class +HomeSafeErrorState\\b' lib/screens/home_safe/home_safe_states.dart"
vars:
  references: ["flutter-riverpod-patterns","flutter-building-layouts"]
  prefix: 002
  screenId: home-safe
  title: Home — Safe
  widgetName: HomeSafe
  snakeName: home_safe
  route: /home
  screenPath: lib/screens/home_safe/home_safe_screen.dart
  widgetsJsonPath: .stitch/designs/home-safe/widgets.jsonl
  localWidgetsDir: lib/screens/home_safe/widgets
  screenTaskId: 002-home-safe
  specPath: .stitch/designs/home-safe/SPEC.md
  metaPath: .stitch/designs/home-safe/META.md
  designPath: .stitch/designs/home-safe/design.html
  linkedHtmlPath: .stitch/designs/home-safe/code.html
  statesPath: lib/screens/home_safe/home_safe_states.dart
  htmlReference: .stitch/references/babyguard_home_phase_2_safe_updated/code.html
  htmlReferenceInput: "  - \".stitch/references/babyguard_home_phase_2_safe_updated/code.html\"\n"
  screenshotReference: .stitch/references/babyguard_home_phase_2_safe_updated/screen.png
  screenshotReferenceInput: "  - \".stitch/references/babyguard_home_phase_2_safe_updated/screen.png\"\n"
  prevScreenLastId: 001-07-states
  variant: safe
  variantGroup: home
---

# States: Home — Safe

Add empty, loading, and error variants to `home-safe`. Emit them as three widgets in `lib/screens/home_safe/home_safe_states.dart` so the main screen can compose them based on provider `AsyncValue` state.

## Why

Production apps render something useful for every possible provider state. v1 generated "happy path" screens only. v2 ensures every screen has tested, designed empty / loading / error visuals.

## Inputs

- `lib/screens/home_safe/home_safe_screen.dart` — the happy-path screen. Read it to learn which providers it will read (phase 05 will add those) and what layout to mirror in the states.
- `.stitch/system/DESIGN.md` — for tone of empty/error messages (nursery-like, calm, per the design system).
- `.stitch/system/tokens.json` — for spacing and semantic colors (peach for error, mint for "all good").

## Output: `lib/screens/home_safe/home_safe_states.dart`

```dart
import 'package:flutter/material.dart';

import '../../theme/app_theme.dart';
import '../../theme/app_spacing.dart';

/// Empty state for HomeSafeScreen.
///
/// Rendered when the screen's primary collection is empty (e.g. no beacons
/// paired, no events in history). Uses illustrated empty slot + CTA.
class HomeSafeEmptyState extends StatelessWidget {
  const HomeSafeEmptyState({
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

/// Loading state for HomeSafeScreen.
class HomeSafeLoadingState extends StatelessWidget {
  const HomeSafeLoadingState({super.key});

  @override
  Widget build(BuildContext context) {
    return const Center(
      child: CircularProgressIndicator.adaptive(),
    );
  }
}

/// Error state for HomeSafeScreen.
class HomeSafeErrorState extends StatelessWidget {
  const HomeSafeErrorState({
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

After emitting `lib/screens/home_safe/home_safe_states.dart`, modify `lib/screens/home_safe/home_safe_screen.dart` to import it:

```dart
import 'home_safe_states.dart';
```

If the screen reads a provider that phase 05 has already created (e.g. `ref.watch(beaconsProvider)`), wrap the body in:

```dart
body: ref.watch(beaconsProvider).when(
      data: (beacons) => beacons.isEmpty
          ? HomeSafeEmptyState(onPrimaryAction: () => /* nav to scanner */)
          : /* existing happy-path body */,
      loading: () => const HomeSafeLoadingState(),
      error: (e, _) => HomeSafeErrorState(error: e, onRetry: () => ref.invalidate(beaconsProvider)),
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

- `lib/screens/home_safe/home_safe_states.dart` exists with three widget classes.
- `lib/screens/home_safe/home_safe_screen.dart` imports `home_safe_states.dart`.
- `dart analyze` passes on both.
