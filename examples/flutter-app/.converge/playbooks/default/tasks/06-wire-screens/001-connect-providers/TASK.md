---
id: 001-connect-providers
title: "Connect Providers — Get Data Flowing"
description: Import Riverpod providers into every screen, replace hardcoded data with provider state
skill: flutter-managing-state
blocking: true
tags:
  - providers
  - riverpod
  - data-binding
inputs:
  - .stitch/screens.json
  - lib/providers/**/*.dart
outputs:
  - lib/screens/**/*.dart
checks:
  - id: screens-use-consumer-widget
    cmd: "grep -r 'ConsumerWidget' lib/screens/ --include='*.dart' | wc -l | awk '{if ($1 >= 3) exit 0; exit 1}'"
    description: At least 3 screens use ConsumerWidget
  - id: screens-watch-providers
    cmd: "grep -r 'ref.watch' lib/screens/ --include='*.dart' | wc -l | awk '{if ($1 >= 3) exit 0; exit 1}'"
    description: At least 3 screens use ref.watch to read providers
  - id: dart-analysis-valid
    cmd: dart analyze lib/
    description: All code passes analysis
---

# Connect Providers — Get Data Flowing

Read the **flutter-managing-state** skill for state architecture patterns — ephemeral vs app state, unidirectional data flow, and `ConsumerWidget` consumption patterns.

Replace hardcoded data in every screen with Riverpod provider state. No new features — just swap the data source.

For each screen:
1. Convert `StatelessWidget` to `ConsumerWidget` (or use `ConsumerStatefulWidget` if needed)
2. Import relevant providers
3. Use `ref.watch(provider)` to read state
4. Handle `AsyncValue` states: `.when(data:, loading:, error:)`
5. Replace hardcoded strings/arrays with provider state
6. Pass entity data as props to child widgets

## Example

```dart
class HomeFeedScreen extends ConsumerWidget {
  const HomeFeedScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final novels = ref.watch(novelsProvider);
    return novels.when(
      data: (data) => ListView.builder(...),
      loading: () => const Center(child: CircularProgressIndicator()),
      error: (e, st) => Center(child: Text('Error: $e')),
    );
  }
}
```

Do NOT change navigation or wire buttons/tabs/interactions.
