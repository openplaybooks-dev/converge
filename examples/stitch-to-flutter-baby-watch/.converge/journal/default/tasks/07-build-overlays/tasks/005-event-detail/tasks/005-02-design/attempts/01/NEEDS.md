# Needs: 07-build-overlays/005-event-detail/005-02-design

## Description

Generate constrained HTML design for Event Detail overlay using Flutter HTML Glossary

## Inputs

- `.stitch/designs/event-detail/SPEC.md`
- `.stitch/system/DESIGN.md`
- `.stitch/system/META.md`

## Expected Outputs

- `.stitch/designs/event-detail/META.md`
- `.stitch/designs/event-detail/design.html`

## Checks

- **design-exists**: design.html exists for event-detail
- **meta-exists**: META.md exists for event-detail
- **uses-glossary**: HTML uses Flutter HTML Glossary vocabulary
