# Normalization: Invite Accept

Normalized from: `.stitch/designs/invite-accept/SPEC.md`
Source reference: `.stitch/references/ch_p_nh_n_l_i_m_i/code.html`
Glossary: `stitch-flutter/references/flutter-html-glossary.md`

## Example selection

Scored against the three system examples in `.stitch/system/META.md`:

| Example | Pattern | Score | Notes |
|---------|---------|-------|-------|
| `single-screen.html` | Single Screen | 1 / 5 | Whole-screen scaffold + bottom-nav. Wrong shell for a modal dialog. |
| `multi-state-screen.html` | Multi-State | 1 / 5 | Side-by-side state strip; this overlay has one state (review-and-choose). |
| `celebration-screen.html` | Celebration | 4 / 5 | Centered avatar + title + supporting copy + stacked primary/ghost CTAs — same vertical rhythm and "moment of decision" framing as the invite dialog. |

**Selected:** `celebration-screen.html`. The invite-accept dialog is a centered "moment" surface with an avatar, a name headline, secondary inviter copy, two informational bullets, and a stacked Accept / Decline pair — structurally the closest match to the celebration pattern, scoped down into a `dialog` container rather than a full scaffold.

## Section mapping

| Source (reference `ch_p_nh_n_l_i_m_i/code.html`) | Glossary |
|--------|----------|
| Page wrapper `<body class="bg-[#fbf9f5] text-on-surface">` (parent screen behind the modal) | `<div class="scaffold" data-bg="surface" data-overlay="dialog">` |
| Backdrop dim `<div class="fixed inset-0 bg-black/40">` | `<div class="stack" data-bg="onSurface" data-opacity="0.32" data-scrim="true">` |
| Modal card `<div class="bg-surface-container-lowest rounded-[2rem] max-w-[520px]">` | `<div class="dialog" data-bg="surfaceContainerLowest" data-radius="lg" data-max-width="520">` |
| Body region `<div class="px-6 py-6 flex flex-col items-center gap-6">` | `<div class="column" data-bg="surfaceContainerLowest" data-p="lg|lg" data-gap="lg" data-cross-axis="center">` |
| Avatar `<div class="relative w-24 h-24"><img class="rounded-full" /><span class="absolute bottom-0 right-0 bg-tertiary rounded-full">shield</span></div>` | `<div class="stack" data-widget="AvatarWithShieldBadge" data-size="96">` with `<img class="avatar">` + `<div class="badge" data-bg="tertiary" data-position="bottom-right">` containing `<svg class="icon" data-name="shield">` |
| Pulsing halo behind avatar `<div class="absolute inset-0 bg-tertiary-container/60 rounded-full animate-pulse">` | inner `<div class="stack" data-bg="tertiaryContainer" data-radius="full" data-animate="pulse">` |
| Subject title `<h2 class="text-3xl font-extrabold tracking-tight">Bé Na</h2>` | `<span class="headline-large" data-color="onSurface" data-font="display">` |
| Inviter row `<p>Mẹ đã mời bạn <span class="bg-surface-container-high px-2 py-0.5 rounded-full text-xs">Người sở hữu</span></p>` | `<div class="row" data-gap="sm" data-main-axis="center">` with `<span class="body-medium">` + `<span class="chip" data-widget="InviterChip" data-bg="surfaceContainerHigh" data-color="onSurfaceVariant">` containing `<span class="label-small">` |
| Permission bullet 1 `<div class="flex gap-3"><span class="w-10 h-10 bg-tertiary-container rounded-full flex items-center justify-center">notifications_active</span><p>Bằng cách chấp nhận...</p></div>` | `<div class="row" data-widget="InfoRow" data-gap="md" data-cross-axis="start">` with `<div class="stack" data-bg="tertiaryContainer" data-radius="full" data-w="40" data-h="40">` + `<svg class="icon" data-name="notifications_active" data-color="tertiary">` + `<span class="body-medium expanded" data-color="onSurfaceVariant">` |
| Permission bullet 2 `<div class="flex gap-3"><span class="w-10 h-10 bg-surface-container-high rounded-full">group_off</span><p>Bạn có thể rời nhóm...</p></div>` | `<div class="row" data-widget="InfoRow" data-gap="md" data-cross-axis="start">` with `<div class="stack" data-bg="surfaceContainerHigh" data-radius="full">` + `<svg class="icon" data-name="group_off" data-color="secondary">` + `<span class="body-medium expanded" data-color="onSurfaceVariant">` |
| Primary CTA `<button class="w-full h-14 bg-on-surface text-surface rounded-full">Chấp nhận</button>` | `<button class="filled-btn" data-bg="onSurface" data-color="surface" data-radius="full" data-h="56">` with `<span class="label-large">` |
| Secondary CTA `<button class="w-full h-14 text-on-surface-variant">Từ chối</button>` | `<button class="text-btn" data-color="onSurfaceVariant" data-h="56">` with `<span class="label-large">` |
| Trust footer `<div class="bg-surface-container-low px-4 py-4 flex items-center justify-center gap-2"><span>verified_user</span><p>Bảo mật bởi hệ thống mã hóa BabyGuard</p></div>` | `<div class="row" data-bg="surfaceContainerLow" data-p="md|md" data-gap="sm" data-main-axis="center">` with `<svg class="icon" data-name="verified_user" data-color="onSurfaceVariant" data-fill="1">` + `<span class="label-small" data-color="onSurfaceVariant">` |

