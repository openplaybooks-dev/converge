# Task: 02-docs/001-move-readme

Move the publication-quality README from `packages/core/README.md` to the repository root.

**Context**: The root `./README.md` currently has a stale HARNESS ASCII art banner
and minimal content. The real, comprehensive README lives at `packages/core/README.md`
and references `./banner.svg`. We want the best content at the root for GitHub visitors.

**Process**:
1. Read `packages/core/README.md` — this is the source of truth
2. Read `./README.md` — note any content worth preserving (likely none)
3. Copy `packages/core/README.md` content to `./README.md`
4. Update any relative paths in the moved content:
   - `./banner.svg` → `./banner.svg` (banner will be at root after task 002)
   - `./docs/` links remain valid
   - `./examples/` → `./packages/core/examples/` (if referenced)
   - Any `./src/` references → `./packages/core/src/`
5. Replace `packages/core/README.md` with a shorter package-level README that:
   - Has a one-line description
   - Links to the root README for full documentation
   - Keeps npm-specific info (install, API entry points)

**Do NOT** delete `packages/core/README.md` — replace it with a concise package README.
The root README becomes the canonical documentation entry point.