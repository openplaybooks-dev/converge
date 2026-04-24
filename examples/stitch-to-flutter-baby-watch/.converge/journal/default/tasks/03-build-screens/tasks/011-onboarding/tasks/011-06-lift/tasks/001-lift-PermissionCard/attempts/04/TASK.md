# Task: 03-build-screens/011-onboarding/011-06-lift/001-lift-PermissionCard

# Lift: PermissionCard

Move `PermissionCard` from local screen widgets to the shared widgets directory.

## Steps

1. **Move file** — `lib/screens/onboarding/widgets/permission_card.dart` → `lib/widgets/permission_card.dart`
2. **Update package import** — Change relative import to package import: `package:folio/widgets/permission_card.dart`
3. **Update all references** — Find all files importing the old path and update them
4. **Verify** — Run `dart analyze` on affected files