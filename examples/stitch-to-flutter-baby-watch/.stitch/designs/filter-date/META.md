# META.md — Filter Date Range Sheet

## Linked HTML Fidelity

Design generated from UX.md §3.6 History filter date range. No external HTML reference — built from spec.

## Screen Pattern

**Single Screen** — Bottom sheet with date range presets and custom picker.

## Glossary Compliance

- Bottom sheet: card with rounded top corners
- Drag handle: 32×4px centered pill
- Title: "Lọc theo ngày"
- Preset options: "Hôm nay", "7 ngày qua", "30 ngày qua", "Tùy chỉnh"
- Custom: from/to date inputs
- Apply button: "Áp dụng"

## Token Source

All tokens from `.stitch/system/DESIGN.md`.

## Compromises

- Date picker uses text inputs with date type — `showDatePicker` on tap in Flutter

## Score

Spec-compliant: date range filter with presets and custom range inputs.