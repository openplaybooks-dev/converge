# Task: 03-build-screens/009-education/009-06-lift/001-lift-TopicChipBar

# Lift: TopicChipBar

Move `TopicChipBar` from local screen widgets to the shared widgets directory.

## Steps

1. **Move file** — `lib/screens/education/widgets/topic_chip_bar.dart` → `lib/widgets/topic_chip_bar.dart`
2. **Update package import** — Change relative import to package import: `package:folio/widgets/topic_chip_bar.dart`
3. **Update all references** — Find all files importing the old path and update them
4. **Verify** — Run `dart analyze` on affected files