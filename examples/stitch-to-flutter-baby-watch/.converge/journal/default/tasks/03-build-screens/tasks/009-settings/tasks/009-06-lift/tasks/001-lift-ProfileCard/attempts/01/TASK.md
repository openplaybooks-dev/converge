# Task: 03-build-screens/009-settings/009-06-lift/001-lift-ProfileCard

# Lift: ProfileCard

Move `ProfileCard` from local screen widgets to the shared widgets directory.

## Steps

1. **Move file** — `lib/screens/settings/widgets/profile_card.dart` → `lib/screens/settings/widgets/profile_card.dart`
2. **Update package import** — Change relative import to package import: `package:folio/widgets/profile_card.dart`
3. **Update all references** — Find all files importing the old path and update them
4. **Verify** — Run `dart analyze` on affected files