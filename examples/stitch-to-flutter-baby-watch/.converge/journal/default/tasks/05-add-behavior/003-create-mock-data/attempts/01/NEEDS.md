# Needs: 05-add-behavior/003-create-mock-data

## Description

Generate comprehensive mock data for all entities based on the data model analysis

## Inputs

- `data-models.md`
- `lib/models/**/*.dart`

## Expected Outputs

- `lib/data/mock_data.dart`

## Checks

- **file-exists**: Mock data file exists
- **file-size**: File is >200 lines
- **dart-analysis**: Dart analysis passes
