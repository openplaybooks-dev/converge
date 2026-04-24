# Checks: 05-add-behavior/004-implement-providers/004-provider-Event

All checks must pass for this task to be considered complete.
Run each command from the project root. Fix failures and re-run.

## file-exists
**Description**: event_provider.dart exists
**Command**: `test -f lib/providers/event_provider.dart`

## dart-valid
**Description**: Dart analysis passes
**Command**: `dart analyze lib/providers/event_provider.dart`