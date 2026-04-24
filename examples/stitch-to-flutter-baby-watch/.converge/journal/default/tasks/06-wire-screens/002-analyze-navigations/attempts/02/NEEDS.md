# Needs: 06-wire-screens/002-analyze-navigations

## Description

Scan screens/widgets, assign elementIds, insert `// @converge:element <elementId>` in Dart before each handler, and write navigations.json

## Inputs

- `.stitch/screens.json`
- `lib/screens/**/*.dart`
- `lib/widgets/**/*.dart`
- `lib/router/app_router.dart`

## Expected Outputs

- `navigations.json`
- `lib/screens/**/*.dart`
- `lib/widgets/**/*.dart`

## Checks

- **manifest-exists**: navigations.json was created
- **manifest-has-screens**: Manifest contains at least 5 screens
- **manifest-has-elements**: Manifest contains at least 10 interactive elements total
- **every-element-has-id**: Every element has a unique elementId
