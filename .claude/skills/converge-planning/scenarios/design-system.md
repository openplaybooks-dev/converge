# Design System Playbook — Worked Example

## When to use this scenario

**Trigger phrases:**
- "generate a design system" / "build a design system"
- "create brand identity and components"
- "build design tokens from a Figma file"
- "make a component library"

**What it covers:** Static BOM: brand identity → tokens → primitives → components. All items known upfront, no spawning needed.

---

## The thinking sequence applied

1. **What does it contain?** Brand identity, tokens, primitives, components
2. **Composition?** Brand identity → tokens → primitives → components (via inputs:)
3. **Static vs. dynamic?** All known at plan time → static skeleton in tasks/
4. **Modes?** All leaves — no spawner needed

---

## playbook.yml

No `tasks:` entry needed. The loader discovers tasks from the `tasks/` directory at compile time.

```yaml
name: design-system
description: >-
  Generate a complete design system.
  BOM: brand identity → tokens → primitives → components.

goals:
  - id: branding-exists
    cmd: test -s design/${CONVERGE_PARTITION_KEY}/branding.md
  - id: tokens-exists
    cmd: test -s design/${CONVERGE_PARTITION_KEY}/tokens.json
  - id: primitives-exists
    cmd: test -s design/${CONVERGE_PARTITION_KEY}/primitives.css
  - id: components-exists
    cmd: test -s design/${CONVERGE_PARTITION_KEY}/components.css
```

---

## tasks/ structure + TASK.md content

Static children discovered from `tasks/` at compile time. Each is a leaf — no spawner needed, no templates/.

```
tasks/
├── Brand identity/TASK.md    ← leaf, no inputs (first in chain)
├── Tokens/TASK.md           ← inputs: Brand identity output
├── Primitives/TASK.md       ← inputs: Tokens output
└── Components/TASK.md       ← inputs: Primitives output
```

**tasks/Brand identity/TASK.md:**
```yaml
---
id: Brand identity
title: Brand identity
inputs: []
outputs:
  - design/${CONVERGE_PARTITION_KEY}/branding.md
checks:
  - id: branding-exists
    cmd: test -s design/${CONVERGE_PARTITION_KEY}/branding.md
---
```

**tasks/Tokens/TASK.md:**
```yaml
---
id: Tokens
title: Design tokens
inputs:
  - design/${CONVERGE_PARTITION_KEY}/branding.md
outputs:
  - design/${CONVERGE_PARTITION_KEY}/tokens.json
checks:
  - id: tokens-valid
    cmd: jq empty design/${CONVERGE_PARTITION_KEY}/tokens.json
---
```

**tasks/Primitives/TASK.md:**
```yaml
---
id: Primitives
title: Primitive components
inputs:
  - design/${CONVERGE_PARTITION_KEY}/tokens.json
outputs:
  - design/${CONVERGE_PARTITION_KEY}/primitives.css
checks:
  - id: primitives-exist
    cmd: test -s design/${CONVERGE_PARTITION_KEY}/primitives.css
---
```

**tasks/Components/TASK.md:**
```yaml
---
id: Components
title: Composite components
inputs:
  - design/${CONVERGE_PARTITION_KEY}/primitives.css
outputs:
  - design/${CONVERGE_PARTITION_KEY}/components.css
checks:
  - id: components-exist
    cmd: test -s design/${CONVERGE_PARTITION_KEY}/components.css
---
```

## Key insight

**No `tasks:` in playbook.yml.** No `depends_on:` in TASK.md frontmatter. No `01-catalog / 02-generate` stages.

The catalog is an **input file** — it goes in `inputs:` of the task that needs it, not as a task that runs first.

**Composition is via inputs: alone.** Brand identity is first (no inputs). Tokens reads Brand identity's output. Primitives reads Tokens' output. Components reads Primitives' output. The runtime deduces ordering from `inputs:` paths — no explicit ordering needed.
