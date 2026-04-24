# Task: 03-build-screens/010-guardians/010-05-split/002-split-InviteGuardianButton

# Split: InviteGuardianButton

Extract the `InviteGuardianButton` widget from the screen into its own file.

## Steps

1. **Locate** — Find the widget subtree in `lib/screens/guardians/guardians_screen.dart` using grep string: `Mời người cùng theo dõi`
2. **Create file** — Write `lib/screens/guardians/widgets/invite_guardian_button.dart` with the extracted widget class
3. **Update screen** — Replace inline widget tree with `InviteGuardianButton()` and add import
4. **Verify** — Run `dart analyze` on both files

## Widget Template

```dart
import 'package:flutter/material.dart';

class InviteGuardianButton extends StatelessWidget {
  const InviteGuardianButton({super.key});

  @override
  Widget build(BuildContext context) {
    // ... extracted widget tree
  }
}
```