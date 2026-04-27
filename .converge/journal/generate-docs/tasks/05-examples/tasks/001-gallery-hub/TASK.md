---
id: 001-gallery-hub
title: Write docs/examples/index.md (the gallery hub)
inputs:
  - docs/_examples.json
outputs:
  - docs/examples/index.md
checks:
  - id: page-exists
    cmd: "test -f docs/examples/index.md"
    description: page exists
  - id: has-frontmatter
    cmd: "head -10 docs/examples/index.md | grep -q '^title:' && head -10 docs/examples/index.md | grep -q '^sources:'"
    description: title + sources frontmatter
  - id: groups-by-category
    cmd: "grep -qiE '^##\\s+(learning|building software|research|creative|security|agent protocol)' docs/examples/index.md"
    description: page is grouped by category headings
  - id: lists-most-examples
    cmd: "test $(grep -cE '^\\s*-\\s+\\[|^\\*\\s+\\[' docs/examples/index.md) -ge 15"
    description: lists at least 15 example links
  - id: not-too-long
    cmd: "test -f docs/examples/index.md && wc -w docs/examples/index.md | awk '{exit ($1<=1500?0:1)}'"
    description: <=1500 words (the hub is scannable, not exhaustive)
---

# Write `docs/examples/index.md`

The Examples gallery hub. The reader lands here from "Examples" in the
sidebar, scans by category, and clicks through to a per-example page.

## Required frontmatter

```yaml
---
title: "Examples gallery"
description: "21 working playbooks across software, research, creative work, security, and protocol demos. Find the closest match to your problem and copy it."
sources:
  - docs/_examples.json
sidebar:
  order: 0
---
```

## Required structure

### Top of page (1 short paragraph)

"Every example in this gallery is a real, runnable Converge playbook
that lives under `examples/` in the source tree. Pick the one closest
to your problem and copy it — they're designed to be edited."

### Six category sections

For each of the six categories, a `## <Category Title>` section with:

- **One-paragraph intro** — what kind of problem this category fits.
- **A list of every example in the category** — each item is:
  - `[<title>](<category>/<slug>)` link to the per-example page.
  - One-line tagline (from `docs/_examples.json#tagline`).
  - "Use this if…" — a one-line problem matcher you write based on
    reading the example's README.

Categories in this order (matches the IA):

1. **Learning** — beginner-friendly, single-concept playbooks.
   Suggested matchers: "I want to feel out the framework", "I want a
   minimal working playbook to read end-to-end".

2. **Building software** — apps, games, asset pipelines.
   Matchers: "I want to generate a mobile app from a Stitch design",
   "I want to assemble a game asset pipeline".

3. **Research** — multi-pass deep research / analysis.
   Matchers: "I want a thorough briefing on a topic", "I want to
   analyze a corpus of regulatory documents".

4. **Creative + simulation** — creative output, simulation, optimization.
   Matchers: "I want to generate a short film from a script", "I want
   to simulate a social scenario".

5. **Security** — security work.
   Matchers: "I want to pentest a target".

6. **Agent protocol** — SDK / protocol demos.
   Matchers: "I want to see how to wire up a custom agent provider".

### Bottom of page

A short pointer:

```markdown
> **Don't see your problem?** Read [From your problem to a playbook](../getting-started/from-problem-to-playbook) — it walks through articulating a goal even if no example is a perfect match.
```

## Read first

- `docs/_examples.json` — the canonical list. Every example listed must
  exist here.
- For each "use this if…" line, **skim the corresponding example's README
  one time** to write a true matcher. Don't fabricate matchers.

## Banned

- Adding a category not in the six listed. Edit
  `02-source-scan` and `03-ia` together if you genuinely need a seventh.
- Listing examples that aren't in `docs/_examples.json`.
- A long preamble about what Converge is. The reader is past that;
  they're shopping for an example.
- Inventing taglines. Pull them from the manifest.
