# Normalization: Add Beacon

Normalized from: `.stitch/designs/add-beacon/code.html`
Source reference: `.stitch/references/th_m_beacon_phase_2/code.html`
Glossary: `stitch-flutter/references/flutter-html-glossary.md`

## Section mapping

| Source | Glossary |
|--------|----------|
| `<body class="bg-[#F4F2EE] text-on-surface min-h-screen">` | `<div class="scaffold" data-bg="surface">` |
| `<header class="bg-stone-50 ... docked full-width top-0 z-40">` | `<div class="app-bar">` |
| Top-bar `<button>arrow_back</button>` | `<button class="icon-btn">` with `<svg class="icon" data-name="arrow_back">` |
| Top-bar `<h1>Beacon Registry</h1>` | `<span class="title-large">` |
| Top-bar avatar `<div class="w-10 h-10 rounded-full"><img></div>` | `<img class="avatar">` |
| `<main class="max-w-xl mx-auto px-6 pb-32">` | `<div class="body">` |
| Editorial header `<section class="mt-12 mb-10"><h2>Thêm Beacon</h2><p>...</p></section>` | `<div class="column">` with `<span class="headline-large">` + `<span class="body-large">` |
| Radar `<div class="relative flex flex-col items-center">` concentric rings + center icon + caption | `<div class="stack">` with three `<div class="stack">` ring layers + `<div class="stack" data-bg="onSurface" data-animate="pulse">` containing `<svg class="icon" data-name="bluetooth_searching">` + `<span class="label-small">` |
| Found-devices header `<div class="flex justify-between"><h3>Thiết bị tìm thấy</h3><span class="bg-tertiary-container rounded-full">3 Mới</span></div>` | `<div class="row">` with `<span class="title-large">` + `<span class="chip" data-bg="tertiaryContainer" data-color="tertiary">` |
| Card 1 outer `<div class="bg-surface-container-lowest rounded-lg p-6 shadow-[...]">` | `<div class="card" data-bg="surfaceContainerLowest">` |
| Card 1 icon tile `<div class="w-14 h-14 bg-surface-container rounded-2xl">child_care</div>` | `<div class="stack" data-bg="surfaceContainer">` with `<svg class="icon" data-name="child_care">` |
| Card 1 title `<p class="font-bold text-lg">Beacon: Bé Na</p>` | `<span class="title-medium">` |
| Card 1 subtitle row `cloud Đồng bộ nhóm theo dõi • Đồng bộ` | `<div class="row">` with `<svg class="icon" data-name="cloud">` + `<span class="label-small">` + `<div class="ink-well">` wrapping `<span class="label-small" data-color="secondary">Đồng bộ</span>` |
| Card 1 RSSI bar-graph `<div class="flex gap-0.5 items-end">...</div>` + `<p>-42 RSSI</p>` | `<div class="column">` with `<div class="row">` of four `<span class="badge" data-bg="onSurface">` + `<span class="label-small">` |
| Card 1 metadata grid `<div class="bg-surface-variant/30 rounded-xl p-4 grid grid-cols-3">UUID / Major / Minor</div>` | `<div class="card" data-bg="surfaceVariant">` with `<div class="row">` of three `<div class="column">` (label-small + body-small) |
| Card 1 CTA `<button class="w-full bg-on-surface text-surface rounded-full">Kết nối ngay</button>` | `<button class="filled-btn" data-bg="onSurface" data-color="surface">` with `<span class="label-large">` |
| Card 2 outer `<div class="bg-surface-container-lowest rounded-lg p-6 shadow-[...]">` | `<div class="card" data-bg="surfaceContainerLowest">` |
| Card 2 icon tile `<div class="w-12 h-12 bg-surface-container-high rounded-full">sensors</div>` | `<div class="stack" data-bg="surfaceContainerHigh">` with `<svg class="icon" data-name="sensors">` |
| Card 2 title `<p class="font-bold">Beacon #8210</p>` + subtitle | `<span class="title-medium">` + `<span class="label-small">` |
| Card 2 RSSI bars + `-78 RSSI` | `<div class="column">` with `<div class="row">` of four `<span class="badge">` (two onSurface + two surfaceVariant) + `<span class="label-small">` |
| Card 2 CTA `<button class="bg-surface-container-high px-6 py-2.5 rounded-full">Kết nối</button>` | `<button class="elevated-btn" data-bg="surfaceContainerHigh" data-color="onSurface">` with `<span class="label-large">` |
| Footer action `<div class="fixed bottom-28 ...">` with centered pill `<button>refresh Quét lại</button>` | `<div class="fab">` with `<button class="filled-btn" data-bg="onSurface" data-color="surface">` containing `<svg class="icon" data-name="refresh">` + `<span class="label-large">` |
| `<nav class="fixed bottom-0 ... bg-white/90 backdrop-blur-xl">` | `<div class="bottom-nav" data-bg="surfaceContainerLowest">` |
| Nav item `<a class="flex flex-col"><span>home</span><span>Trang chủ</span></a>` | `<button class="icon-btn">` containing `<div class="column">` with `<svg class="icon">` + `<span class="label-small">` |

