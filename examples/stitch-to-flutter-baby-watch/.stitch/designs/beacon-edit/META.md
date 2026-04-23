# META.md — Beacon Edit Screen

## Linked HTML Fidelity

Design generated from UX.md §3.3 Beacon Detail edit flow. No external HTML reference — built from spec.

## Screen Pattern

**Single Screen** — Form screen for editing beacon name and configuration.

## Glossary Compliance

- Scaffold: `data-flutter="scaffold"`
- AppBar: `data-flutter="app-bar"` with back + "Chỉnh sửa Beacon" title + Save button
- Avatar section: centered circle with icon + "Đổi biểu tượng" button
- Form fields: name, UUID (readonly), major/minor grid, TX power
- Delete button: peach tint background, terracotta text

## Token Source

All tokens from `.stitch/system/DESIGN.md`.

## Compromises

- UUID display uses monospace font — `TextStyle` with `fontFamily: 'monospace'`

## Score

Spec-compliant: beacon edit form with avatar, name field, UUID display, major/minor inputs, TX power, delete action.