---
name: converge-design
description: Use this skill to design and prototype interfaces for Converge — the framework for long-running AI agents that adapt until outcomes converge. Optimised for playbook surfaces (task tree, run journal, human-review flow) but works for any Converge-flavored artifact. Contains the canonical brand contract (tokens, voice, banned words), the editorial typography rules, and a working React UI kit for the playbook + review workspace.
user-invocable: true
---

# Converge — Design Skill

Read `README.md` first — it is the system reference. Then open `colors_and_type.css` for the tokens, `reference/converge-brand.json` for the voice contract, and `ui_kits/playbook/` for a working three-pane workspace recreation.

## Working artifacts

- **Static HTML / SVG / illustration** → reference the tokens with `<link rel="stylesheet" href="path/to/colors_and_type.css">`. Compose with the `.cv-*` semantic classes (`.cv-h2`, `.cv-body`, `.cv-eyebrow`, `.cv-pill`, `.cv-status`, `.cv-card`, `.cv-link-arrow`). Stay inside the brand contract — terracotta only for italic-emphasis, link hover, and `.cv-highlight`; status palette only on glyph-as-type captions.
- **React prototype** → copy from `ui_kits/playbook/` and adapt. `primitives.jsx` is the atoms layer. Keep style objects scoped to each file (the kit uses inline styles for collision safety).
- **Production code** → mirror `reference/converge-tokens.css` into the project. The upstream landing page uses Tailwind v4 with `@theme` tokens — see `reference/converge-tokens.css` for the `@theme` block.

## Brand contract — non-negotiable

- **Tagline**: *"Define done. Converge gets there."*
- **Mental model**: diverge → converge.
- **Voice tones**: direct · technical · honest about trade-offs.
- **Banned words**: `revolutionary` · `next-generation` · `AI-native` · `game-changing`. Treat as compile errors. Synonyms (`paradigm shift`, `cutting-edge`, `industry-leading`) are also banned.
- **Preferred words**: `concrete` · `shipped` · `measurable` · `verifiable`.
- **Italic emphasis is the brand motif** — wrap the *one noun the sentence is about* in `<em>` and let it render Crimson Pro Italic 500 terracotta.

## Scope rules — non-negotiable

- **`--cv-status-*`** → data-viz only. Glyph-as-type captions and status spans. Never on body text, links, CTAs, or headings.
- **`--cv-diagram-*` + indigo + violet + cyan + rose** → inside `.cv-diagram` SVG subtree only. Never on app chrome.
- **`--cv-accent-warm` (terracotta)** → italic-emphasis spans + link `:hover` + `.cv-highlight` only. Never a CTA fill. Never a heading color. Never a border on something that isn't a marker.
- **Everything else** (bg, text, border) → use anywhere.

## When invoked with no guidance

Ask what the user wants to design. Likely candidates:
- A new screen inside the playbook workspace (the run journal full view, the playbook catalog, the new-playbook composer)
- A status / progress mock for a particular playbook run
- A README diagram for a new RFC
- A marketing tile for a new example playbook
- A doc page in the Converge docs (`/docs/getting-started/...`)

Once the surface is clear, ask:
- Static HTML or interactive React?
- Light cream chrome only, or include a dark code/journal panel?
- One direction, or 2–3 variations to compare?

Then build. Always copy the relevant atoms out of `ui_kits/playbook/primitives.jsx` instead of re-inventing them, and always pull tokens from `colors_and_type.css` instead of hardcoding hex values.

## Banned-word lint

Before shipping any copy, search the output for the banned words above. If you find one, rewrite the sentence using the preferred words and one of the brand-voice patterns:

- *"Long-running AI agents that adapt until outcomes converge."*
- *"Each task declares its outputs and the shell checks that prove them."*
- *"A playbook can burn tens of millions of tokens; the price gap matters."*
- *"That's the loop that adapts when reality breaks the plan."*

If unsure whether a word is banned, ask the user — better one round of clarification than shipping copy that violates the contract.
