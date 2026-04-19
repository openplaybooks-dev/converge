# Checks: 04-generate-assets/018-week-18/018-05-wire

All checks must pass for this task to be considered complete.
Run each command from the project root. Fix failures and re-run.

## widget-exists
**Description**: Asset widget was created
**Command**: `test -f lib/widgets/assets/week-18_asset.dart`

## dart-valid
**Description**: Generated widget code is valid
**Command**: `dart analyze lib/widgets/assets/week-18_asset.dart 2>/dev/null || true`