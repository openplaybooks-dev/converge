# Normalization: Home — Weak Signal

Normalized from: `.stitch/designs/home-weak/code.html`
Source reference: `.stitch/references/babyguard_home_phase_2_weak_signal/code.html`
Glossary: `stitch-flutter/references/flutter-html-glossary.md`

## Section mapping

| Source | Glossary |
|--------|----------|
| `<body class="text-on-surface ...">` | `<div class="scaffold" data-bg="surface">` |
| `<header class="bg-[#FBF9F5] sticky top-0 ...">` | `<div class="app-bar">` |
| `<main class="max-w-md mx-auto px-6 pt-8 pb-32 space-y-10">` | `<div class="body">` |
| `<nav class="fixed bottom-0 ...">` | `<div class="bottom-nav">` |
| Profile avatar `<div class="w-10 h-10 rounded-full"><img></div>` | `<img class="avatar">` |
| `<span class="text-2xl font-extrabold">Serenity</span>` | `<span class="title-large">` |
| Top-bar `<button>...notifications</button>` | `<button class="icon-btn">` |
| Weak-signal pill `<div class="inline-flex ... bg-[#FEF9E7] text-[#91711B] rounded-full">` | `<span class="chip" data-bg="alertPeach" data-color="error">` |
| `<h1 class="text-4xl font-bold">Giám sát đang gián đoạn</h1>` | `<span class="headline-large">` |
| `<p class="text-on-surface-variant text-sm">Còn Bố ...</p>` | `<span class="body-medium">` |
| Map section `<section class="relative">` with rounded card | `<div class="card">` containing `<div class="stack">` |
| Map image `<img src="https://.../map">` | `<img class="network-image">` |
| Pulsing marker `<div class="absolute ... animate-ping">` + portrait | `<div class="stack" data-animate="pulse">` with `<div class="badge" data-bg="error">` + `<img class="avatar">` |
| Last-seen overlay `<div class="absolute bottom-4 ... bg-white/80 ...">` | `<div class="card">` containing `<span class="label-small">` |
| Beacon info card `<div class="bg-surface-container-lowest rounded-lg ...">` | `<div class="card">` |
| Beacon icon halo `<div class="w-14 h-14 bg-surface-container rounded-full">` | `<div class="stack" data-bg="surfaceContainer">` |
| `<span class="material-symbols-outlined">child_care</span>` | `<svg class="icon" data-name="child_care">` |
| `<p class="font-headline font-bold text-xl">Bé Na</p>` | `<span class="title-medium">` |
| `<p class="text-on-surface-variant text-sm">Apple AirTag • Beacon</p>` | `<span class="body-small">` |
| Distance label `<span class="text-error font-bold text-2xl">Xa (Yếu)</span>` | `<span class="title-medium" data-color="error">` |
| `<span class="text-[10px] uppercase">Khoảng cách</span>` | `<span class="label-small">` |
| Action row `<button class="w-full ... border-t">Chi tiết beacon</button>` | `<div class="ink-well">` containing `<button class="text-btn">` |
| Push-mute section `<div class="bg-surface-container-low p-6 rounded-lg ...">` | `<div class="card">` |
| Push-mute heading `<h3 class="font-headline font-semibold">Tạm dừng thông báo</h3>` | `<span class="title-medium">` |
| Mute duration buttons `<button class="bg-surface-container-lowest rounded-full">5m</button>` etc. | `<button class="elevated-btn">` |
| Primary action `<button class="bg-on-surface text-surface py-5 rounded-full">Đang theo dõi</button>` | `<button class="filled-btn" data-bg="onSurface" data-color="surface">` |
| Footer copy `<p class="text-center ... text-sm">Chúng tôi sẽ ...</p>` | `<span class="body-small">` |
| Bottom-nav item `<a class="flex flex-col items-center ...">` | `<button class="icon-btn">` containing `<div class="column">` with `<svg class="icon">` + `<span class="label-small">` |

## Token deviations

- Weak-signal pill background `#FEF9E7` (warm pale yellow) — no token match. Used closest semantic token: `alertPeach` (`#fceee9`), preserving "soft caution" surface role.
- Weak-signal pill text `#91711B` (amber) — no token match. Used `error` token to preserve "warning state" semantic; hue diverges from source.
- Pulsing marker ring `bg-error/20` and white inner badge — opacity dropped; mapped to single `badge` with `data-bg="error"` and `data-animate="pulse"`. Inner white frame collapsed into the avatar element directly.
- Last-seen overlay `bg-white/80 backdrop-blur-md` — opacity/blur dropped; mapped to `surfaceContainerLowest` (`#ffffff`).
- Mute-duration buttons `bg-surface-container-lowest` — exact match: `surfaceContainerLowest` (`#ffffff`).
- Primary action `bg-on-surface text-surface` — preserved as `data-bg="onSurface"` / `data-color="surface"` (inverse contrast).
- Bottom-nav `bg-white/90 backdrop-blur-xl` — opacity/blur dropped; mapped to `surfaceContainerLowest`.
- `text-secondary/60` (inactive nav) — mapped to `onSurfaceVariant` (`#5e6059`) for muted label copy.
- The source `<h1>` contains a `<br/>` ("Giám sát<br/>đang gián đoạn"); collapsed to a single line for the glossary text element.

## Handlers assigned

| data-handler | Source element |
|--------------|----------------|
| `navigate:notifications` | top-bar bell icon button |
| `navigate:beacon-detail` | beacon info card "Chi tiết beacon" action row (ink-well + text-btn) |
| `action:mute-5min` | "5m" mute-duration button |
| `action:mute-10min` | "10m" mute-duration button |
| `action:mute-15min` | "15m" mute-duration button |
| `action:tracking-status` | primary "Đang theo dõi" radar button |
| `navigate:home` | bottom-nav "Trang chủ" item |
| `navigate:devices` | bottom-nav "Thiết bị" item |
| `navigate:safety` | bottom-nav "An toàn" item |
| `navigate:settings` | bottom-nav "Cài đặt" item |
