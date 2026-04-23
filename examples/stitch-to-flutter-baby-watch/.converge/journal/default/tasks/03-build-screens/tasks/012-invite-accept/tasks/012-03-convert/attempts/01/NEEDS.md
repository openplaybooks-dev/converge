# Needs: 03-build-screens/012-invite-accept/012-03-convert

## Description

Convert constrained HTML design to Flutter widgets for Accept Invitation using stitch-flutter

## Inputs

- `.stitch/designs/invite-accept/design.html`
- `.stitch/designs/invite-accept/SPEC.md`
- `.stitch/system/DESIGN.md`

## Expected Outputs

- `lib/screens/invite_accept/invite_accept_screen.dart`

## Checks

- **screen-exists**: Screen widget file exists
- **dart-valid**: Dart analysis passes
- **uses-theme**: Uses Theme.of(context) for styling
- **no-hardcoded-colors**: No hardcoded colors — uses colorScheme
