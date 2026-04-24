---
id: 004-lift-PrivacyFooter
title: "Lift: PrivacyFooter"
description: Move PrivacyFooter from local widgets to lib/widgets/
tags:
  - lift
  - widget
inputs:
  - lib/screens/invite_accept/widgets/privacy_footer.dart
outputs:
  - lib/widgets/privacy_footer.dart
checks:
  - id: widget-exists
    description: Shared widget file exists
    cmd: test -f lib/widgets/privacy_footer.dart
  - id: dart-valid
    description: Dart analysis passes
    cmd: dart analyze lib/widgets/privacy_footer.dart
vars:
  widgetName: PrivacyFooter
  snakeName: privacy_footer
  screenId: invite-accept
  screenTitle: null
  localWidgetPath: lib/screens/invite_accept/widgets/privacy_footer.dart
  sharedWidgetPath: lib/widgets/privacy_footer.dart
  localWidgetsDir: lib/screens/invite_accept/widgets
  screenPath: lib/screens/invite_accept/invite_accept_screen.dart
  subtaskId: 004-lift-PrivacyFooter
---

# Lift: PrivacyFooter

Move `PrivacyFooter` from local screen widgets to the shared widgets directory.

## Steps

1. **Move file** — `lib/screens/invite_accept/widgets/privacy_footer.dart` → `lib/widgets/privacy_footer.dart`
2. **Update package import** — Change relative import to package import: `package:folio/widgets/privacy_footer.dart`
3. **Update all references** — Find all files importing the old path and update them
4. **Verify** — Run `dart analyze` on affected files
