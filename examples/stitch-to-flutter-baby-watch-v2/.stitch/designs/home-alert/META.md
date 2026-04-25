# Normalization: Home — Alert

Normalized from: `.stitch/designs/home-alert/code.html`
Source reference: `.stitch/references/babyguard_home_phase_2_alert/code.html`
Glossary: `stitch-flutter/references/flutter-html-glossary.md`

## Section mapping

| Source | Glossary |
|--------|----------|
| `<body class="min-h-screen">` | `<div class="scaffold" data-bg="surface">` |
| `<header class="bg-[#F4F2EE] ... fixed top-0 z-40">` | `<div class="app-bar">` |
| `<main class="pt-24 pb-32 px-6 ...">` | `<div class="body">` |
| `<nav class="fixed bottom-0 ...">` | `<div class="bottom-nav">` |
| Top-bar `<button>menu</button>` | `<button class="icon-btn">` with `<svg class="icon" data-name="menu">` |
| Top-bar `<span>BabyGuard</span>` | `<span class="title-large">` |
| Top-bar profile `<div class="w-10 h-10 rounded-full"><img></div>` | `<img class="avatar">` |
| Status pill `<span class="bg-[#FCEEE9] text-[#9e422c] ... rounded-full">Cảnh báo</span>` | `<span class="chip" data-bg="alertPeach" data-color="alertCoral">` with `<svg class="icon" data-name="error">` + `<span class="label-large">` |
| `<h1 class="text-4xl font-extrabold">Kiểm tra ngay</h1>` | `<span class="headline-large">` |
| `<p class="text-on-surface-variant ...">Mẹ đang ở xa beacon</p>` | `<span class="body-medium">` |
| Map container `<div class="relative w-full aspect-[4/5] rounded-[2.5rem] ...">` | `<div class="card">` containing `<div class="stack">` |
| Map image `<img src="https://.../map">` | `<img class="network-image">` |
| Pulse layers `<div class="animate-ping">` + `<div class="rounded-full border ...">` | `<div class="stack" data-animate="pulse">` with `<div class="badge" data-bg="alertCoral">` |
| Baby photo `<div class="w-20 h-20 bg-white rounded-full ..."><img></div>` | `<img class="avatar">` inside `<div class="stack">` |
| Warning icon badge `<div class="absolute -bottom-1 -right-1 bg-[#9e422c] ...">warning</div>` | `<span class="badge" data-bg="alertCoral">` with `<svg class="icon" data-name="warning">` |
| Map overlay `<div class="absolute bottom-6 ... bg-surface-container-lowest/90 ... rounded-2xl">` | `<div class="card">` containing `<div class="row">` |
| Overlay label `<p class="text-[10px] uppercase ...">Cảnh báo vị trí</p>` | `<span class="label-small" data-color="alertCoral">` |
| Overlay value `<p class="text-base font-bold">Công viên Lê Văn Tám</p>` | `<span class="title-small">` |
| Overlay locate `<div class="w-12 h-12 bg-[#9e422c] ... rounded-full">near_me</div>` | `<button class="icon-btn" data-bg="alertCoral">` |
| Device info `<section class="bg-surface-container-lowest rounded-2xl ...">` | `<div class="card">` |
| Device-info row `<div class="p-6 flex items-center justify-between border-b ...">` | `<div class="list-tile">` containing `<div class="row">` |
| Bluetooth halo `<div class="w-12 h-12 bg-[#FCEEE9] rounded-full ...">bluetooth</div>` | `<div class="stack" data-bg="alertPeach">` with `<svg class="icon" data-name="bluetooth">` |
| Device title `<h3 class="font-bold">Beacon: Bé Na</h3>` | `<span class="title-medium">` |
| Device status `<span class="bg-error animate-pulse">` + `<span>Xa (Far)</span>` | `<div class="row" data-animate="pulse">` with `<span class="badge" data-bg="error">` + `<span class="body-small" data-color="alertCoral">` |
| Device settings `<button>settings</button>` | `<button class="icon-btn">` |
| Beacon detail `<button class="w-full px-6 py-4 ...">Chi tiết beacon</button>` | `<div class="ink-well">` containing `<div class="list-tile">` with `<span class="label-large">` + `<svg class="icon" data-name="chevron_right">` |
| Primary CTA `<button class="bg-[#31332e] text-[#fbf9f5] rounded-full ...">Tôi đã kiểm tra</button>` | `<button class="filled-btn" data-bg="primary" data-color="onPrimary">` with `<svg class="icon" data-name="task_alt">` + `<span class="label-large">` |
| Secondary CTA `<button class="bg-transparent border-2 border-[#FCEEE9] text-[#9e422c] rounded-full ...">Tắt cảnh báo</button>` | `<button class="elevated-btn" data-color="alertCoral">` with `<svg class="icon" data-name="notifications_off">` + `<span class="label-large">` |
| Bottom-nav item `<a class="flex flex-col items-center ...">` | `<button class="icon-btn">` containing `<div class="column">` with `<svg class="icon">` + `<span class="label-small">` |

