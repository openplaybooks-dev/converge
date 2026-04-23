---
id: 001-split-HeroSection
title: "Split: HeroSection"
description: Extract HeroSection widget from  screen
tags:
  - split
  - widget
inputs:
  - lib/screens/beacon_detail/beacon_detail_screen.dart
outputs:
  - lib/screens/beacon_detail/widgets/hero_section.dart
checks:
  - id: widget-exists
    description: Widget file exists
    cmd: test -f lib/screens/beacon_detail/widgets/hero_section.dart
  - id: dart-valid
    description: Dart analysis passes
    cmd: flutter analyze lib/screens/beacon_detail/widgets/hero_section.dart
vars:
  name: HeroSection
  grep: "Container(\\n                  width: 80,\\n                  height: 80,\n                  decoration: BoxDecoration(\\n                    color: const Color(0xFFCDE3DC)"
  description: Avatar with name and beacon description
  shared: true
  widgetName: HeroSection
  grepString: "Container(\\n                  width: 80,\\n                  height: 80,\n                  decoration: BoxDecoration(\\n                    color: const Color(0xFFCDE3DC)"
  widgetPath: lib/screens/beacon_detail/widgets/hero_section.dart
  localWidgetsDir: lib/screens/beacon_detail/widgets
  screenPath: lib/screens/beacon_detail/beacon_detail_screen.dart
  screenId: beacon-detail
  screenTitle: null
  subtaskId: 001-split-HeroSection
---

# Split: HeroSection

Extract the `HeroSection` widget from the screen into its own file.

## Steps

1. **Locate** — Find the widget subtree in `lib/screens/beacon_detail/beacon_detail_screen.dart` using grep string: `Container(\n                  width: 80,\n                  height: 80,
                  decoration: BoxDecoration(\n                    color: const Color(0xFFCDE3DC)`
2. **Create file** — Write `lib/screens/beacon_detail/widgets/hero_section.dart` with the extracted widget class
3. **Update screen** — Replace inline widget tree with `HeroSection()` and add import
4. **Verify** — Run `dart analyze` on both files

## Widget Template

```dart
import 'package:flutter/material.dart';

class HeroSection extends StatelessWidget {
  const HeroSection({super.key});

  @override
  Widget build(BuildContext context) {
    // ... extracted widget tree
  }
}
```
