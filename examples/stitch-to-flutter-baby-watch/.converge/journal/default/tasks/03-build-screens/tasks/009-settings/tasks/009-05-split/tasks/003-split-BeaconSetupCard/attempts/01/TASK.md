# Task: 03-build-screens/009-settings/009-05-split/003-split-BeaconSetupCard

# Split: BeaconSetupCard

Extract the `BeaconSetupCard` widget from the screen into its own file.

## Steps

1. **Locate** — Find the widget subtree in `lib/screens/settings/settings_screen.dart` using grep string: `RSSI THRESHOLD`
2. **Create file** — Write `lib/screens/settings/widgets/beacon_setup_card.dart` with the extracted widget class
3. **Update screen** — Replace inline widget tree with `BeaconSetupCard()` and add import
4. **Verify** — Run `dart analyze` on both files

## Widget Template

```dart
import 'package:flutter/material.dart';

class BeaconSetupCard extends StatelessWidget {
  const BeaconSetupCard({super.key});

  @override
  Widget build(BuildContext context) {
    // ... extracted widget tree
  }
}
```