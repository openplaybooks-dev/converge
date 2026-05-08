# The Cursor + Check Mark

## Concept

Developers live in the terminal. Converge is a CLI tool. The verification mechanism is shell commands. Nothing says "developer tool" more directly than the terminal cursor.

A mark that combines the terminal prompt/cursor with a checkmark says: **"the terminal verifies."**

## Why it fits Converge

- Converge is a **CLI tool**: `converge init`, `converge run`, `converge watch`
- Every check is a **shell command**: `tsc`, `eslint`, `grep`, test suites
- The cursor = the agent executing
- The check = verification passed
- Together: the cursor converges on done

## Variant Sketches

### J2 — Prompt + Check (strongest)

The classic terminal prompt `>` with the descender extending into a checkmark.

```
>_       → becomes →      >✓
                          /
                         /
```

Or more integrated:

```
  ▐▌
  ▐▌  ✓   ← cursor block with checkmark emerging
  ▐▌
```

### J1 — Three cursors, one check

Three blinking cursors (RYG) converging toward a single checkmark:

```
  █  (red cursor)
   ╲
  █──✓  (yellow cursor → check)
   ╱
  █  (green cursor)
```

### J3 — Block cursor with negative-space check

A solid terminal block █ with a checkmark cut out in negative space:

```
  ┌──────────┐
  │  ██████  │
  │  ████ ✓█ │  ← checkmark in negative space
  │  ██  ✓██ │
  │  █  ✓███ │
  │  ██████  │
  └──────────┘
```

## Reference

- **Cursor** (the AI editor) — proves the cursor concept works as a tech logo. Their logo is a simple cursor shape. Converge's would be differentiated by the checkmark.
- **Warp** terminal logo — abstract terminal prompt mark
- **iTerm2** icon — terminal icon
- **Hyper** terminal logo
- **Fig** terminal logo
- The `>_` prompt is universally recognized by developers

## Technical Requirements

- Must be distinct from Cursor (the editor) — the checkmark is the differentiator
- Must work as a single-color silhouette
- Must read as "terminal" without being too literal
- The checkmark must be integral, not tacked on

## Risk

- "Cursor" (cursor.com) is a well-known AI code editor. Need to ensure the mark doesn't create confusion.
- The terminal prompt is used by many tools. The checkmark integration must be unique enough.
