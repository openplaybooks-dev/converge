# Task: 03-build-screens/012-invite-accept/012-05-split/002-split-TrustNotesContainer

# Split: TrustNotesContainer

Extract the `TrustNotesContainer` widget from the screen into its own file.

## Steps

1. **Locate** — Find the widget subtree in `lib/screens/invite_accept/invite_accept_screen.dart` using grep string: `// Trust Notes`
2. **Create file** — Write `lib/screens/invite_accept/widgets/trust_notes_container.dart` with the extracted widget class
3. **Update screen** — Replace inline widget tree with `TrustNotesContainer()` and add import
4. **Verify** — Run `dart analyze` on both files

## Widget Template

```dart
import 'package:flutter/material.dart';

class TrustNotesContainer extends StatelessWidget {
  const TrustNotesContainer({super.key});

  @override
  Widget build(BuildContext context) {
    // ... extracted widget tree
  }
}
```