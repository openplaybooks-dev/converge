# META.md — Add Safe Zone Screen

## Linked HTML Fidelity

Design generated from UX.md §3.5 Add Safe Zone screen. No external HTML reference — built from spec.

## Screen Pattern

**Single Screen** — Form screen for creating a new safe zone.

## Glossary Compliance

- Scaffold: `data-flutter="scaffold"`
- AppBar: `data-flutter="app-bar"` with back + "Thêm vùng an toàn" title + Save button
- Form fields: text inputs with labels
- Radius selector: preset buttons (25m, 50m, 100m, 200m)
- Map preview: static image with rounded-xl
- Active toggle: switch with label

## Token Source

All tokens from `.stitch/system/DESIGN.md`.

## Compromises

- GPS capture button: `IconButton` triggering `Geolocator.getCurrentPosition()`
- Map preview: `Image` with overlay circle — `Stack` + `ClipPath` for zone circle

## Score

Spec-compliant: form with name, address, GPS capture, radius selector, map preview, active toggle, save button.