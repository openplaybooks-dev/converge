# Checks: 07-build-overlays/005-event-detail/005-05-mount

All checks must pass for this task to be considered complete.
Run each command from the project root. Fix failures and re-run.

## parent-imports-overlay
**Description**: Parent screen imports the overlay widget
**Command**: `grep -q 'event_detail' lib/screens/history/history_screen.dart`

## parent-shows-overlay
**Description**: Parent screen calls showModalBottomSheet or showDialog
**Command**: `grep -qE 'showModalBottomSheet|showDialog' lib/screens/history/history_screen.dart`

## dart-valid
**Description**: Dart analysis passes for parent screen
**Command**: `dart analyze lib/screens/history/history_screen.dart`