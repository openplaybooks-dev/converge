# Normalization: Home — Safe

Normalized from: `.stitch/designs/home-safe/code.html`
Source reference: `.stitch/references/babyguard_home_phase_2_safe_updated/code.html`
Glossary: `stitch-flutter/references/flutter-html-glossary.md`

## Section mapping

| Source | Glossary |
|--------|----------|
| `<body class="bg-surface ...">` | `<div class="scaffold" data-bg="surface">` |
| `<header class="fixed top-0 ...">` | `<div class="app-bar">` |
| `<main class="pt-24 pb-32 px-6 ...">` | `<div class="body">` |
| `<nav class="fixed bottom-0 ...">` | `<div class="bottom-nav">` |
| Profile avatar `<div class="w-10 h-10 rounded-full"><img></div>` | `<img class="avatar">` |
| `<h1 class="text-xl font-extrabold">BabyGuard</h1>` | `<span class="title-large">` |
| `<button>...notifications</button>` (top-bar) | `<button class="icon-btn">` |
| Status pill `<div class="inline-flex ... safe-state px-6 py-2.5 rounded-full">` | `<span class="chip" data-bg="mint">` |
| `<h2 class="text-3xl font-extrabold">Bé Na</h2>` | `<span class="headline-large">` |
| `<p class="text-secondary text-sm">Còn Mẹ ...</p>` | `<span class="body-medium">` |
| Map section `<section class="relative h-72 ...">` | `<div class="card">` containing `<div class="stack">` |
| Map image `<img src="https://.../map">` | `<img class="network-image">` |
| Beacon point `<div class="absolute ...animate-ping">` | `<div class="stack" data-animate="pulse">` with `<div class="badge">` + `<svg class="icon">` |
| Beacon icon `<span class="material-symbols-outlined">child_care</span>` | `<svg class="icon" data-name="child_care">` |
| Last-seen overlay `<div class="absolute bottom-4 ... bg-white/90 rounded-lg">` | `<div class="card">` containing `<div class="row">` |
| Last-seen label `<span class="text-[10px] uppercase ...">` | `<span class="label-small">` |
| Last-seen value `<span class="font-bold ...">Phòng khách • ...</span>` | `<span class="title-small">` |
| Locate `<button class="bg-primary ... rounded-full">near_me</button>` | `<button class="icon-btn" data-bg="primary">` |
| Beacon strip `<section class="bg-surface-container-lowest p-6 rounded-lg ...">` | `<div class="card">` |
| Beacon strip row `<div class="flex items-center justify-between">` | `<div class="ink-well">` containing `<div class="list-tile">` |
| Beacon icon halo `<div class="w-12 h-12 rounded-full bg-mint/30">` | `<div class="stack" data-bg="mint">` |
| Beacon strip title `<h3 class="text-lg font-bold">Bé Na</h3>` | `<span class="title-medium">` |
| Beacon strip subtitle `<p class="text-xs ...">Đang ở gần • 98% Pin</p>` | `<span class="body-small">` |
| `Chi tiết beacon` text button | `<button class="text-btn">` |
| Push-mute section `<section class="bg-white/60 rounded-lg p-6 ...">` | `<div class="card">` |
| Push-mute heading `<h3 class="text-base font-bold">Tạm dừng thông báo</h3>` | `<span class="title-medium">` |
| Push-mute copy `<p class="text-secondary text-xs ...">` | `<span class="body-small">` |
| Mute duration buttons `<button class="bg-white border ... rounded-full">5 phút</button>` etc. | `<button class="elevated-btn">` |
| Bottom-nav item `<a class="flex flex-col items-center ...">` | `<button class="icon-btn">` containing `<div class="column">` with `<svg class="icon">` + `<span class="label-small">` |

## Token deviations

- `bg-surface` (`#F4F2EE` in source Tailwind config) — closest token: `surface` (`#fbf9f5`). Used for scaffold and app-bar background.
- `safe-state` background `#D1EEDD` — exact match: `mint` (`#d1eedd`). Used for the "Đang an toàn" status chip.
- `bg-surface-container-lowest` (`#ffffff`) — exact match: `surfaceContainerLowest` (`#ffffff`). Used for map card, beacon strip, last-seen overlay, and bottom-nav.
- `bg-mint/30` (mint at 30% opacity) — closest token: `mint` (`#d1eedd`); opacity dropped during normalization. Used for the beacon icon halo.
- `bg-white` / `bg-white/60` / `bg-white/90` — closest token: `surfaceContainerLowest` (`#ffffff`); opacity dropped. Used for mute-duration buttons, push-mute card, and last-seen overlay.
- `text-primary` (`#006D32` in source) — mapped to `primary` token (`#5e5e5e` in this design system). Color hue diverges; preserved as `primary` for semantic role.
- `text-secondary` / `text-secondary/60` — mapped to `onSurfaceVariant` (`#5e6059`) for muted body/label copy.
- `text-on-background` — mapped to `onSurface` (`#31332e`).

## Handlers assigned

| data-handler | Source element |
|--------------|----------------|
| `navigate:notifications` | top-bar bell icon button |
| `action:locate-beacon` | map overlay `near_me` round button |
| `navigate:beacon-detail` | beacon-strip row (ink-well) and "Chi tiết beacon" text button |
| `action:mute-5min` | "5 phút" mute-duration button |
| `action:mute-10min` | "10 phút" mute-duration button |
| `action:mute-15min` | "15 phút" mute-duration button |
| `navigate:home` | bottom-nav "Trang chủ" item |
| `navigate:devices` | bottom-nav "Thiết bị" item |
| `navigate:safety` | bottom-nav "An toàn" item |
| `navigate:settings` | bottom-nav "Cài đặt" item |
