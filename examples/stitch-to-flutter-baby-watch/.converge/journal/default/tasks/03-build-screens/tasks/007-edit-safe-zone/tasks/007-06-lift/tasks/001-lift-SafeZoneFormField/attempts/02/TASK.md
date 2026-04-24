# Task: 03-build-screens/007-edit-safe-zone/007-06-lift/001-lift-SafeZoneFormField

# Lift: SafeZoneFormField

Move `SafeZoneFormField` from local screen widgets to the shared widgets directory.

## Steps

1. **Move file** — `lib/screens/edit_safe_zone/widgets/safe_zone_form_field.dart` → `lib/widgets/safe_zone_form_field.dart`
2. **Update package import** — Change relative import to package import: `package:folio/widgets/safe_zone_form_field.dart`
3. **Update all references** — Find all files importing the old path and update them
4. **Verify** — Run `dart analyze` on affected files