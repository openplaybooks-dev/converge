---
id: 01-greet
title: Greeting card for human review
depends_on: []
outputs:
  - output/greeting.json
handoff:
  artifact: output/greeting.preview.html
  format: html
  generate: |
    Generate output/greeting.preview.html — a standalone HTML greeting card
    that presents output/greeting.json for a human reviewer. Use the Tailwind
    CDN (<script src="https://cdn.tailwindcss.com"></script>). Greet the name
    in its language, show the language and timestamp as small meta text, and
    make it look good on a light theme rendered inside a modal. Single
    self-contained file — no external assets besides the CDN.
---

Write `output/greeting.json` with this shape:
```json
{"name": "World", "language": "en", "timestamp": "2026-05-30T00:00:00Z"}
```

This is the task's main work. The HTML greeting card shown to the human
reviewer is generated separately via the `handoff` block above.
