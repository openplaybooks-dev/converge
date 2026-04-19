# Needs: 06-wire-screens/004-verify

## Description

Verify every screen has real handlers, no empty callbacks, no null onPressed, all bottom navs navigate

## Inputs

- `lib/screens/**/*.dart`
- `lib/widgets/**/*.dart`
- `lib/providers/**/*.dart`
- `navigations.json`

## Checks

- **no-empty-handlers**: No empty/comment-only handlers in any screen or widget file
- **dart-analysis-valid**: Full Dart analysis passes
