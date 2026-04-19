---
id: 003-wire-interactions
title: "Wire Interactions — Buttons, Tabs, Forms Work"
description: Make all interactive elements functional — tabs, filters, buttons, forms, playback controls
references:
  - flutter-building-forms
  - flutter-managing-state
blocking: true
dependencies:
  - 002-wire-navigation
tags:
  - interactions
  - event-handlers
  - state
inputs:
  - .stitch/screens.json
  - lib/screens/**/*.dart
  - lib/providers/**/*.dart
outputs:
  - lib/screens/**/*.dart
checks:
  - id: no-noop-handlers
    cmd: "! grep -rqE 'onPressed: null[^,]' lib/screens/ lib/widgets/"
    description: No noop handlers remain (except intentionally disabled)
  - id: dart-analysis-valid
    cmd: dart analyze --no-fatal-infos lib/
    description: All code passes analysis
---

# Wire Interactions — Buttons, Tabs, Forms Work

Read **flutter-building-forms** for `Form`/`TextFormField` validation patterns (`GlobalKey<FormState>`, `validator` callbacks). Read **flutter-managing-state** for ephemeral state (`setState`) vs app state (Riverpod mutations via `ref.read(provider.notifier)`).

All interactive elements are functional. Tabs switch, filters filter, buttons trigger actions, forms update state.

For each screen:
1. Read the screen and its `widgets/` directory
2. Wire `TabBar`/`TabBarView` with `TabController`
3. Wire filter chips with local state (`useState` via hooks or `StatefulWidget`)
4. Wire buttons to provider actions or navigation
5. Wire playback controls to audio provider
6. Wire settings controls to reader settings provider

## State Patterns

```dart
// Local state with StatefulWidget
class _ScreenState extends State<Screen> {
  int _selectedTab = 0;
  String _selectedGenre = 'All';
  // ...
}

// Provider mutation
ref.read(libraryProvider.notifier).addToLibrary(novel);

// Toggle
ref.read(readerSettingsProvider.notifier).toggleDarkMode();
```

Do NOT add new widgets. Only modify existing ones.
