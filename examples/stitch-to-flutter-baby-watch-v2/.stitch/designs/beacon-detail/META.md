# Normalization: Beacon Detail

Normalized from: `.stitch/designs/beacon-detail/code.html`
Source reference: `.stitch/references/chi_ti_t_beacon_phase_2/code.html`
Glossary: `stitch-flutter/references/flutter-html-glossary.md`

## Section mapping

| Source | Glossary |
|--------|----------|
| `<body class="bg-surface min-h-screen">` | `<div class="scaffold" data-bg="surface">` |
| `<header class="sticky top-0 ... bg-[#fbf9f5]/80 backdrop-blur-lg">` | `<div class="app-bar">` |
| `<main class="max-w-screen-md mx-auto px-6 pt-10 pb-32">` | `<div class="body">` |
| `<nav class="fixed bottom-0 ...">` | `<div class="bottom-nav">` |
| Top-bar `<button>arrow_back</button>` | `<button class="icon-btn">` with `<svg class="icon" data-name="arrow_back">` |
| Top-bar `<h1>Beacon Detail</h1>` | `<span class="title-large">` |
| Top-bar `<span>more_vert</span>` | `<button class="icon-btn">` with `<svg class="icon" data-name="more_vert">` |
| Hero avatar `<div class="w-20 h-20 rounded-xl bg-secondary-container">child_care</div>` | `<div class="stack" data-bg="secondaryContainer">` with `<svg class="icon" data-name="child_care">` |
| Hero title `<h2 class="text-5xl font-extrabold">Bé Na</h2>` | `<span class="headline-large">` |
| Hero subtitle `<p>Beacon theo dõi của bé</p>` | `<span class="body-medium" data-color="onSurfaceVariant">` |
| Accordion card `<section class="bg-surface-container-low rounded-xl p-1">` | `<div class="card" data-bg="surfaceContainerLow">` |
| Accordion header row `<div class="flex items-center justify-between">settings_ethernet Chi tiết kỹ thuật expand_more</div>` | `<div class="ink-well">` containing `<div class="list-tile">` with `<svg class="icon" data-name="settings_ethernet">` + `<span class="title-medium">` + `<svg class="icon" data-name="expand_more">` |
| Accordion UUID label `<label class="text-[0.65rem] uppercase ...">UUID</label>` | `<span class="label-small" data-color="outline">` |
| Accordion UUID value `<p class="font-mono bg-surface rounded-lg ...">FDA5...</p>` | `<span class="body-small" data-bg="surface" data-p="sm|sm">` |
| Accordion Major/Minor grid `<div class="grid grid-cols-2">` | `<div class="row">` with two `<div class="column">` children |
| Monitoring card `<section class="bg-surface-container-lowest rounded-xl shadow-[...] p-8">` | `<div class="card" data-bg="surfaceContainerLowest">` |
| Monitoring header `<h3>Người cùng theo dõi</h3>` + `<div class="w-8 h-8 ...">group</div>` | `<span class="title-medium">` + `<div class="stack" data-bg="secondaryFixed">` with `<svg class="icon" data-name="group">` |
| User row `<div class="flex items-center justify-between group">` | `<div class="list-tile">` containing `<div class="row">` |
| User avatar letter `<div class="w-14 h-14 rounded-full bg-[#E8F5E9] ...">M</div>` | `<div class="stack" data-bg="secondaryContainer">` with `<span class="title-medium" data-color="secondary">M</span>` |
| User name `<p class="font-bold text-lg">Mẹ</p>` | `<span class="title-medium">` |
| User timestamp `<p class="text-xs text-outline uppercase">Vừa xong</p>` | `<span class="label-small" data-color="outline">` |
| Status chip (near) `<span class="bg-secondary-container ... rounded-full"><span class="bg-secondary animate-pulse"></span>Đang gần beacon</span>` | `<span class="chip" data-bg="secondaryContainer" data-color="onSecondaryContainer">` with `<span class="badge" data-bg="secondary" data-animate="pulse">` + `<span class="label-small">` |
| Status chip (far, amber) `<span class="bg-[#FFF9C4]/50 text-[#F9A825] rounded-full">Xa / không thấy</span>` | `<span class="chip" data-bg="warningPeach" data-color="warningAmber">` |
| Status chip (offline) `<span class="bg-surface-container-high text-outline rounded-full">Ngoại tuyến</span>` | `<span class="chip" data-bg="surfaceContainerHigh" data-color="outline">` |
| Invite CTA `<button class="bg-primary text-on-primary rounded-full ...">person_add Mời người cùng theo dõi</button>` | `<button class="filled-btn" data-bg="primary" data-color="onPrimary">` with `<svg class="icon" data-name="person_add">` + `<span class="label-large">` |
| Manage link `<a>Quản lý danh sách arrow_forward</a>` | `<div class="ink-well">` with `<span class="label-large" data-color="primary">` + `<svg class="icon" data-name="arrow_forward">` |
| Decorative section `<section>` with `<img class="opacity-10 grayscale">` + error-outline button | `<div class="stack">` with `<img class="network-image">` + `<button class="elevated-btn" data-color="error">` |
| Leave button `<button class="text-error border border-error/20 rounded-full">Rời nhóm theo dõi</button>` | `<button class="elevated-btn" data-color="error">` with `<span class="label-large">` |
| Bottom-nav item `<a class="flex flex-col">` | `<button class="icon-btn">` containing `<div class="column">` with `<svg class="icon">` + `<span class="label-small">` |

