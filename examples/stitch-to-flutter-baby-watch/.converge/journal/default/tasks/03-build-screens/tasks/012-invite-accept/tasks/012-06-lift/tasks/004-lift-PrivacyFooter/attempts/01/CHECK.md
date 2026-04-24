# Checks: 03-build-screens/012-invite-accept/012-06-lift/004-lift-PrivacyFooter

All checks must pass for this task to be considered complete.
Run each command from the project root. Fix failures and re-run.

## widget-exists
**Description**: Shared widget file exists
**Command**: `test -f lib/widgets/privacy_footer.dart`

## dart-valid
**Description**: Dart analysis passes
**Command**: `dart analyze lib/widgets/privacy_footer.dart`