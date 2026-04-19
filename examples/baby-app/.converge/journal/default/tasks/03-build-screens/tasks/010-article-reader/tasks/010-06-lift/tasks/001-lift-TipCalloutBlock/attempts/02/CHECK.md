# Checks: 03-build-screens/010-article-reader/010-06-lift/001-lift-TipCalloutBlock

All checks must pass for this task to be considered complete.
Run each command from the project root. Fix failures and re-run.

## widget-exists
**Description**: Shared widget file exists
**Command**: `test -f lib/widgets/tip_callout_block.dart`

## dart-valid
**Description**: Dart analysis passes
**Command**: `dart analyze lib/widgets/tip_callout_block.dart`