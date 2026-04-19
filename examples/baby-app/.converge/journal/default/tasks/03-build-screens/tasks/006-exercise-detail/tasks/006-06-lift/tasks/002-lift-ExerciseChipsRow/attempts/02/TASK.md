# Task: 03-build-screens/006-exercise-detail/006-06-lift/002-lift-ExerciseChipsRow

# Lift: ExerciseChipsRow

Move `ExerciseChipsRow` from local screen widgets to the shared widgets directory.

## Steps

1. **Move file** — `lib/screens/exercise_detail/widgets/exercise_chips_row.dart` → `lib/widgets/exercise_chips_row.dart`
2. **Update package import** — Change relative import to package import: `package:folio/widgets/exercise_chips_row.dart`
3. **Update all references** — Find all files importing the old path and update them
4. **Verify** — Run `dart analyze` on affected files