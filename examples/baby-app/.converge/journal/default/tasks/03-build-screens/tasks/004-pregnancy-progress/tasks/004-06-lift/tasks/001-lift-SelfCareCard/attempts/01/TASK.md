# Task: 03-build-screens/004-pregnancy-progress/004-06-lift/001-lift-SelfCareCard

# Lift: SelfCareCard

Move `SelfCareCard` from local screen widgets to the shared widgets directory.

## Steps

1. **Move file** — `lib/screens/pregnancy_progress/widgets/self_care_card.dart` → `lib/widgets/self_care_card.dart`
2. **Update package import** — Change relative import to package import: `package:folio/widgets/self_care_card.dart`
3. **Update all references** — Find all files importing the old path and update them
4. **Verify** — Run `dart analyze` on affected files