## Token deviations

- `bg-[#F4F2EE]` (scaffold/app-bar) — closest token: `surface` (`#fbf9f5`). Hue diverges slightly; preserved as `surface` for semantic role.
- `bg-[#FCEEE9]` (alert pill bg, bluetooth halo, secondary-button border) — exact match: `alertPeach` (`#FCEEE9`). Used for alert-themed accents.
- `text-[#9e422c]` / `bg-[#9e422c]` (alert text, locate button, warning badge, secondary button text) — exact match: `alertCoral` (`#9e422c`). Used as the alert accent color.
- `bg-error` (status dot) — exact match: `error` (`#9e422c`). Same hex as `alertCoral`; kept distinct for semantic role (live status indicator vs. alert accent).
- `bg-surface-container-lowest` (device card, map overlay, bottom-nav) — exact match: `surfaceContainerLowest` (`#ffffff`). Opacity (`/90`) dropped during normalization.
- `bg-white` (baby photo halo) — collapsed into `<div class="stack">` background; closest token: `surfaceContainerLowest`. Opacity dropped.
- `text-[#31332e]` / `text-on-surface` — mapped to `onSurface` (`#31332e`). Exact match.
- `text-[#fbf9f5]` (primary button label) — mapped to `onPrimary` (`#f8f8f8`). Closest token; near-exact.
- `text-on-surface-variant` / `text-secondary` — mapped to `onSurfaceVariant` (`#5e6059`).
- `text-primary` (active bottom-nav item) — mapped to `primary` (`#5e5e5e`). Hue diverges from source `#31332e`; preserved as `primary` for semantic role.
- Border-ring `ring-4 ring-[#FCEEE9]` around the map card — dropped (no glossary equivalent for ring outlines); accent communicated by inner pulse.
- `pb-safe`, `backdrop-blur-md`, `editorial-shadow`, `tactile-press` — all dropped (presentation-only; renderer applies safe-area, blur, shadow, and press feedback).

## Handlers assigned

| data-handler | Source element |
|--------------|----------------|
| `action:open-menu` | top-bar `menu` icon button |
| `action:locate-beacon` | map overlay `near_me` round button |
| `navigate:beacon-settings` | device-card `settings` icon button |
| `navigate:beacon-detail` | "Chi tiết beacon" action row (ink-well) |
| `action:acknowledge-alert` | "Tôi đã kiểm tra" primary button |
| `action:toggle-mute` | "Tắt cảnh báo" secondary button |
| `navigate:home` | bottom-nav "Trang chủ" item |
| `navigate:devices` | bottom-nav "Thiết bị" item |
| `navigate:safety` | bottom-nav "An toàn" item |
| `navigate:settings` | bottom-nav "Cài đặt" item |
