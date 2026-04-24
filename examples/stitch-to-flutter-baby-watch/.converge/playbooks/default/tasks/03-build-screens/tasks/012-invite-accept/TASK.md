---
id: 012-invite-accept
title: "Screen: Accept Invitation"
dependencies:
  - 011-06-lift
tags:
  - screen
  - screen-invite-accept
inputs:
  - .stitch/screens.json
  - .stitch/system/DESIGN.md
  - .stitch/UX.md
outputs:
  - lib/screens/invite_accept/invite_accept_screen.dart
vars:
  screenId: invite-accept
  screenTitle: Accept Invitation
  widgetName: InviteAccept
  route: "/invite/:code"
  htmlReference: .stitch/references/co_guardians_list_phase_2/code.html
---

Parent task for building the "Accept Invitation" screen through the full pipeline: spec → design → convert → analyze → split → lift.
