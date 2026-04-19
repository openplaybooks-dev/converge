# Checks: 03-build-screens/010-article-reader/010-05-split/002-split-ArticleTitleBlock

All checks must pass for this task to be considered complete.
Run each command from the project root. Fix failures and re-run.

## widget-exists
**Description**: Widget file exists
**Command**: `test -f lib/screens/article_reader/widgets/article_title_block.dart`

## dart-valid
**Description**: Dart analysis passes
**Command**: `dart analyze lib/screens/article_reader/widgets/article_title_block.dart`