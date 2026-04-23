# Needs: 06-wire-screens/001-connect-providers

## Description

Import Riverpod providers into every screen, replace hardcoded data with provider state

## Inputs

- `.stitch/screens.json`
- `lib/providers/**/*.dart`

## Expected Outputs

- `lib/screens/**/*.dart`

## Checks

- **screens-use-consumer-widget**: At least 3 screens use ConsumerWidget
- **screens-watch-providers**: At least 3 screens use ref.watch to read providers
- **dart-analysis-valid**: All code passes analysis
