# Task: 02-docs/002-generate-banner

Generate a new banner SVG for the root README with Converge branding.

**Context**: `packages/core/banner.svg` exists with the old HARNESS branding —
pixel-art style with a person walking AI agent dogs (Claude, Codex, Gemini) on
leashes. The concept is good but the text says "HARNESS" and the tagline is stale.

**Process**:
1. Read `packages/core/banner.svg` as the starting template
2. Create a new `./banner.svg` (at repository root) with these changes:
   - Replace title text "HARNESS" → "CONVERGE" (lines with font-size="48")
   - Update tagline "Gap-driven build system for AI agents" →
     "Define done. Converge gets there." or
     "Gap-driven convergence framework for AI agent orchestration"
   - Keep the pixel-art illustration (person + AI agent dogs) — it's distinctive
   - Keep the footer tagline "Detect gaps • Generate work • Execute • Verify • Converge"
   - Keep all colors, gradients, and styling
   - Ensure the viewBox and dimensions work well as a GitHub README banner
     (800x320 is good — matches current)
3. Copy `./banner.svg` to `packages/core/banner.svg` as well (keep in sync)
4. Verify the root README.md references `./banner.svg` correctly

**Output**: A clean SVG file that renders well on GitHub's light and dark themes.
The SVG should be self-contained (no external font dependencies) and use
monospace font-family for the pixel-art aesthetic.