# Preview-and-verify workflow

Diagrams are visual artifacts. "The build compiled" is not sufficient
evidence that they render correctly — always screenshot and look.

## No base-path gotcha (but read this anyway)

Unlike the CocoIndex docs site, the Converge landing site has no `base:`
prefix in `astro.config.mjs` — the built output is rooted at `/`, so a
plain `pnpm preview` (or `python3 -m http.server` against `dist/`) just
works. CSS variables resolve, primitives render with their proper dark-
theme fills, no rsync trick needed.

If you ever see diagrams render with bare-default browser colors (white
fills, default-black strokes, no rounded corners), that points at
**CSS-variable name typos** — the tokens in `src/styles/tokens.css` are
all prefixed `--color-*`. Writing `var(--cream)` or `var(--bg-elev)`
will silently fall back to the browser default.

## Running the preview

```bash
scripts/preview.sh <page-slug> [crop-y-top]
# Example: scripts/preview.sh /
# Example: scripts/preview.sh /blog/playbook-anatomy 1200
# Dev-mode (skip build, hit pnpm dev): PREVIEW_DEV=1 scripts/preview.sh /
```

The script:

1. Build mode (default): runs `pnpm build` in the landing repo root.
2. Spins up `pnpm preview` on a free port (or attaches to `pnpm dev` on
   :4321 if `PREVIEW_DEV=1`).
3. Screenshots the page with headless Chrome at `1400x5200`, scale 1.
4. Saves a full-page PNG plus an optional crop.
5. Prints the paths.

Read the PNGs back with the `Read` tool. Claude Code is multimodal — it
can see and critique the rendered output.

## Locating a specific diagram in the page

Full-page screenshots are tall — the Converge landing page stacks Hero,
SocialProof, ProblemSolution, FeatureGrid, Architecture, CompactComparison,
Quickstart, LiveDemo, Faq, CtaBanner end to end. To find your diagram:

1. Start with a wide crop covering a plausible y-range:
   ```bash
   magick /tmp/dg-preview/full.png -crop 1400x600+0+1800 /tmp/dg-preview/crop.png
   ```
2. Read the crop. If the target diagram isn't there, adjust the y-offset
   (e.g. `+800`, `+2400`, `+3200`). Each section is roughly 600–900px
   tall on desktop.
3. For layout scrutiny, crop tight and omit surrounding prose.

## Iteration loop

1. Edit the `.astro` file.
2. Run `scripts/preview.sh <slug>` (or rely on `pnpm dev` HMR + dev-mode
   preview for the tightest loop).
3. `Read` the PNG.
4. Compare with intent; identify specific issues (overlap, opacity,
   wrong shape, wrong color, contrast against the dark background).
5. Edit again, repeat.

Expect 2–4 cycles for any non-trivial diagram. The dark theme adds an
extra failure mode: a stroke that reads fine on white will disappear
against `--color-bg`. First render almost always surfaces issues
invisible from code (e.g., near-black-on-near-black borders).

## When to skip preview

Minor text/label edits that don't affect layout (e.g. fixing a typo in
a label string) can skip preview if the diagram otherwise passed a
recent review. Everything that touches coordinates, shape choices, new
primitives, or color tokens needs a preview.

## Cleanup

The preview script writes to `/tmp/dg-preview/` and starts a local HTTP
server. Both clean up on next run. If a port gets stuck:

```bash
lsof -ti:4321 | xargs kill -9    # pnpm dev default
lsof -ti:4322 | xargs kill -9    # pnpm preview default
```
