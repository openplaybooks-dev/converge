# Checks: 03-build-screens/010-article-reader/010-05-split/004-split-TipCalloutBlock

All checks must pass for this task to be considered complete.
Run each command from the project root. Fix failures and re-run.

## widget-exists
**Description**: Widget file exists
**Command**: `test -f lib/screens/article_reader/widgets/tip_callout_block.dart`

## dart-valid
**Description**: Dart analysis passes
**Command**: `dart analyze lib/screens/article_reader/widgets/tip_callout_block.dart`