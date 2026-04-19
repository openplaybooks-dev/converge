# Task: 03-build-screens/005-mindfulness/005-06-lift/002-lift-MoodBanner

# Lift: MoodBanner

Move `MoodBanner` from local screen widgets to the shared widgets directory.

## Steps

1. **Move file** — `lib/screens/mindfulness/widgets/mood_banner.dart` → `lib/widgets/mood_banner.dart`
2. **Update package import** — Change relative import to package import: `package:folio/widgets/mood_banner.dart`
3. **Update all references** — Find all files importing the old path and update them
4. **Verify** — Run `dart analyze` on affected files