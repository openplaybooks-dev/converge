---
id: 001-split-DoctorVisitCard
title: "Split: DoctorVisitCard"
description: Extract DoctorVisitCard widget from  screen
tags:
  - split
  - widget
inputs:
  - lib/screens/health_log/health_log_screen.dart
outputs:
  - lib/screens/health_log/widgets/doctor_visit_card.dart
checks:
  - id: widget-exists
    description: Widget file exists
    cmd: test -f lib/screens/health_log/widgets/doctor_visit_card.dart
  - id: dart-valid
    description: Dart analysis passes
    cmd: dart analyze lib/screens/health_log/widgets/doctor_visit_card.dart
vars:
  name: DoctorVisitCard
  grep: "Doctor visit on ${visit.date}"
  description: "Card displaying a single doctor visit entry with date, doctor name, summary, and notes"
  shared: false
  widgetName: DoctorVisitCard
  grepString: "Doctor visit on ${visit.date}"
  widgetPath: lib/screens/health_log/widgets/doctor_visit_card.dart
  localWidgetsDir: lib/screens/health_log/widgets
  screenPath: lib/screens/health_log/health_log_screen.dart
  screenId: health-log
  screenTitle: null
  subtaskId: 001-split-DoctorVisitCard
---

# Split: DoctorVisitCard

Extract the `DoctorVisitCard` widget from the screen into its own file.

## Steps

1. **Locate** — Find the widget subtree in `lib/screens/health_log/health_log_screen.dart` using grep string: `Doctor visit on ${visit.date}`
2. **Create file** — Write `lib/screens/health_log/widgets/doctor_visit_card.dart` with the extracted widget class
3. **Update screen** — Replace inline widget tree with `DoctorVisitCard()` and add import
4. **Verify** — Run `dart analyze` on both files

## Widget Template

```dart
import 'package:flutter/material.dart';

class DoctorVisitCard extends StatelessWidget {
  const DoctorVisitCard({super.key});

  @override
  Widget build(BuildContext context) {
    // ... extracted widget tree
  }
}
```
