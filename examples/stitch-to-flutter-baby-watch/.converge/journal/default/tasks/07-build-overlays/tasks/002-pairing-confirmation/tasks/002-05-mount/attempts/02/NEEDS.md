# Needs: 07-build-overlays/002-pairing-confirmation/002-05-mount

## Description

Mount Pairing Confirmation overlay in parent screen and wire trigger

## Inputs

- `lib/widgets/overlays/pairing_confirmation/pairing_confirmation.dart`
- `.stitch/designs/pairing-confirmation/SPEC.md`
- `lib/screens/beacon_scanner/beacon_scanner_screen.dart`

## Expected Outputs

- `lib/screens/beacon_scanner/beacon_scanner_screen.dart`

## Checks

- **parent-imports-overlay**: Parent screen imports the overlay widget
- **parent-shows-overlay**: Parent screen calls showModalBottomSheet or showDialog
- **dart-valid**: Dart analysis passes for parent screen
