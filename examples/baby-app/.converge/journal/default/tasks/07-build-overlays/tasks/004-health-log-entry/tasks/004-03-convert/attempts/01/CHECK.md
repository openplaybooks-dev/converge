# Checks: 07-build-overlays/004-health-log-entry/004-03-convert

All checks must pass for this task to be considered complete.
Run each command from the project root. Fix failures and re-run.

## widget-exists
**Description**: Overlay widget file exists
**Command**: `test -f lib/widgets/overlays/health_log_entry/health_log_entry.dart`

## dart-valid
**Description**: Dart analysis passes
**Command**: `dart analyze lib/widgets/overlays/health_log_entry/health_log_entry.dart`

## uses-theme
**Description**: Uses Theme.of(context) for styling
**Command**: `grep -q 'Theme.of(context)' lib/widgets/overlays/health_log_entry/health_log_entry.dart`

## no-hardcoded-colors
**Description**: No hardcoded colors — uses colorScheme
**Command**: `! grep -qE 'Color\(0x|Colors\.' lib/widgets/overlays/health_log_entry/health_log_entry.dart`

## no-router-registration
**Description**: Overlay does NOT register a GoRoute
**Command**: `! grep -q 'GoRoute' lib/widgets/overlays/health_log_entry/health_log_entry.dart`