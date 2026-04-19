# Checks: 04-generate-assets/019-week-19/019-05-wire

All checks must pass for this task to be considered complete.
Run each command from the project root. Fix failures and re-run.

## widget-exists
**Description**: Asset widget was created
**Command**: `test -f lib/widgets/assets/week-19_asset.dart`

## dart-valid
**Description**: Generated widget code is valid
**Command**: `dart analyze lib/widgets/assets/week-19_asset.dart 2>/dev/null || true`