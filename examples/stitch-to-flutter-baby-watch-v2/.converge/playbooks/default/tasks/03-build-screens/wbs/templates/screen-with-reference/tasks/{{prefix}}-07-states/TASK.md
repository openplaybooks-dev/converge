---
id: "{{prefix}}-07-states"
title: "States: {{title}}"
description: "Add empty, loading, and error variants for {{title}} as a sibling file imported by the screen."
references:
  - flutter-riverpod-patterns
  - flutter-building-layouts
dependencies:
  - "{{prefix}}-06-lift"
tags:
  - states
  - screen-{{screenId}}
inputs:
  - "{{screenPath}}"
  - .stitch/system/DESIGN.md
  - .stitch/system/tokens.json
outputs:
  - "{{statesPath}}"
  - "{{screenPath}}"
checks:
  - id: states-file-exists
    cmd: "test -f {{statesPath}}"
    description: "states file exists"
  - id: states-dart-valid
    cmd: "dart analyze {{statesPath}}"
    description: "states file passes dart analyze"
  - id: screen-imports-states
    cmd: "grep -q '_states.dart' {{screenPath}}"
    description: "screen imports its states file"
  - id: states-has-empty
    cmd: "grep -qE 'class +{{widgetName}}EmptyState\\b' {{statesPath}}"
    description: "{{widgetName}}EmptyState widget defined"
  - id: states-has-loading
    cmd: "grep -qE 'class +{{widgetName}}LoadingState\\b' {{statesPath}}"
    description: "{{widgetName}}LoadingState widget defined"
  - id: states-has-error
    cmd: "grep -qE 'class +{{widgetName}}ErrorState\\b' {{statesPath}}"
    description: "{{widgetName}}ErrorState widget defined"
---

# States: {{title}}

Add empty, loading, and error variants to `{{screenId}}`. Emit them as three widgets in `{{statesPath}}` so the main screen can compose them based on provider `AsyncValue` state.

## Why

Production apps render something useful for every possible provider state. v1 generated "happy path" screens only. v2 ensures every screen has tested, designed empty / loading / error visuals.

## Inputs

- `{{screenPath}}` — the happy-path screen. Read it to learn which providers it will read (phase 05 will add those) and what layout to mirror in the states.
- `.stitch/system/DESIGN.md` — for tone of empty/error messages (nursery-like, calm, per the design system).
- `.stitch/system/tokens.json` — for spacing and semantic colors (peach for error, mint for "all good").

## Output: `{{statesPath}}`

```dart
import 'package:flutter/material.dart';

import '../../theme/app_theme.dart';
import '../../theme/app_spacing.dart';

/// Empty state for {{widgetName}}Screen.
///
/// Rendered when the screen's primary collection is empty (e.g. no beacons
/// paired, no events in history). Uses illustrated empty slot + CTA.
class {{widgetName}}EmptyState extends StatelessWidget {
  const {{widgetName}}EmptyState({
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

/// Loading state for {{widgetName}}Screen.
class {{widgetName}}LoadingState extends StatelessWidget {
  const {{widgetName}}LoadingState({super.key});

  @override
  Widget build(BuildContext context) {
    return const Center(
      child: CircularProgressIndicator.adaptive(),
    );
  }
}

/// Error state for {{widgetName}}Screen.
class {{widgetName}}ErrorState extends StatelessWidget {
  const {{widgetName}}ErrorState({
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

After emitting `{{statesPath}}`, modify `{{screenPath}}` to import it:

```dart
import '{{snakeName}}_states.dart';
```

If the screen reads a provider that phase 05 has already created (e.g. `ref.watch(beaconsProvider)`), wrap the body in:

```dart
body: ref.watch(beaconsProvider).when(
      data: (beacons) => beacons.isEmpty
          ? {{widgetName}}EmptyState(onPrimaryAction: () => /* nav to scanner */)
          : /* existing happy-path body */,
      loading: () => const {{widgetName}}LoadingState(),
      error: (e, _) => {{widgetName}}ErrorState(error: e, onRetry: () => ref.invalidate(beaconsProvider)),
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

- `{{statesPath}}` exists with three widget classes.
- `{{screenPath}}` imports `{{snakeName}}_states.dart`.
- `dart analyze` passes on both.
