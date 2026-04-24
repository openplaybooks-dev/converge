# Task: 03-build-screens/006-add-safe-zone/006-06-lift/002-lift-ActiveToggle

# Lift: ActiveToggle

Move `ActiveToggle` from local screen widgets to the shared widgets directory.

## Steps

1. **Move file** — `lib/screens/add_safe_zone/widgets/active_toggle.dart` → `lib/widgets/active_toggle.dart`
2. **Update package import** — Change relative import to package import: `package:folio/widgets/active_toggle.dart`
3. **Update all references** — Find all files importing the old path and update them
4. **Verify** — Run `dart analyze` on affected files