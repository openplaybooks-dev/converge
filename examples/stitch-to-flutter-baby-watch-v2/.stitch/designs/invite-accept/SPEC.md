# SPEC: Invite Accept

## 1. Overlay Title
Invite Accept

## 2. Overlay Type
`dialog` — presented via `showDialog()` (Material modal dialog). Not a bottom sheet, not a persistent bar.

## 3. Parent Screen
`co-guardians-list` (route `/devices/co-guardians`, file `lib/screens/co_guardians_list/co_guardians_list_screen.dart`).

## 4. Trigger
The dialog opens when a user taps the **"Mời người" (Invite)** action in the parent screen's secondary toolbar (per reference HTML at `.stitch/references/co_guardians_list_phase_2/code.html` lines 107–110, 128–131), or when the app receives an inbound invitation deep-link.

**Existing placeholder in parent screen:** the parent currently renders `InvitationCard()` inline inside `SingleChildScrollView` (`co_guardians_list_screen.dart:50`). The card itself defines the accept/decline actions with `@converge:element action:accept-invitation` (line 76) and `@converge:element action:decline-invitation` (line 92), both wired to navigation stubs (`context.go('/devices')` / `context.go('/home')`). The phase-05 mount step should move this content into the overlay and replace the inline card with a trigger button on the toolbar.

## 5. Purpose
Lets a recipient review and either accept or decline a co-guardian invitation for a specific beacon (e.g., "Bé Na"). It surfaces the inviter, the permissions being granted, and the consequences of accepting (notification rights, ability to leave the group) before the user commits.

## 6. Widget Name
`InviteAccept` (Dart class, file `lib/overlays/invite_accept/invite_accept.dart`).

## 7. Design Tokens
Sourced from `.stitch/system/DESIGN.md`:

