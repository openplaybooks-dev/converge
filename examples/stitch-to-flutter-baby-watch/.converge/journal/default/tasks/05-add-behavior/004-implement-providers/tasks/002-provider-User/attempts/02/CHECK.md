# Checks: 05-add-behavior/004-implement-providers/002-provider-User

All checks must pass for this task to be considered complete.
Run each command from the project root. Fix failures and re-run.

## file-exists
**Description**: user_provider.dart exists
**Command**: `test -f lib/providers/user_provider.dart`

## dart-valid
**Description**: Dart analysis passes
**Command**: `dart analyze lib/providers/user_provider.dart`