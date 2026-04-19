# Task: 03-build-screens/004-pregnancy-progress/004-06-lift/002-lift-ExerciseGuideCard

# Lift: ExerciseGuideCard

Move `ExerciseGuideCard` from local screen widgets to the shared widgets directory.

## Steps

1. **Move file** — `lib/screens/pregnancy_progress/widgets/exercise_guide_card.dart` → `lib/widgets/exercise_guide_card.dart`
2. **Update package import** — Change relative import to package import: `package:folio/widgets/exercise_guide_card.dart`
3. **Update all references** — Find all files importing the old path and update them
4. **Verify** — Run `dart analyze` on affected files