- **Surface:** `surface_container_lowest` (#ffffff) for the dialog body, on top of dimmed scrim.
- **Radius:** `lg` (2rem) for the outer dialog container; `md` (1.5rem) for nested info rows.
- **Typography:**
  - Title "Bé Na" → `headline-lg` Plus Jakarta Sans, color `on_surface` (#31332e).
  - Inviter line "Mẹ đã mời bạn" → `body-md` Manrope, color `on_surface_variant` (#5e6059).
  - Permission bullet body text → `body-md` Manrope, `on_surface_variant`.
  - Button labels → `label-lg` Manrope.
- **Buttons:**
  - Accept: primary, `on_surface` background (#31332e), `surface` text (#fbf9f5), pill (9999px), 56px height.
  - Decline: tertiary/ghost style, `on_surface_variant` text, 56px height, no container.
- **Inviter chip:** `surface_container_high` (#e8e9e1) background, `on_surface_variant` foreground.
- **Permission row icons:**
  - Notifications icon foreground `tertiary` (#4f635e), background `tertiary_container` (#dff6ee).
  - Group-off icon foreground `secondary`, background `surface_container_high`.
- **Footer strip:** `surface_container_low` (#f5f4ee) background with `verified_user` icon + caption "Bảo mật bởi hệ thống mã hóa BabyGuard".
- **Spacing rhythm:** vertical gaps follow 24–40dp scale (`AppSpacing.md`/`lg`), per the "Asymmetric Breathing" rule.

## 8. Layout
**Dialog container:**
- `Dialog` with `shape: RoundedRectangleBorder(borderRadius: AppRadius.lg)`.
- `insetPadding: EdgeInsets.symmetric(horizontal: 24, vertical: 40)`.
- `max width`: 520dp (constrained via `ConstrainedBox`); on phone widths it fills available width minus inset.
- Internal layout: a `Column` with two stacked regions:
  1. **Body region** — `surface_container_lowest`, padding `AppSpacing.lg` (24dp), holds avatar, title, inviter row, permission bullets, action buttons.
  2. **Footer strip** — `surface_container_low`, padding 16dp horizontal / 16dp vertical, holds the encryption-trust caption.

## 9. Sections

### 9.1 Avatar
- Widget: `AvatarWithShieldBadge` (existing, `lib/screens/co_guardians_list/widgets/avatar_with_shield_badge.dart`).
- Centered, ~96dp diameter, with a verified-shield badge overlapping the bottom-right.

### 9.2 Title block
- Widget: `Column` with `crossAxisAlignment: center`.
- Children: subject name (`Text`, headline-lg) + a `Row` containing the inviter sentence and an `InviterChip`.
- Interactive: none.

### 9.3 Permission bullets
- Widget: `Column` of two `InfoRow` widgets (existing, `lib/widgets/info_row.dart`).
- Bullet 1: notifications — copy "Bằng cách chấp nhận, bạn sẽ nhận được thông báo khi beacon này mất kết nối".
- Bullet 2: group-off — copy "Bạn có thể rời nhóm theo dõi bất kỳ lúc nào".
- Interactive: none (informational).

### 9.4 Action row
- Widget: `Column` (stacked, full-width buttons), not a horizontal `Row`, to mirror the existing `InvitationCard` pattern.
- Children:
  - `FilledButton` "Chấp nhận" (Accept) — primary token styling.
  - `TextButton` "Từ chối" (Decline) — ghost styling.
- Interactive: both buttons. Accept dispatches an accept intent and dismisses with `InviteAcceptResult.accepted`; Decline dismisses with `InviteAcceptResult.declined`.

### 9.5 Trust footer
- Widget: `Container` with row layout: `Icon(Icons.verified_user)` + caption "Bảo mật bởi hệ thống mã hóa BabyGuard".
- Interactive: none.

## 10. Data
Entities and fields displayed:

- **Invitation** (read-only):
  - `subjectName: String` — beacon owner's display name (e.g., "Bé Na").
  - `inviterName: String` — display name of the inviter (e.g., "Mẹ").
  - `inviterRole: String` — e.g., "Người sở hữu" (Owner).
  - `subjectAvatarUrl: String?` — optional, drives the avatar widget.
  - `permissions: List<PermissionBullet>` — currently the two static bullets above; structure allows future additions.
  - `invitationId: String` — opaque token used to ack accept/decline server-side.

No fields are edited inside the overlay; the user only chooses Accept or Decline.

## 11. Dismiss Behavior
- **Accept:** primary button → close dialog with `InviteAcceptResult.accepted` (parent then navigates to `/devices` and triggers the accept-invite mutation).
- **Decline:** tertiary button → close dialog with `InviteAcceptResult.declined` (parent navigates to `/home` or stays on the list).
- **Tap outside / scrim tap:** disabled (`barrierDismissible: false`) — accepting/declining a co-guardian invitation must be an explicit choice.
- **System back / Escape:** allowed; resolves with `InviteAcceptResult.dismissed` (treated as no-op, leaves the invitation pending).

## 12. Return Value
The dialog returns an `InviteAcceptResult` enum to the awaiting `showDialog<InviteAcceptResult>()` future:

- `accepted` — caller fires the accept mutation and routes forward.
- `declined` — caller fires the decline mutation.
- `dismissed` — caller leaves the invitation in `pending` state.

## 13. Accessibility
- Dialog wrapped in `Semantics(label: 'Lời mời theo dõi từ <inviterName>', container: true, scopesRoute: true)`.
- Focus is trapped inside the dialog (`useRootNavigator: true`, `barrierDismissible: false`); first focus lands on the Accept button.
- Each `InfoRow` exposes its body text as the semantic label; decorative icons are marked `excludeSemantics: true`.
- The Accept and Decline buttons have explicit `Semantics(button: true, label: ...)` so screen readers announce "Chấp nhận lời mời, nút" / "Từ chối lời mời, nút".
- On open, announce "Lời mời theo dõi <subjectName>" via `SemanticsService.announce`.
- Color-contrast: primary button's #31332e on #fbf9f5 and body text's #5e6059 on #ffffff both clear WCAG AA at the sizes used.
- Touch targets: both action buttons are 56dp tall, exceeding the 48dp minimum.
