# Task: 03-build-screens/008-mood-wellness/008-06-lift/001-lift-MoodHistoryEntry

# Lift: MoodHistoryEntry

Move `MoodHistoryEntry` from local screen widgets to the shared widgets directory.

## Steps

1. **Move file** — `lib/screens/mood_wellness/widgets/mood_history_entry.dart` → `lib/widgets/mood_history_entry.dart`
2. **Update package import** — Change relative import to package import: `package:folio/widgets/mood_history_entry.dart`
3. **Update all references** — Find all files importing the old path and update them
4. **Verify** — Run `dart analyze` on affected files