# Task: 03-build-screens/011-onboarding/011-06-lift/002-lift-PageIndicator

# Lift: PageIndicator

Move `PageIndicator` from local screen widgets to the shared widgets directory.

## Steps

1. **Move file** — `lib/screens/onboarding/widgets/page_indicator.dart` → `lib/widgets/page_indicator.dart`
2. **Update package import** — Change relative import to package import: `package:folio/widgets/page_indicator.dart`
3. **Update all references** — Find all files importing the old path and update them
4. **Verify** — Run `dart analyze` on affected files