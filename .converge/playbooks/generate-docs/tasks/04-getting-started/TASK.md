---
id: 04-getting-started
title: Phase 04 — Getting Started (5 pages)
blocking: true
dependencies: [03-ia]
outputs:
  - docs/getting-started/why-converge.md
  - docs/getting-started/install.md
  - docs/getting-started/your-first-playbook.md
  - docs/getting-started/from-problem-to-playbook.md
  - docs/getting-started/next-steps.md
---

The "I get it in 5 minutes" surface. A new reader lands on `docs/`, follows
these pages in order, and either drops off (not a fit) or reaches a
working playbook.

This phase is the audience handshake:
- Pages 1-3 work for **everyone** (technical or not).
- Page 4 is the bridge for **non-technical** readers — articulate a
  real-world goal, find the closest example, copy and tweak it.
- Page 5 routes to whichever next stop matches the reader.

Five leaves:

1. **001-why-converge** — one-page positioning. Define done vs. define how. ~400 words. Read end-to-end in <2 min.
2. **002-install** — every supported install path (pnpm, npm, bun). Required env vars. Verify install with `converge --version`. ~250 words + commands.
3. **003-your-first-playbook** — `converge init` → edit one file → `converge run`. Working example end-to-end in <5 min. Most important page on the site.
4. **004-from-problem-to-playbook** — written for a non-technical reader.
   How to articulate a real-world goal, browse the Examples Gallery, pick
   the closest match, copy and tweak. The non-coder onramp.
5. **005-next-steps** — pointers into Examples + Guides + Reference + GitHub. Short, scannable.
