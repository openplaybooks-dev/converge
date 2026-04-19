# Checks: 03-build-screens/009-education/009-06-lift/003-lift-BookmarkedArticleCard

All checks must pass for this task to be considered complete.
Run each command from the project root. Fix failures and re-run.

## widget-exists
**Description**: Shared widget file exists
**Command**: `test -f lib/widgets/bookmarked_article_card.dart`

## dart-valid
**Description**: Dart analysis passes
**Command**: `dart analyze lib/widgets/bookmarked_article_card.dart`