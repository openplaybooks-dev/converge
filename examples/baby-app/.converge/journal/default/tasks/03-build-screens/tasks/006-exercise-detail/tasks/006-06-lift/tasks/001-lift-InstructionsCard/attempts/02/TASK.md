# Task: 03-build-screens/006-exercise-detail/006-06-lift/001-lift-InstructionsCard

# Lift: InstructionsCard

Move `InstructionsCard` from local screen widgets to the shared widgets directory.

## Steps

1. **Move file** — `lib/screens/exercise_detail/widgets/instructions_card.dart` → `lib/widgets/instructions_card.dart`
2. **Update package import** — Change relative import to package import: `package:folio/widgets/instructions_card.dart`
3. **Update all references** — Find all files importing the old path and update them
4. **Verify** — Run `dart analyze` on affected files