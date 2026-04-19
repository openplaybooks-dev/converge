# Checks: 03-build-screens/007-health-log/007-05-split/002-split-HealthLogTabBar

All checks must pass for this task to be considered complete.
Run each command from the project root. Fix failures and re-run.

## widget-exists
**Description**: Widget file exists
**Command**: `test -f lib/screens/health_log/widgets/health_log_tab_bar.dart`

## dart-valid
**Description**: Dart analysis passes
**Command**: `dart analyze lib/screens/health_log/widgets/health_log_tab_bar.dart`