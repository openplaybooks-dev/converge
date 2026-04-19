# Checks: 07-build-overlays/002-weight-entry/002-05-mount

All checks must pass for this task to be considered complete.
Run each command from the project root. Fix failures and re-run.

## parent-imports-overlay
**Description**: Parent screen imports the overlay widget
**Command**: `grep -q 'weight_entry' lib/screens/weight_nutrition/weight_nutrition_screen.dart`

## parent-shows-overlay
**Description**: Parent screen calls showModalBottomSheet or showDialog
**Command**: `grep -qE 'showModalBottomSheet|showDialog' lib/screens/weight_nutrition/weight_nutrition_screen.dart`

## dart-valid
**Description**: Dart analysis passes for parent screen
**Command**: `dart analyze lib/screens/weight_nutrition/weight_nutrition_screen.dart`