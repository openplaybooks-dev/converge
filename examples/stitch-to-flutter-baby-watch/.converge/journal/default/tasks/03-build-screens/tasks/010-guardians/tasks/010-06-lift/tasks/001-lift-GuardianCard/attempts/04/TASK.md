# Task: 03-build-screens/010-guardians/010-06-lift/001-lift-GuardianCard

# Lift: GuardianCard

Move `GuardianCard` from local screen widgets to the shared widgets directory.

## Steps

1. **Move file** — `lib/screens/guardians/widgets/guardian_card.dart` → `lib/widgets/guardian_card.dart`
2. **Update package import** — Change relative import to package import: `package:folio/widgets/guardian_card.dart`
3. **Update all references** — Find all files importing the old path and update them
4. **Verify** — Run `dart analyze` on affected files