## Token deviations

- `bg-[#F4F2EE]` (body) — no direct token; normalized to `surface` (`#fbf9f5`), the canonical page background.
- `bg-stone-50` (header), `bg-white/90` (bottom-nav) — normalized to `surface` and `surfaceContainerLowest` respectively; opacity and backdrop-blur dropped.
- `bg-stone-200`, `bg-stone-300`, `bg-stone-200/30` (radar rings) — no direct tokens; collapsed to `surfaceContainer` / `surfaceContainerHigh` / `surfaceVariant` by tonal proximity. Opacity and scale dropped.
- `bg-on-surface` / `text-surface` (center radar puck, primary CTAs, rescan pill) — exact: `onSurface` / `surface`. Used for high-contrast dark-on-light CTAs matching the reference's inverse-surface style.
- `bg-surface-container-lowest` (cards) — exact: `surfaceContainerLowest` (`#ffffff`).
- `bg-surface-container` / `bg-surface-container-high` (icon tiles) — exact: `surfaceContainer` / `surfaceContainerHigh`.
- `bg-surface-variant/30` (metadata grid) — exact base `surfaceVariant`; opacity (`/30`) dropped.
- `bg-tertiary-container` / `text-tertiary` (3 Mới chip) — exact: `tertiaryContainer` / `tertiary`.
- `text-on-surface-variant` and all secondary text — exact: `onSurfaceVariant`.
- `text-secondary` (Đồng bộ link) — exact: `secondary`.
- `text-primary` (active bottom-nav "Thiết bị") — exact: `primary`.
- `font-mono` on UUID/Major/Minor values — dropped; renderer applies mono for `body-small` fields if configured. Glossary has no `data-font` attribute.
- `animate-pulse`-style pulsing on the scanning puck — preserved as `data-animate="pulse"` on the central stack (reference uses `shadow-2xl` + scale rings rather than an explicit `animate-pulse` class, but the scanning motion is implied by the concentric rings and the "Đang quét" caption).
- `shadow-[0_8px_24px_...]`, `shadow-2xl`, `hover:*`, `active:scale-*`, `transition-*`, `backdrop-blur-xl`, `pb-safe`, `tracking-*`, `uppercase`, `leading-tight`, `-webkit-font-smoothing` — all dropped (presentation/interaction-only; renderer applies elevation, press feedback, and typographic defaults).
- RSSI bar-graph drawn as four ascending `<div>` slivers in reference — glossary has no bar-graph primitive, so normalized as four `<span class="badge">` in a `row`. The ascending/weakening pattern is preserved by alternating `onSurface` vs. `surfaceVariant` fill.
- Floating "Quét lại" button positioned `fixed bottom-28` — mapped to `<div class="fab">`. This is a persistent centered pill above the bottom-nav, which is closer semantically to a FAB than a regular CTA.

## Handlers assigned

| data-handler | Source element |
|--------------|----------------|
| `action:go-back` | top-bar `arrow_back` icon button |
| `action:sync-group` | Card 1 inline "Đồng bộ" link |
| `action:connect-beacon-be-na` | Card 1 "Kết nối ngay" primary button |
| `action:connect-beacon-8210` | Card 2 "Kết nối" secondary button |
| `action:rescan` | footer "Quét lại" FAB |
| `navigate:home` | bottom-nav "Trang chủ" item |
| `navigate:devices` | bottom-nav "Thiết bị" item (active) |
| `navigate:safety` | bottom-nav "An toàn" item |
| `navigate:settings` | bottom-nav "Cài đặt" item |
