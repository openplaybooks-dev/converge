# Normalization: Onboarding

Normalized from: `.stitch/designs/onboarding/code.html`
Source reference: `.stitch/references/babyguard_onboarding_phase_2/code.html`
Glossary: `stitch-flutter/references/flutter-html-glossary.md`

## Section mapping

| Source | Glossary |
|--------|----------|
| `<body class="bg-[#F4F2EE] ...">` | `<div class="scaffold" data-bg="surface">` |
| `<header class="docked full-width top-0 ...">` | `<div class="app-bar">` |
| `<main class="flex-1 px-6 ...">` | `<div class="body">` |
| `<footer class="fixed bottom-0 ...">` | `<div class="bottom-nav">` |
| Hero illustration `<div class="relative w-44 h-44 bg-white/50 rounded-full">` | `<div class="stack">` containing `<img class="network-image">` |
| `<h1 class="text-3xl font-bold tracking-tight">` | `<span class="headline-large">` |
| `<p class="text-on-surface-variant text-base ...">` | `<span class="body-medium">` |
| Permission card `<div class="bg-white p-6 rounded-lg shadow ... flex items-start gap-4">` | `<div class="card">` containing `<div class="row">` |
| Card icon container `<div class="bg-tertiary-container p-3 rounded-full">` | `<div class="stack">` |
| `<span class="material-symbols-outlined" data-icon="...">` | `<svg class="icon" data-name="..." data-size="24">` |
| Card title `<h3 class="font-bold text-lg">` | `<span class="title-medium">` |
| Card body `<p class="text-sm ...">` | `<span class="body-small">` |
| Family card emphasis `<p class="text-xs ... italic">` | `<span class="label-small">` |
| Privacy note `<p class="text-center text-xs ...">` | `<span class="label-small">` |
| Page indicator `<div class="w-2 h-2 rounded-full bg-on-surface">` | `<span class="badge" data-bg="onSurface">` |
| Primary CTA `<button class="bg-on-surface text-surface w-full ... rounded-full">` | `<button class="filled-btn">` |
| Top-bar back arrow `<button>...arrow_back</button>` | `<button class="icon-btn">` |
| Top-bar "Bỏ qua" `<button class="text-sm ...">` | `<button class="text-btn">` |

## Token deviations

- `bg-[#F4F2EE]` (`#F4F2EE` background) — no exact token. Closest: `surface` (`#fbf9f5`). Used for scaffold, app-bar, and bottom-nav backgrounds.
- `bg-white` / `bg-white/50` — no exact token. Closest: `surfaceContainerLowest` (`#ffffff`). Used for permission cards and hero halo.
- `bg-primary-container` (`#e2e2e2`) — no exact token. Closest: `surfaceContainer` (`#efeee8`). Used for the notifications icon halo.
- `bg-secondary-container` (`#e3e2e2`) — no exact token. Closest: `surfaceContainer` (`#efeee8`). Used for the family-tracking icon halo.

## Handlers assigned

| data-handler | Source element |
|--------------|----------------|
| `navigate:back` | top-bar back-arrow icon button |
| `navigate:skip-onboarding` | top-bar "Bỏ qua" text button |
| `navigate:onboarding-next` | bottom "Bắt đầu" primary CTA |
