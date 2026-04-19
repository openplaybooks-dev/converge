# Checks: 05-add-behavior/002-create-models

All checks must pass for this task to be considered complete.
Run each command from the project root. Fix failures and re-run.

## models-dir-exists
**Description**: Model files exist
**Command**: `find lib/models -name '*.dart' -type f | wc -l | awk '{if ($1 > 0) exit 0; exit 1}'`

## dart-analysis
**Description**: Dart analysis passes on models
**Command**: `dart analyze lib/models/`