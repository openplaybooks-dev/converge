# Normalization: History

Normalized from: `.stitch/designs/history/code.html`
Source reference: `.stitch/references/history/code.html`
Glossary: `stitch-flutter/references/flutter-html-glossary.md`

## Section mapping

| Source | Glossary |
|--------|----------|
| `<body class="bg-background text-on-surface">` | `<div class="scaffold" data-bg="surface">` |
| `<header class="bg-[#fbf9f5] fixed top-0 w-full z-50">` | `<div class="app-bar" data-bg="surface">` |
| `<main class="pt-24 pb-48 px-6 max-w-2xl mx-auto">` | `<div class="body">` |
| `<nav class="fixed bottom-0 ...">` | `<div class="bottom-nav" data-bg="surfaceContainerLowest">` |
| Top-bar `<img class="w-10 h-10 rounded-full">` | `<img class="avatar">` |
| Top-bar `<h1 class="text-2xl font-bold">History</h1>` | `<span class="headline-small">` |
| Top-bar `<span class="material-symbols-outlined">search</span>` | `<button class="icon-btn">` with `<svg class="icon" data-name="search">` |
| Top-bar `<span class="material-symbols-outlined">more_vert</span>` | `<button class="icon-btn">` with `<svg class="icon" data-name="more_vert">` |
| Filter bar `<section class="flex gap-3 overflow-x-auto">` | `<div class="row">` |
| Filter pill (active) `<button class="bg-on-surface text-surface rounded-full">Today</button>` | `<button class="filled-btn" data-bg="onSurface" data-color="surface">` with `<span class="label-small">` |
| Filter pill (inactive) `<button class="bg-surface-container-high text-on-surface-variant rounded-full">` | `<button class="filled-btn" data-bg="surfaceContainerHigh" data-color="onSurfaceVariant">` with `<span class="label-small">` |
| Event list `<div class="space-y-6">` | `<div class="column">` |
| Alert event card `<article class="bg-[#fff1ed] rounded-lg p-6">` | `<div class="ink-well">` wrapping `<div class="card" data-bg="errorContainer">` |
| Safe event card `<article class="bg-tertiary-container rounded-lg p-6">` | `<div class="ink-well">` wrapping `<div class="card" data-bg="tertiaryContainer">` |
| Card kicker `<p class="text-xs uppercase text-error opacity-70">Alert Event</p>` | `<span class="label-small" data-color="error">` |
| Card title `<h2 class="text-xl font-headline font-bold">Left Safe Zone</h2>` | `<span class="title-large" data-color="onSurface">` |
| Status pill `<div class="bg-white/40 backdrop-blur-md border border-error/10 rounded-full">warning Alert</div>` | `<span class="chip" data-bg="surface" data-color="error">` with `<svg class="icon" data-name="warning">` + `<span class="label-small">` |
| Inline meta `<div class="flex items-center gap-2">child_care Bé Na</div>` | `<div class="row">` with `<svg class="icon" data-name="child_care">` + `<span class="body-medium" data-color="onSurfaceVariant">` |
| Inline meta `<div class="flex items-center gap-2">schedule 10:24 AM</div>` | `<div class="row">` with `<svg class="icon" data-name="schedule">` + `<span class="body-medium">` |
| Right-aligned status tag `<span class="border border-error/20 bg-error/5 text-error rounded-full">Left Safe Zone</span>` | `<span class="chip" data-bg="surface" data-color="error">` with `<span class="label-small">` |
| Connection-lost icon `<span data-icon="link_off">` | `<svg class="icon" data-name="link_off" data-color="error">` |
| Connection-lost timestamp icon `<span data-icon="history">` | `<svg class="icon" data-name="history">` |
| Export button `<button class="w-full h-14 rounded-full bg-surface-container-high">ios_share Export Logs</button>` | `<button class="filled-btn" data-bg="surfaceContainerHigh" data-color="onSurface">` with `<svg class="icon" data-name="ios_share">` + `<span class="label-large">` |
| Clear button `<button class="px-6 py-3 rounded-full text-on-surface-variant">Clear History</button>` | `<button class="text-btn" data-color="onSurfaceVariant">` with `<span class="label-large">` |
| Bottom-nav item `<a class="flex flex-col">home Trang chủ</a>` | `<button class="icon-btn">` containing `<div class="column">` with `<svg class="icon">` + `<span class="label-small">` |

