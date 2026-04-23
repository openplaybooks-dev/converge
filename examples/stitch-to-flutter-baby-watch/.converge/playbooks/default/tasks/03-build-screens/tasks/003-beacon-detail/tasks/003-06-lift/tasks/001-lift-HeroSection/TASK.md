---
id: 001-lift-HeroSection
title: "Lift: HeroSection"
description: Move HeroSection from local widgets to lib/widgets/
tags:
  - lift
  - widget
inputs:
  - lib/screens/beacon_detail/widgets/hero_section.dart
outputs:
  - lib/widgets/hero_section.dart
checks:
  - id: widget-exists
    description: Shared widget file exists
    cmd: test -f lib/widgets/hero_section.dart
  - id: dart-valid
    description: Dart analysis passes
    cmd: flutter analyze lib/widgets/hero_section.dart
vars:
  widgetName: HeroSection
  snakeName: hero_section
  screenId: beacon-detail
  screenTitle: null
  localWidgetPath: lib/screens/beacon_detail/widgets/hero_section.dart
  sharedWidgetPath: lib/widgets/hero_section.dart
  localWidgetsDir: lib/screens/beacon_detail/widgets
  screenPath: lib/screens/beacon_detail/beacon_detail_screen.dart
  subtaskId: 001-lift-HeroSection
---

# Lift: HeroSection

Move `HeroSection` from local screen widgets to the shared widgets directory.

## Steps

1. **Move file** — `lib/screens/beacon_detail/widgets/hero_section.dart` → `lib/widgets/hero_section.dart`
2. **Update package import** — Change relative import to package import: `package:folio/widgets/hero_section.dart`
3. **Update all references** — Find all files importing the old path and update them
4. **Verify** — Run `dart analyze` on affected files
