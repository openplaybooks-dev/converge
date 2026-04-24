# Task: 03-build-screens/012-invite-accept/012-06-lift/004-lift-PrivacyFooter

# Lift: PrivacyFooter

Move `PrivacyFooter` from local screen widgets to the shared widgets directory.

## Steps

1. **Move file** — `lib/screens/invite_accept/widgets/privacy_footer.dart` → `lib/widgets/privacy_footer.dart`
2. **Update package import** — Change relative import to package import: `package:folio/widgets/privacy_footer.dart`
3. **Update all references** — Find all files importing the old path and update them
4. **Verify** — Run `dart analyze` on affected files