# Task: 03-build-screens/012-invite-accept/012-05-split/001-split-PulseAvatarBadge

# Split: PulseAvatarBadge

Extract the `PulseAvatarBadge` widget from the screen into its own file.

## Steps

1. **Locate** — Find the widget subtree in `lib/screens/invite_accept/invite_accept_screen.dart` using grep string: `AnimatedBuilder\n.*animation: _pulseAnimation`
2. **Create file** — Write `lib/screens/invite_accept/widgets/pulse_avatar_badge.dart` with the extracted widget class
3. **Update screen** — Replace inline widget tree with `PulseAvatarBadge()` and add import
4. **Verify** — Run `dart analyze` on both files

## Widget Template

```dart
import 'package:flutter/material.dart';

class PulseAvatarBadge extends StatelessWidget {
  const PulseAvatarBadge({super.key});

  @override
  Widget build(BuildContext context) {
    // ... extracted widget tree
  }
}
```