---
id: 03-render-html
title: Render hello.html with Tailwind styling
depends_on:
  - 01-create-greeting
outputs:
  - output/hello.html
checks:
  - id: html-exists
    cmd: test -f output/hello.html
    description: output/hello.html exists
  - id: has-tailwind
    cmd: grep -q "cdn.tailwindcss.com" output/hello.html
    description: file loads Tailwind from the CDN
  - id: contains-name
    cmd: node -e "const fs=require('fs');const d=JSON.parse(fs.readFileSync('output/greeting.json','utf8'));const h=fs.readFileSync('output/hello.html','utf8');process.exit(h.includes(d.name)?0:1)"
    description: HTML body contains the `name` from greeting.json
---

Read `output/greeting.json` from the first task, then write `output/hello.html` — a complete, standalone HTML document that displays the greeting in a visually appealing way using **Tailwind CSS via the CDN**.

Requirements:

1. **Tailwind via CDN** — include `<script src="https://cdn.tailwindcss.com"></script>` in `<head>`. No build step.
2. **Standalone** — the file must render correctly when opened directly in a browser (or in an iframe), with no external assets other than the Tailwind CDN.
3. **Content** — a centered card containing:
   - A large heading greeting the `name` from `greeting.json` (e.g. `Hello, World!`). Use the natural greeting for the JSON's `language` field if you can; otherwise English.
   - A subtle line below showing the `language` code and the `timestamp`.
4. **Styling** — use Tailwind utility classes (typography, color, spacing, shadow, rounded corners). Aim for something pleasant to look at in the Studio's Artifacts preview, not a brutalist demo. Light theme is fine; a soft background colour and a card with shadow works well.

Keep the document under ~60 lines. No JavaScript beyond the Tailwind script tag.
