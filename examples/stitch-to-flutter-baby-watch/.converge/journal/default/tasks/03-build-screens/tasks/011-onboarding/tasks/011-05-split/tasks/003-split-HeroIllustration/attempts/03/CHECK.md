# Checks: 03-build-screens/011-onboarding/011-05-split/003-split-HeroIllustration

All checks must pass for this task to be considered complete.
Run each command from the project root. Fix failures and re-run.

## widget-exists
**Description**: Widget file exists
**Command**: `test -f lib/screens/onboarding/widgets/hero_illustration.dart`

## dart-valid
**Description**: Dart analysis passes
**Command**: `flutter analyze lib/screens/onboarding/widgets/hero_illustration.dart`