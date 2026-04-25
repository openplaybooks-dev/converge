# Normalization: Safe Zones

Normalized from: `.stitch/designs/safe-zones/code.html`
Source reference: `.stitch/references/safe_zones/code.html`
Glossary: `stitch-flutter/references/flutter-html-glossary.md`

## Section mapping

| Source | Glossary |
|--------|----------|
| `<body class="bg-surface ...">` | `<div class="scaffold" data-bg="surface">` |
| `<header class="fixed top-0 ...">` | `<div class="app-bar">` |
| `<main class="pt-24 pb-32 px-6 ...">` | `<div class="body">` |
| `<nav class="fixed bottom-0 ...">` | `<div class="bottom-nav">` |
| Top-bar menu `<button>...menu</button>` | `<button class="icon-btn">` |
| `<h1 class="text-xl font-bold">Safe Zones</h1>` | `<span class="title-large">` |
| Top-bar profile `<div class="w-10 h-10 rounded-full"><img></div>` | `<img class="avatar">` |
| Hero eyebrow `<span class="... tracking-widest uppercase">Guardian Overlook</span>` | `<span class="label-small">` |
| Hero headline `<h2 class="text-4xl font-extrabold">Peace of mind...</h2>` | `<span class="headline-large">` |
| Map section `<section class="relative group">` | `<div class="card">` containing `<div class="stack">` |
| Map image `<img src="https://.../map">` | `<img class="network-image">` |
| Safe Zone A `<div class="... bg-tertiary/20 border-2 border-tertiary rounded-full animate-pulse">` | `<div class="stack" data-animate="pulse">` with `<div class="badge" data-bg="tertiary">` |
| Safe Zone B `<div class="... bg-primary/10 border-2 border-primary/30 rounded-full">` | `<div class="stack">` with `<div class="badge" data-bg="primary">` |
| Safe Zone C `<div class="... bg-tertiary-fixed-dim/40 border-2 border-tertiary-dim rounded-full">` | `<div class="stack">` with `<div class="badge" data-bg="tertiaryFixedDim">` |
| Baby avatar marker `<div class="... rounded-full"><img></div>` | `<div class="stack">` containing `<img class="avatar">` |
| Glassmorphism overlay `<div class="absolute ... bg-white/80 backdrop-blur-xl ...">` | `<div class="card">` containing `<div class="row">` |
| Tracking icon `<span class="material-symbols-outlined">verified_user</span>` | `<svg class="icon" data-name="verified_user">` |
| Tracking heading `<p class="text-[12px] font-bold">Tracking Active</p>` | `<span class="label-large">` |
| Tracking subtitle `<p class="text-[10px]">3 Active Zones Monitored</p>` | `<span class="label-small">` |
| LIVE pill `<span class="... bg-tertiary-container text-tertiary rounded-full">LIVE</span>` | `<span class="chip" data-bg="tertiaryContainer">` |
| List header `<h3 class="text-2xl font-bold">Active Zones</h3>` | `<span class="headline-small">` |
| List hint `<span class="text-xs">Scroll to explore</span>` | `<span class="label-small">` |
| Zone card `<div class="bg-surface-container-lowest p-6 rounded-lg ...">` | `<div class="card">` containing `<div class="ink-well">` + `<div class="list-tile">` |
| Zone icon halo `<div class="w-12 h-12 bg-surface-container-low rounded-full">` | `<div class="stack" data-bg="surfaceContainerLow">` |
| Zone title `<h4 class="font-bold">Home</h4>` etc. | `<span class="title-medium">` |
| Zone radius pill `<span class="bg-tertiary-container ... rounded-full">200m</span>` | `<span class="chip" data-bg="tertiaryContainer">` |
| Zone address `<p class="text-sm truncate">123 Calm Valley ...</p>` | `<span class="body-small">` |
| Active zone toggle `<button class="w-12 h-6 bg-tertiary rounded-full ...">` | `<button class="icon-btn" data-bg="tertiary">` with `toggle_on` icon |
| Inactive zone toggle `<button class="w-12 h-6 bg-outline-variant rounded-full ...">` | `<button class="icon-btn" data-bg="outlineVariant">` with `toggle_off` icon |
| Zone edit button `<button>...edit</button>` | `<button class="icon-btn">` with `edit` icon |
| Insights bento `<section class="grid grid-cols-2 gap-4">` | `<div class="row">` containing two `<div class="card">` |
| Alerts tile icon `notifications_active` | `<svg class="icon" data-name="notifications_active">` |
| Alerts tile value `<p class="text-xl font-bold">24 Alerts</p>` | `<span class="headline-small">` |
| Alerts tile caption `<p class="text-xs">This week's ...</p>` | `<span class="label-small">` |
| Secure tile icon `battery_full` | `<svg class="icon" data-name="battery_full">` |
| Secure tile value `<p class="text-xl font-bold">98% Secure</p>` | `<span class="headline-small">` |
| Floating add button `<button class="fixed bottom-32 right-6 ...">Thêm vùng an toàn</button>` | `<div class="fab">` containing `<button class="filled-btn">` |
| Bottom-nav item `<a class="flex flex-col ...">` | `<button class="icon-btn">` containing `<div class="column">` with `<svg class="icon">` + `<span class="label-small">` |

## Token deviations

- `bg-tertiary/20`, `border-tertiary` (Safe Zone A) — opacity dropped; mapped to `tertiary` token.
- `bg-primary/10`, `border-primary/30` (Safe Zone B) — opacity dropped; mapped to `primary` token.
- `bg-tertiary-fixed-dim/40`, `border-tertiary-dim` (Safe Zone C) — opacity dropped; mapped to `tertiaryFixedDim` token.
- `bg-white/80 backdrop-blur-xl` (glassmorphism overlay) — closest token: `surfaceContainerLowest` (`#ffffff`); blur effect dropped during normalization.
- Top-bar menu and profile avatar backgrounds (`hover:bg-[#f5f4ee]`) — normalized to flat `surface` background; hover states dropped.
- FAB `bg-[#31332e]` — mapped to `onSurface` token (`#31332e`) for background.
- Bottom-nav `bg-white/90 backdrop-blur-xl` — closest token: `surfaceContainerLowest` (`#ffffff`); opacity and blur dropped.
- `text-secondary/60` on inactive nav items — mapped to `onSurfaceVariant` for muted label copy.
- `text-on-tertiary-fixed-variant` on "Optimal zone coverage" caption — preserved as `onTertiaryFixedVariant`.

## Handlers assigned

| data-handler | Source element |
|--------------|----------------|
| `navigate:menu` | top-bar hamburger `menu` button |
| `navigate:zone-detail` | each zone card ink-well (Home, School, Grandma) |
| `action:toggle-zone-home` | Home zone toggle pill |
| `action:toggle-zone-school` | School zone toggle pill |
| `action:toggle-zone-grandma` | Grandma's House zone toggle pill (inactive state) |
| `action:edit-zone-home` | Home zone edit icon button |
| `action:edit-zone-school` | School zone edit icon button |
| `action:edit-zone-grandma` | Grandma's House zone edit icon button |
| `action:add-safe-zone` | floating "Thêm vùng an toàn" add button |
| `navigate:home` | bottom-nav "Trang chủ" item |
| `navigate:devices` | bottom-nav "Thiết bị" item |
| `navigate:safety` | bottom-nav "An toàn" item (selected) |
| `navigate:settings` | bottom-nav "Cài đặt" item |
