# Checks: 05-add-behavior/003-create-mock-data

All checks must pass for this task to be considered complete.
Run each command from the project root. Fix failures and re-run.

## file-exists
**Description**: Mock data file exists
**Command**: `test -f lib/data/mock_data.dart`

## file-size
**Description**: File is >200 lines
**Command**: `test $(wc -l < lib/data/mock_data.dart) -gt 200`

## dart-analysis
**Description**: Dart analysis passes
**Command**: `flutter analyze lib/data/mock_data.dart`