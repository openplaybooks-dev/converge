---
id: 001-lift-PulseAvatarBadge
title: "Lift: PulseAvatarBadge"
description: Move PulseAvatarBadge from local widgets to lib/widgets/
tags:
  - lift
  - widget
inputs:
outputs:
  - lib/widgets/pulse_avatar_badge.dart
checks:
  - id: widget-exists
    description: Shared widget file exists
    cmd: test -f lib/widgets/pulse_avatar_badge.dart
  - id: dart-valid
    description: Dart analysis passes
    cmd: dart analyze lib/widgets/pulse_avatar_badge.dart
vars:
  widgetName: PulseAvatarBadge
  snakeName: pulse_avatar_badge
  screenId: invite-accept
  screenTitle: null
  localWidgetPath: lib/screens/invite_accept/widgets/pulse_avatar_badge.dart
  sharedWidgetPath: lib/widgets/pulse_avatar_badge.dart
  localWidgetsDir: lib/screens/invite_accept/widgets
  screenPath: lib/screens/invite_accept/invite_accept_screen.dart
  subtaskId: 001-lift-PulseAvatarBadge
---

# Lift: PulseAvatarBadge

Move `PulseAvatarBadge` from local screen widgets to the shared widgets directory.

## Steps

1. **Move file** — `lib/screens/invite_accept/widgets/pulse_avatar_badge.dart` → `lib/widgets/pulse_avatar_badge.dart`
2. **Update package import** — Change relative import to package import: `package:folio/widgets/pulse_avatar_badge.dart`
3. **Update all references** — Find all files importing the old path and update them
4. **Verify** — Run `dart analyze` on affected files
