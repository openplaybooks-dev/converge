# Normalization: Settings

Normalized from: `.stitch/designs/settings/code.html`
Source reference: `.stitch/references/settings/code.html`
Glossary: `stitch-flutter/references/flutter-html-glossary.md`

## Section mapping

| Source | Glossary |
|--------|----------|
| `<body class="bg-background">` | `<div class="scaffold" data-bg="surface">` |
| `<header class="w-full top-0 sticky z-50 bg-[#fbf9f5]">` | `<div class="app-bar" data-bg="surface">` |
| `<main class="max-w-2xl mx-auto px-6 pb-32 space-y-10">` | `<div class="body">` containing `<div class="column">` |
| `<nav class="fixed bottom-0 ...">` | `<div class="bottom-nav" data-bg="surfaceContainerLowest">` |
| Top-bar back `<button>` with `arrow_back` symbol | `<button class="icon-btn">` with `<svg class="icon" data-name="arrow_back">` |
| Top-bar `<h1 class="font-['Plus_Jakarta_Sans'] text-xl font-bold">Settings</h1>` | `<span class="title-large" data-color="onSurface">` |
| Top-bar `more_vert` button | `<button class="icon-btn">` with `<svg class="icon" data-name="more_vert">` |
| Profile `<section class="flex items-center gap-6">` | `<div class="row">` |
| Profile `<img class="w-24 h-24 rounded-lg">` with overlapping verified badge | `<div class="stack">` containing `<img class="avatar">` + `<span class="badge">` |
| Verified badge `<div class="absolute ... bg-on-surface">verified</div>` | `<span class="badge" data-bg="onSurface" data-color="surface">` with `<svg class="icon" data-name="verified">` |
| Profile `<h2 class="font-headline text-3xl font-extrabold">Elena Fisher</h2>` | `<span class="headline-small" data-color="onSurface">` |
| Profile plan row `<div class="inline-flex"><span>workspace_premium</span><span>Premium Guardian Plan</span></div>` | `<div class="row">` with `<svg class="icon" data-name="workspace_premium">` + `<span class="label-small">` |
| Section header `<label class="font-label text-xs uppercase">Alert Settings</label>` | `<span class="label-small" data-color="onSurfaceVariant">ALERT SETTINGS</span>` |
| Alert/Beacon/General card `<div class="bg-surface-container-lowest p-6 rounded-lg shadow-...">` | `<div class="card" data-bg="surfaceContainerLowest">` |
| "Recommended" pill `<span class="bg-tertiary-container text-tertiary rounded-full">Recommended</span>` | `<span class="chip" data-bg="tertiaryContainer" data-color="tertiary">` with `<span class="label-small">` |
| Timeout pill group `<div class="grid grid-cols-3 ...">` | `<div class="row">` of three `<button class="filled-btn">` |
| Active timeout `<button class="bg-surface-container-lowest text-on-surface">2 min</button>` | `<button class="filled-btn" data-bg="surfaceContainerLowest" data-color="onSurface">` |
| Inactive timeout `<button class="text-on-surface-variant">5 min</button>` | `<button class="filled-btn" data-bg="surfaceContainer" data-color="onSurfaceVariant">` |
| Audio Alert / Vibration / Do Not Disturb row `<div class="flex items-center justify-between">` | `<div class="list-tile">` containing `<div class="row">` |
| Toggle leading icon `<div class="w-10 h-10 rounded-full bg-surface-container">volume_up</div>` | `<span class="chip" data-bg="surfaceContainer" data-color="onSurfaceVariant">` with `<svg class="icon">` |
| Toggle label `<span class="font-headline font-semibold text-on-surface">Audio Alert</span>` | `<span class="title-small" data-color="onSurface">` |
| Toggle switch (on) `<div class="w-12 h-6 bg-on-surface rounded-full">` | `<span class="chip" data-bg="onSurface" data-color="surface">On</span>` |
| Toggle switch (off) `<div class="w-12 h-6 bg-surface-container-highest rounded-full">` | `<span class="chip" data-bg="surfaceContainerHighest" data-color="onSurfaceVariant">Off</span>` |
| RSSI label row `<div class="flex justify-between"><span>RSSI THRESHOLD</span><span>-75 dBm</span></div>` | `<div class="row">` with two `<span class="label-small">` |
| RSSI track `<div class="w-full h-2 bg-surface-container">` with `<div class="w-[65%] bg-on-surface">` | `<div class="stack" data-bg="surfaceContainer">` with `<div class="card" data-bg="onSurface">` |
| RSSI helper `<p class="text-[11px] text-on-surface-variant">` | `<span class="body-small" data-color="onSurfaceVariant">` |
| Scan interval row `<div class="bg-surface-container-low p-4 rounded-md">` | `<div class="ink-well">` wrapping `<div class="card" data-bg="surfaceContainerLow">` |
| Scan interval value `<span>15 seconds</span><span>unfold_more</span>` | `<span class="body-medium">` + `<svg class="icon" data-name="unfold_more">` |
| Mute pill (active) `<div class="bg-on-surface text-surface">5 min</div>` | `<button class="filled-btn" data-bg="onSurface" data-color="surface">` with `<svg class="icon" data-name="schedule">` + `<span class="label-small">` |
| Mute pill (inactive) `<div class="bg-surface-container-highest text-on-surface-variant">10 min</div>` | `<button class="filled-btn" data-bg="surfaceContainerHighest" data-color="onSurfaceVariant">` |
| System Permissions `<button class="w-full flex">security ... chevron_right</button>` | `<div class="ink-well">` wrapping `<div class="list-tile">` with chevron `<svg>` |
| Sign Out `<button class="w-full text-error bg-error-container/10">logout Sign Out</button>` | `<button class="filled-btn" data-bg="errorContainer" data-color="error">` with `<svg class="icon" data-name="logout">` + `<span class="label-large">` |
| Bottom-nav item `<a class="flex flex-col">home Trang chủ</a>` | `<button class="icon-btn">` containing `<div class="column">` with `<svg class="icon">` + `<span class="label-small">` |

