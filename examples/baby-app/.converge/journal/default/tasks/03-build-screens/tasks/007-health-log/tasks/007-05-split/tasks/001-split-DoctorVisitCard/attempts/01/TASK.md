# Task: 03-build-screens/007-health-log/007-05-split/001-split-DoctorVisitCard

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