## Token deviations

- `bg-background` (body) — collapsed to `surface` (`#fbf9f5`); same hex value, `surface` is the canonical glossary token.
- `bg-[#fbf9f5]` (header) — exact match: `surface` (`#fbf9f5`).
- `bg-[#fff1ed]` (alert event card) — no direct token; mapped to `errorContainer` (closest semantic role for soft alert background).
- `bg-tertiary-container` (safe event card) — exact match: `tertiaryContainer` (`#dff6ee`).
- `text-error` / `border-error/*` / `bg-error/*` — mapped to `error` (`#9e422c`). Opacity variants (`/5`, `/10`, `/20`, `/70`) dropped; renderer applies subtle states.
- `bg-white/40` (inner status pill background) — collapsed to `surface`. Backdrop blur dropped (presentation-only).
- `text-on-surface` / `text-on-surface-variant` — exact match: `onSurface`, `onSurfaceVariant`.
- `bg-on-surface` / `text-surface` (active filter pill) — exact match: `onSurface` bg + `surface` fg (inverted role).
- `bg-surface-container-high` (inactive filter pill, export button) — exact match: `surfaceContainerHigh` (`#e8e9e1`).
- `bg-white/90` (bottom-nav) — closest token: `surfaceContainerLowest` (`#ffffff`). Opacity and `backdrop-blur-xl` dropped (presentation-only).
- `text-primary` (active bottom-nav item "Trang chủ") — exact match: `primary` (`#5e5e5e`).
- `text-secondary/60` (inactive bottom-nav items) — collapsed to `onSurfaceVariant`; the `/60` opacity variant has no token equivalent and `onSurfaceVariant` is the canonical inactive nav role.
- `text-tertiary` (safe event kicker, status icons/chips) — exact match: `tertiary` (`#4f635e`).
- Tailwind utilities `pb-safe`, `shadow-2xl`, `backdrop-blur-*`, `hover:*`, `active:scale-*`, `transition-*`, `overflow-x-auto`, `scrollbar-hide`, `space-y-*` — all dropped (presentation/interaction-only; renderer applies safe-area, shadows, scrolling, and press feedback).
- `font-variation-settings: 'FILL' 1` on `warning` and `verified_user` icons — dropped; renderer applies filled-style icon variants based on glossary defaults.
- `data-alt` portrait description on the avatar `<img>` — dropped; non-semantic for the glossary, preserved by `alt="Profile"`.
- Dark-mode classes (`dark:bg-[#1c1c1a]`, `dark:text-[#fbf9f5]`) — dropped; theme variants are renderer-applied, not authored per element.

## Handlers assigned

| data-handler | Source element |
|--------------|----------------|
| `action:open-search` | top-bar `search` icon |
| `action:open-menu` | top-bar `more_vert` icon |
| `action:filter-today` | "Today" filter pill (active) |
| `action:filter-yesterday` | "Yesterday" filter pill |
| `action:filter-7-days` | "Last 7 Days" filter pill |
| `navigate:event-detail` | each event card (Left Safe Zone, Back Home, Connection Lost) ink-well wrapper |
| `action:export-logs` | "Export Logs" filled button |
| `action:clear-history` | "Clear History" text button |
| `navigate:home` | bottom-nav "Trang chủ" item (active) |
| `navigate:devices` | bottom-nav "Thiết bị" item |
| `navigate:safety` | bottom-nav "An toàn" item |
| `navigate:settings` | bottom-nav "Cài đặt" item |
