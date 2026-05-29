---
id: 01-greet
title: Produce a greeting JSON with an HTML preview for human review
depends_on: []
outputs:
  - output/greeting.json
  - output/greeting.preview.html
checks:
  - id: greeting-exists
    cmd: test -f output/greeting.json
    description: output/greeting.json exists
  - id: valid-json
    cmd: node -e "JSON.parse(require('fs').readFileSync('output/greeting.json','utf8'))"
    description: greeting.json is valid JSON
  - id: has-required-fields
    cmd: node -e "const d=JSON.parse(require('fs').readFileSync('output/greeting.json','utf8'));process.exit(d.name&&d.language&&d.timestamp?0:1)"
    description: greeting.json contains name, language, timestamp
  - id: preview-exists
    cmd: test -f output/greeting.preview.html
    description: output/greeting.preview.html exists
  - id: preview-tailwind
    cmd: grep -q "cdn.tailwindcss.com" output/greeting.preview.html
    description: preview loads Tailwind from the CDN
review:
  artifact: output/greeting.preview.html
  format: html
  prompt: |
    Review the rendered greeting card. Approve to accept output/greeting.json as
    final, or request changes — the task will re-attempt incorporating your
    feedback (both the JSON content and the preview's wording / styling).
---

Two files in one attempt.

1. Write `output/greeting.json` with the following shape:

   ```json
   {
     "name": "<a name to greet, e.g. \"World\" or \"Converge\">",
     "language": "<ISO 639-1 code, e.g. \"en\" or \"vi\">",
     "timestamp": "<current ISO 8601 timestamp>"
   }
   ```

2. Write a standalone HTML preview at `output/greeting.preview.html` that
   renders the greeting as a clean, centered card. Use Tailwind via the CDN
   (`<script src="https://cdn.tailwindcss.com"></script>`) — no build step.
   The preview should:

   - Greet the `name` in the natural language for the `language` field (English
     fallback otherwise — e.g. `vi` → `Xin chào, <name>!`).
   - Show the `language` code and `timestamp` as subtle meta beneath the
     headline.
   - Look good in the Studio's modal preview iframe (light theme, soft
     background, a card with shadow and rounded corners).

If reviewer feedback exists in your context from a previous attempt, address
each point explicitly this attempt — both in the JSON content (if the name or
language should change) and in the preview's wording / styling.
