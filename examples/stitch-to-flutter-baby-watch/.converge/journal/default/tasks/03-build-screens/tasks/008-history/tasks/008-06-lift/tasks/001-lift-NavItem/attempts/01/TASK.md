# Task: 03-build-screens/008-history/008-06-lift/001-lift-NavItem

# Lift: NavItem

Move `NavItem` from local screen widgets to the shared widgets directory.

## Steps

1. **Move file** — `lib/screens/history/widgets/nav_item.dart` → `lib/widgets/nav_item.dart`
2. **Update package import** — Change relative import to package import: `package:folio/widgets/nav_item.dart`
3. **Update all references** — Find all files importing the old path and update them
4. **Verify** — Run `dart analyze` on affected files