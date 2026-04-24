# Task: 03-build-screens/008-history/008-06-lift/003-lift-EventCard

# Lift: EventCard

Move `EventCard` from local screen widgets to the shared widgets directory.

## Steps

1. **Move file** — `lib/widgets/event_card.dart` → `lib/widgets/event_card.dart`
2. **Update package import** — Change relative import to package import: `package:folio/widgets/event_card.dart`
3. **Update all references** — Find all files importing the old path and update them
4. **Verify** — Run `dart analyze` on affected files