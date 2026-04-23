# Task: 03-build-screens/012-invite-accept/012-06-lift/003-lift-ActionButtons

# Lift: ActionButtons

Move `ActionButtons` from local screen widgets to the shared widgets directory.

## Steps

1. **Move file** — `lib/screens/invite_accept/widgets/action_buttons.dart` → `lib/widgets/action_buttons.dart`
2. **Update package import** — Change relative import to package import: `package:folio/widgets/action_buttons.dart`
3. **Update all references** — Find all files importing the old path and update them
4. **Verify** — Run `dart analyze` on affected files