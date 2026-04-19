# Task: 03-build-screens/002-cycle-tracking/002-06-lift/001-lift-BottomNavBar

# Lift: BottomNavBar

Move `BottomNavBar` from local screen widgets to the shared widgets directory.

## Steps

1. **Move file** — `lib/screens/cycle_tracking/widgets/bottom_nav_bar.dart` → `lib/widgets/bottom_nav_bar.dart`
2. **Update package import** — Change relative import to package import: `package:folio/widgets/bottom_nav_bar.dart`
3. **Update all references** — Find all files importing the old path and update them
4. **Verify** — Run `dart analyze` on affected files