## Token deviations

- `bg-background` (body) — collapsed to `surface` (`#fbf9f5`); same hex value, `surface` is the canonical glossary token.
- `bg-[#fbf9f5]` (header) — exact match: `surface` (`#fbf9f5`).
- `bg-surface-container-lowest` (cards) — exact match: `surfaceContainerLowest` (`#ffffff`).
- `bg-surface-container` (toggle leading icons, RSSI track, inactive timeout pill bg) — exact match: `surfaceContainer` (`#efeee8`).
- `bg-surface-container-low` (scan interval row) — exact match: `surfaceContainerLow` (`#f5f4ee`).
- `bg-surface-container-highest` (inactive mute pill, off-toggle track) — exact match: `surfaceContainerHighest` (`#e2e3db`).
- `bg-tertiary-container` (Recommended pill) — exact match: `tertiaryContainer` (`#dff6ee`); `text-tertiary` → `tertiary` (`#4f635e`).
- `bg-on-surface` / `text-surface` (active filter pill, on-toggle track, active mute pill) — exact match: `onSurface` bg + `surface` fg (inverted role).
- `text-on-surface` / `text-on-surface-variant` — exact match: `onSurface`, `onSurfaceVariant`.
- `bg-error-container/10` and `text-error` (Sign Out button) — opacity collapsed; mapped to `errorContainer` bg + `error` fg. The `/10` opacity has no token equivalent and renderer applies subtle states.
- `text-primary` (active bottom-nav item "Cài đặt") — exact match: `primary` (`#5e5e5e`).
- `text-secondary/60` (inactive bottom-nav items) — collapsed to `onSurfaceVariant`; the `/60` opacity variant has no token equivalent and `onSurfaceVariant` is the canonical inactive nav role.
- Custom shadow `shadow-[0_8px_24px_rgba(231,227,220,0.4)]` on cards — dropped; renderer applies card elevation defaults.
- Tailwind utilities `space-y-*`, `gap-*`, `pb-safe`, `shadow-*`, `backdrop-blur-*`, `hover:*`, `active:scale-*`, `transition-*`, `overflow-x-auto`, `custom-scrollbar`, `ring-*`, `cursor-pointer`, `tracking-*`, `leading-*`, `uppercase` — all dropped (presentation/interaction-only; renderer applies safe-area, shadows, scrolling, focus, and press feedback).
- `font-variation-settings: 'FILL' 1` on `verified` and `settings` icons — dropped; renderer applies filled-style icon variants based on glossary defaults.
- `data-alt` portrait description on the avatar `<img>` — dropped; non-semantic for the glossary, preserved by `alt="Elena Fisher"`.
- Dark-mode classes (`dark:bg-[#1a1c18]`, `dark:text-[#e4e3db]`, `dark:hover:bg-[#2a2b26]`) — dropped; theme variants are renderer-applied, not authored per element.
- Toggle UI (the visual `<div class="w-12 h-6">` switch) — represented as a labeled `chip` ("On"/"Off") since the glossary has no native switch element; the `list-tile` wrapper carries the toggle handler.
- RSSI progress bar — represented as a `stack` of two `card` divs (track + filled portion); the glossary has no native progress element.

## Handlers assigned

| data-handler | Source element |
|--------------|----------------|
| `navigate:back` | top-bar `arrow_back` icon button |
| `action:open-menu` | top-bar `more_vert` icon button |
| `action:set-timeout-2` | "2 min" timeout pill (active) |
| `action:set-timeout-5` | "5 min" timeout pill |
| `action:set-timeout-10` | "10 min" timeout pill |
| `action:toggle-audio-alert` | Audio Alert toggle row |
| `action:toggle-vibration` | Vibration toggle row |
| `action:open-scan-interval` | Scan Interval row (opens picker) |
| `action:mute-5` | Mute "5 min" pill (active) |
| `action:mute-10` | Mute "10 min" pill |
| `action:mute-15` | Mute "15 min" pill |
| `navigate:system-permissions` | "System Permissions" row |
| `action:toggle-dnd` | "Do Not Disturb" toggle row |
| `action:sign-out` | "Sign Out" button |
| `navigate:home` | bottom-nav "Trang chủ" item |
| `navigate:devices` | bottom-nav "Thiết bị" item |
| `navigate:safety` | bottom-nav "An toàn" item |
| `navigate:settings` | bottom-nav "Cài đặt" item (active) |
