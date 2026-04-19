# Task: 03-build-screens/005-mindfulness/005-06-lift/001-lift-ExerciseCard

# Lift: ExerciseCard

Move `ExerciseCard` from local screen widgets to the shared widgets directory.

## Steps

1. **Move file** — `lib/screens/mindfulness/widgets/exercise_card.dart` → `lib/widgets/exercise_card.dart`
2. **Update package import** — Change relative import to package import: `package:folio/widgets/exercise_card.dart`
3. **Update all references** — Find all files importing the old path and update them
4. **Verify** — Run `dart analyze` on affected files