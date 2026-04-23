# Checks: 03-build-screens/008-history/008-06-lift/003-lift-EventCard

All checks must pass for this task to be considered complete.
Run each command from the project root. Fix failures and re-run.

## widget-exists
**Description**: Shared widget file exists
**Command**: `test -f lib/widgets/overlays`

## dart-valid
**Description**: Dart analysis passes
**Command**: `dart analyze lib/widgets/overlays`