---
id: 001-01-spec
title: "Spec: Invite Accept"
description: Generate Invite Accept overlay specification
tags:
  - spec
  - overlay-invite-accept
inputs:
  - .stitch/system/DESIGN.md
  - .stitch/UX.md
  - .stitch/screens.json
  - lib/screens/co_guardians_list/co_guardians_list_screen.dart
  - .stitch/references/co_guardians_list_phase_2/code.html
outputs:
  - .stitch/designs/invite-accept/SPEC.md
checks:
  - id: spec-exists
    description: SPEC.md exists for invite-accept
    cmd: test -f .stitch/designs/invite-accept/SPEC.md
  - id: spec-has-content
    description: "SPEC.md has >30 lines"
    cmd: test $(wc -l < .stitch/designs/invite-accept/SPEC.md) -gt 30
plan:
vars:
  references: ["flutter-building-layouts"]
  prefix: 001
  overlayId: invite-accept
  title: Invite Accept
  widgetName: InviteAccept
  snakeName: invite_accept
  overlayTaskId: 001-invite-accept
  parentScreenId: co-guardians-list
  parentScreenPath: lib/screens/co_guardians_list/co_guardians_list_screen.dart
  overlayType: dialog
  specPath: .stitch/designs/invite-accept/SPEC.md
  metaPath: .stitch/designs/invite-accept/META.md
  designPath: .stitch/designs/invite-accept/design.html
  widgetPath: lib/widgets/overlays/invite_accept/invite_accept.dart
  htmlReference: .stitch/references/co_guardians_list_phase_2/code.html
  htmlReferenceInput: "  - \".stitch/references/co_guardians_list_phase_2/code.html\"\n"
---

# Spec: Invite Accept

Generate the overlay specification for **Invite Accept** (`invite-accept`).

## Inputs
- `.stitch/system/DESIGN.md` — Design system
- `.stitch/UX.md` — UX overview
- `.stitch/screens.json` — Screen and overlay definitions
- `lib/screens/co_guardians_list/co_guardians_list_screen.dart` — Parent screen (check for existing trigger placeholders)
- **Parent HTML reference** — `.stitch/references/co_guardians_list_phase_2/code.html` (when non-empty): the overlay's visual target lives inside this reference HTML as modal/dialog/sheet markup. Read it and extract only the overlay portion.

## Context

This is an **overlay** (dialog), not a full screen. It is triggered from the **co-guardians-list** screen. Overlays are presented using `showModalBottomSheet()`, `showDialog()`, or persistent bar patterns — never via GoRouter navigation.

## Reference HTML (`htmlReference`)

Value for this overlay: **`.stitch/references/co_guardians_list_phase_2/code.html`**

- When **non-empty** and the file exists: the overlay's visual design lives inside that parent reference HTML (usually as a `<dialog>`, overlay card, or bottom sheet markup nested in the page). Find that nested block and treat it as authoritative for overlay content, copy, controls, and layout. Don't invent overlay content if the reference already shows it.
- When **empty** or missing: infer the overlay's purpose and content from its id/title, `.stitch/UX.md`, and parent screen context.

**IMPORTANT:** Read the parent screen file (`lib/screens/co_guardians_list/co_guardians_list_screen.dart`) — the `03-build-screens` pipeline typically generates screens with placeholder triggers (e.g., `Placeholder()` builder, `SnackBar` stub, `debugPrint` stub) where overlays should be wired. Document the existing trigger location and placeholder pattern in the spec so the `05-mount` step knows exactly what to replace.

## Task

Read inputs and produce `.stitch/designs/invite-accept/SPEC.md` containing:

1. **Overlay Title** — Invite Accept
2. **Overlay Type** — dialog (bottom-sheet | dialog | persistent-bar)
3. **Parent Screen** — co-guardians-list
4. **Trigger** — What user action opens this overlay (e.g., tap button, long press)
5. **Purpose** — What this overlay does and why it exists
6. **Widget Name** — `InviteAccept`
7. **Design Tokens** — Colors, typography, spacing from DESIGN.md
8. **Layout** — Container structure:
   - For bottom-sheet: drag handle, content area, action buttons, max height
   - For dialog: title bar, content, action row, max width
   - For persistent-bar: height, background, content layout
9. **Sections** — Each visual section with:
   - Description of content
   - Widget type (ListView, Column, Wrap, etc.)
   - Interactive elements (buttons, toggles, inputs)
10. **Data** — Entities and fields displayed/edited
11. **Dismiss Behavior** — How the overlay closes (swipe down, tap outside, confirm button, cancel)
12. **Return Value** — What data (if any) the overlay passes back to the parent when dismissed
13. **Accessibility** — Semantics labels, focus trapping, screen reader announcements

## Success Criteria

- `.stitch/designs/invite-accept/SPEC.md` exists and has >30 lines
- All required sections present
- Overlay type and parent screen clearly identified
- Trigger and dismiss behavior documented
- Design tokens reference DESIGN.md values
