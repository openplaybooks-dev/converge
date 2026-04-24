# Checks: 05-add-behavior/004-implement-providers/005-provider-AlertConfig

All checks must pass for this task to be considered complete.
Run each command from the project root. Fix failures and re-run.

## file-exists
**Description**: alert_config_provider.dart exists
**Command**: `test -f lib/providers/alert_config_provider.dart`

## dart-valid
**Description**: Dart analysis passes
**Command**: `dart analyze lib/providers/alert_config_provider.dart`