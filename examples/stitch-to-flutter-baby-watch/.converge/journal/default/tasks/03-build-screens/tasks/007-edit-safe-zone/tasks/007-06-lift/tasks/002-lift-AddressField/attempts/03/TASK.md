# Task: 03-build-screens/007-edit-safe-zone/007-06-lift/002-lift-AddressField

# Lift: AddressField

Move `AddressField` from local screen widgets to the shared widgets directory.

## Steps

1. **Move file** — `lib/screens/edit_safe_zone/widgets/address_field.dart` → `lib/widgets/address_field.dart`
2. **Update package import** — Change relative import to package import: `package:folio/widgets/address_field.dart`
3. **Update all references** — Find all files importing the old path and update them
4. **Verify** — Run `dart analyze` on affected files