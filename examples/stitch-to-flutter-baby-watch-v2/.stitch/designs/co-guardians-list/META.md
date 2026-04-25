# Normalization: Co-guardians

Normalized from: `.stitch/designs/co-guardians-list/code.html`
Source reference: `.stitch/references/ch_p_nh_n_l_i_m_i/code.html`
Glossary: `stitch-flutter/references/flutter-html-glossary.md`

## Section mapping

| Source | Glossary |
|--------|----------|
| `<body class="font-body ...">` | `<div class="scaffold" data-bg="surface">` |
| `<header class="sticky top-0 ...">` | `<div class="app-bar">` |
| `<button>close</button>` (top-bar) | `<button class="icon-btn" data-handler="navigate:back">` |
| `<h1 class="...text-xl">BabyGuard</h1>` | `<span class="title-large">` |
| `<main class="min-h-... flex items-center">` | `<div class="body">` |
| `<div class="w-full max-w-lg bg-surface-container-lowest rounded-[28px] ...">` | `<div class="card" data-bg="surfaceContainerLowest">` |
| Avatar halo `<div class="absolute inset-0 bg-tertiary-container ... animate-pulse">` | `<div class="stack" data-bg="tertiaryContainer" data-animate="pulse">` |
| `<img class="w-full h-full object-cover" src="...">` (portrait) | `<img class="avatar">` |
| Shield badge `<div class="absolute -bottom-1 -right-1 bg-tertiary ...">` | `<div class="badge" data-bg="tertiary">` containing `<svg class="icon" data-name="shield">` |
| `<h2 class="font-headline font-bold text-4xl">Bé Na</h2>` | `<span class="headline-large">` |
| `<span class="text-on-surface-variant">Mẹ đã mời bạn</span>` | `<span class="body-medium">` |
| Inviter pill `<span class="bg-surface-container-highest ...uppercase">Người sở hữu</span>` | `<span class="chip" data-bg="surfaceContainerHighest">` with `<span class="label-small">` |
| Info row container `<div class="flex gap-4">` | `<div class="row">` |
| Info icon halo `<div class="w-10 h-10 rounded-full bg-tertiary-fixed">` | `<div class="stack" data-bg="tertiaryFixed">` |
| `<span class="material-symbols-outlined">notifications_active</span>` | `<svg class="icon" data-name="notifications_active">` |
| `<span class="material-symbols-outlined">group_off</span>` | `<svg class="icon" data-name="group_off">` |
| Info copy `<p class="text-on-surface-variant text-sm">` | `<span class="body-small">` |
| Primary CTA `<button class="w-full h-14 bg-on-surface text-surface rounded-full">Chấp nhận</button>` | `<button class="filled-btn" data-bg="onSurface" data-color="surface">` |
| Secondary CTA `<button class="... border-outline-variant ...">Từ chối</button>` | `<button class="elevated-btn">` |
| Security footer `<div class="bg-surface-container-low p-6 text-center">` | `<div class="card" data-bg="surfaceContainerLow">` |
| `<span class="material-symbols-outlined">verified_user</span>` | `<svg class="icon" data-name="verified_user">` |
| Security text `<p class="text-xs ...">Bảo mật bởi ...</p>` | `<span class="label-small">` |
| `<footer class="fixed bottom-8 ...">` status pill | `<div class="bottom-nav">` |
| Status dot `<div class="w-2 h-2 rounded-full bg-tertiary animate-pulse">` | `<div class="badge" data-bg="tertiary" data-animate="pulse">` |
| Status label `<span class="text-[10px] ...uppercase">Hệ thống đang hoạt động</span>` | `<span class="label-small">` |

## Token deviations

- `bg-[#fbf9f5]` (header literal hex) — exact match: `surface` (`#fbf9f5`).
- `bg-surface-container-lowest` (`#ffffff`) — exact match: `surfaceContainerLowest`. Used for the invitation card.
- `bg-tertiary-container` at `opacity-20` (halo) — closest token: `tertiaryContainer`; opacity dropped during normalization (animation preserved via `data-animate="pulse"`).
- `bg-surface-container` (inner avatar frame) — merged into the `<img class="avatar">` glossary form; surface-container framing dropped as the avatar widget owns its own clip.
- `bg-tertiary` / `text-on-tertiary` (shield badge) — mapped to `tertiary` / `onTertiary`.
- `bg-surface-container-highest` + `text-on-surface-variant` (inviter pill) — exact matches: `surfaceContainerHighest` / `onSurfaceVariant`.
- `bg-tertiary-fixed` + `text-tertiary` (notification row halo) — exact matches: `tertiaryFixed` / `tertiary`.
- `bg-surface-container-high` + `text-secondary` (group-off row halo) — exact matches: `surfaceContainerHigh` / `secondary`.
- `text-on-surface-variant` (body copy) — exact match: `onSurfaceVariant`.
- `bg-on-surface` + `text-surface` (primary CTA) — inverted pair; mapped to `data-bg="onSurface"` / `data-color="surface"`.
- `border-outline-variant` + `text-on-surface-variant` (secondary CTA) — border role collapsed into `elevated-btn` glossary class; color preserved via `onSurfaceVariant`.
- `bg-surface-container-low` (security strip) — exact match: `surfaceContainerLow`.
- `bg-surface-container-lowest/80 backdrop-blur-xl` (footer pill) — closest token: `surfaceContainerLowest`; opacity + blur dropped.

## Handlers assigned

| data-handler | Source element |
|--------------|----------------|
| `navigate:back` | top-bar `close` icon button |
| `action:accept-invitation` | "Chấp nhận" primary button |
| `action:decline-invitation` | "Từ chối" secondary button |
