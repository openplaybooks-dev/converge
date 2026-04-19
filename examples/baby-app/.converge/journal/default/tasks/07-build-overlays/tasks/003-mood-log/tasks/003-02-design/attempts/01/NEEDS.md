# Needs: 07-build-overlays/003-mood-log/003-02-design

## Description

Generate constrained HTML design for Mood Logging overlay using Flutter HTML Glossary

## Inputs

- `.stitch/designs/mood-log/SPEC.md`
- `.stitch/system/DESIGN.md`
- `.stitch/system/META.md`

## Expected Outputs

- `.stitch/designs/mood-log/META.md`
- `.stitch/designs/mood-log/design.html`

## Checks

- **design-exists**: design.html exists for mood-log
- **meta-exists**: META.md exists for mood-log
- **uses-glossary**: HTML uses Flutter HTML Glossary vocabulary
