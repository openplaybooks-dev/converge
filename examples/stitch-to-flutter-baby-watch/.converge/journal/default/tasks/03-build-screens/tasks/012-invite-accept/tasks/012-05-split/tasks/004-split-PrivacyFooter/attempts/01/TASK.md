# Task: 03-build-screens/012-invite-accept/012-05-split/004-split-PrivacyFooter

# Split: PrivacyFooter

Extract the `PrivacyFooter` widget from the screen into its own file.

## Steps

1. **Locate** — Find the widget subtree in `lib/screens/invite_accept/invite_accept_screen.dart` using grep string: `// Privacy Footer`
2. **Create file** — Write `lib/screens/invite_accept/widgets/privacy_footer.dart` with the extracted widget class
3. **Update screen** — Replace inline widget tree with `PrivacyFooter()` and add import
4. **Verify** — Run `dart analyze` on both files

## Widget Template

```dart
import 'package:flutter/material.dart';

class PrivacyFooter extends StatelessWidget {
  const PrivacyFooter({super.key});

  @override
  Widget build(BuildContext context) {
    // ... extracted widget tree
  }
}
```