## Token deviations

- `bg-[#fbf9f5]` (parent body behind modal) — exact: `surface` (`#fbf9f5`).
- `bg-black/40` (modal scrim) — no direct token; normalized to `onSurface` with `data-opacity="0.32"`. Matches Material 3 scrim spec (32% on-surface) more accurately than `black/40`.
- `bg-surface-container-lowest` (dialog body) — exact: `surfaceContainerLowest` (`#ffffff`).
- `bg-surface-container-low` (trust footer strip) — exact: `surfaceContainerLow` (`#f5f4ee`).
- `bg-surface-container-high` (inviter chip background, group-off icon tile) — exact: `surfaceContainerHigh` (`#e8e9e1`).
- `bg-tertiary-container` (notifications icon tile, avatar pulse halo) — exact: `tertiaryContainer` (`#dff6ee`).
- `text-tertiary` (notifications icon foreground) — exact: `tertiary` (`#4f635e`).
- `text-secondary` (group-off icon foreground) — exact: `secondary`.
- `bg-on-surface` / `text-surface` (Accept primary CTA) — exact: `onSurface` / `surface`. Matches the canonical "soft-black pill" CTA shared with add-beacon and home-safe.
- `text-on-surface-variant` (decline button label, inviter copy, bullet body, footer caption) — exact: `onSurfaceVariant` (`#5e6059`).
- `bg-tertiary` + `text-on-tertiary` (avatar shield badge) — exact: `tertiary` / `onTertiary`.
- `rounded-[2rem]` (dialog) — exact: `data-radius="lg"` (DESIGN.md `lg = 2rem`).
- `rounded-full` (chip, icon tiles, avatar halo, CTA pill) — exact: `data-radius="full"`.
- `max-w-[520px]` (dialog) — preserved as `data-max-width="520"` per SPEC §8.
- `animate-pulse` on avatar halo — preserved as `data-animate="pulse"` on the inner `stack`. The renderer will translate to a Flutter `AnimatedContainer` / scale loop.
- `tracking-tight`, `font-extrabold`, `text-3xl` on title — dropped; `headline-large` already encodes weight and tracking via the typography theme. `data-font="display"` flags the Plus Jakarta Sans display fallback per DESIGN.md.
- `shadow-*`, `backdrop-blur-*`, `transition-*`, `hover:*`, `active:scale-*`, `ring-*` — all dropped (presentation/interaction-only; renderer applies elevation and press feedback from the dialog widget defaults).
- `barrierDismissible: false` and `useRootNavigator: true` (SPEC §11, §13) — encoded as `data-barrier-dismissible="false"` and `data-use-root-navigator="true"` on the `dialog` element.
- Avatar shield badge size `w-7 h-7` — collapsed onto the `badge` glossary primitive with a 20dp icon; absolute-positioning is encoded via `data-position="bottom-right"`.
- ARIA attributes (`role="dialog"`, `aria-modal="true"`, `aria-labelledby`, `aria-label` on action buttons, `aria-hidden="true"` on decorative icons) preserved verbatim from SPEC §13 — these are required for the focus-trap and screen-reader announcement and have no glossary equivalent.

## Handlers assigned

| data-handler | data-result | Source element |
|--------------|-------------|----------------|
| `action:accept-invitation` | `InviteAcceptResult.accepted` | Primary "Chấp nhận" filled button (autofocus on open) |
| `action:decline-invitation` | `InviteAcceptResult.declined` | Secondary "Từ chối" text button |

System back / scrim tap are handled by the dialog's `barrierDismissible: false` + system pop and resolve to `InviteAcceptResult.dismissed` without a dedicated handler.
