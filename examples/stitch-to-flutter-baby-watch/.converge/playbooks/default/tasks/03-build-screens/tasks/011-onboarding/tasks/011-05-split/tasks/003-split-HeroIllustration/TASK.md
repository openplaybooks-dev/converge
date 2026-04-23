---
id: 003-split-HeroIllustration
title: "Split: HeroIllustration"
description: Extract HeroIllustration widget from  screen
tags:
  - split
  - widget
inputs:
  - lib/screens/onboarding/onboarding_screen.dart
outputs:
  - lib/screens/onboarding/widgets/hero_illustration.dart
checks:
  - id: widget-exists
    description: Widget file exists
    cmd: test -f lib/screens/onboarding/widgets/hero_illustration.dart
  - id: dart-valid
    description: Dart analysis passes
    cmd: flutter analyze lib/screens/onboarding/widgets/hero_illustration.dart
vars:
  name: HeroIllustration
  grep: "Image.network('https://picsum.photos/seed/superkid/200/200'"
  description: Circular hero image container with stacked network image
  shared: false
  widgetName: HeroIllustration
  grepString: "Image.network('https://picsum.photos/seed/superkid/200/200'"
  widgetPath: lib/screens/onboarding/widgets/hero_illustration.dart
  localWidgetsDir: lib/screens/onboarding/widgets
  screenPath: lib/screens/onboarding/onboarding_screen.dart
  screenId: onboarding
  screenTitle: null
  subtaskId: 003-split-HeroIllustration
---

# Split: HeroIllustration

Extract the `HeroIllustration` widget from the screen into its own file.

## Steps

1. **Locate** — Find the widget subtree in `lib/screens/onboarding/onboarding_screen.dart` using grep string: `Image.network('https://picsum.photos/seed/superkid/200/200'`
2. **Create file** — Write `lib/screens/onboarding/widgets/hero_illustration.dart` with the extracted widget class
3. **Update screen** — Replace inline widget tree with `HeroIllustration()` and add import
4. **Verify** — Run `dart analyze` on both files

## Widget Template

```dart
import 'package:flutter/material.dart';

class HeroIllustration extends StatelessWidget {
  const HeroIllustration({super.key});

  @override
  Widget build(BuildContext context) {
    // ... extracted widget tree
  }
}
```
