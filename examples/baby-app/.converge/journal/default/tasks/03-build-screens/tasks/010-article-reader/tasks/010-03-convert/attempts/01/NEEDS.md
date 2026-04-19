# Needs: 03-build-screens/010-article-reader/010-03-convert

## Description

Convert constrained HTML design to Flutter widgets for Article Reader using stitch-flutter

## Inputs

- `.stitch/designs/article-reader/design.html`
- `.stitch/designs/article-reader/SPEC.md`
- `.stitch/system/DESIGN.md`

## Expected Outputs

- `lib/screens/article_reader/article_reader_screen.dart`

## Checks

- **screen-exists**: Screen widget file exists
- **dart-valid**: Dart analysis passes
- **uses-theme**: Uses Theme.of(context) for styling
- **no-hardcoded-colors**: No hardcoded colors — uses colorScheme