## Token deviations

- `bg-secondary-container` — exact match: `secondaryContainer`. Used for hero avatar tile and "near" status chip.
- `text-secondary` / `bg-secondary` — exact match: `secondary` (`#4f635e`). Used for hero icon tint and pulsing "near" dot.
- `bg-[#E8F5E9]` (Mẹ avatar bg) — no direct token; collapsed to `secondaryContainer` (same green-family role).
- `bg-[#FFF9C4]` / `text-[#F9A825]` / `bg-[#FFF9C4]/50` (Bố avatar + "Xa" chip) — no direct token; normalized as semantic extensions `warningPeach` (bg) and `warningAmber` (fg). Opacity (`/50`) dropped.
- `bg-surface-container-low` (accordion card) — exact match: `surfaceContainerLow` (`#f5f4ee`).
- `bg-surface-container-lowest` (monitoring card, bottom-nav) — exact match: `surfaceContainerLowest` (`#ffffff`). Opacity (`/90`) dropped.
- `bg-surface-container-high` / `text-outline` (Bà Nội avatar + offline chip) — exact match: `surfaceContainerHigh`, `outline`.
- `bg-secondary-fixed` / `text-on-secondary-fixed` (monitoring header group badge) — exact match: `secondaryFixed`, `onSecondaryFixed`.
- `text-on-surface` / `text-on-surface-variant` — exact match: `onSurface`, `onSurfaceVariant`.
- `text-primary` / `bg-primary` / `text-on-primary` — exact match: `primary` (`#5f5e5e`), `onPrimary` (`#faf7f6`). Used for top-bar title, active bottom-nav item, invite CTA, and manage-list link.
- `text-error` / `bg-error/5` / `border-error/20` (leave-group button) — mapped to `error` (`#9f403d`). Opacity variants (`/5`, `/20`) dropped; renderer applies outline/press states.
- `bg-[#fbf9f5]/80` (app-bar) — closest token: `surface` (`#fbf9f5`). Opacity and backdrop blur dropped (presentation-only).
- `bg-white` borders on user avatars (`border-2 border-white`) — dropped; renderer applies avatar ring if needed.
- `backdrop-blur-lg`, `backdrop-blur-xl`, `shadow-[...]`, `hover:*`, `active:scale-*`, `transition-*`, `pb-safe`, `opacity-10 grayscale`, `font-mono` — all dropped (presentation/interaction-only; renderer applies safe-area, shadows, press feedback, and monospace defaults).
- Desktop nav links in `<header>` (`<div class="hidden md:flex">...Home / Beacons / Alerts / Settings</div>`) — dropped. Mobile layout is canonical; desktop-only affordances have no glossary equivalent and are redundant with the bottom-nav.

## Handlers assigned

| data-handler | Source element |
|--------------|----------------|
| `action:go-back` | top-bar `arrow_back` icon button |
| `action:open-menu` | top-bar `more_vert` icon button |
| `action:toggle-tech-details` | "Chi tiết kỹ thuật" accordion header ink-well |
| `action:invite-follower` | "Mời người cùng theo dõi" primary button |
| `navigate:manage-followers` | "Quản lý danh sách" link (ink-well) |
| `action:leave-group` | "Rời nhóm theo dõi" outline button |
| `navigate:home` | bottom-nav "Trang chủ" item |
| `navigate:devices` | bottom-nav "Thiết bị" item (active) |
| `navigate:safety` | bottom-nav "An toàn" item |
| `navigate:settings` | bottom-nav "Cài đặt" item |
