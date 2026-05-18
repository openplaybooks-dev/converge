/**
 * WBS: Documentation Overhaul Pipeline
 *
 * Creates publication-quality documentation for Converge.
 * Sequential — each doc builds on context from the previous.
 *
 *   001-move-readme → 002-generate-banner → 003-root-readme →
 *   004-core-readme → 005-contributing → 006-comparisons →
 *   007-adrs → 008-changelog
 */

export async function run(ctx) {
  // 1. Move packages/core/README.md to root
  await ctx.spawn({
    id: '001-move-readme',
    title: 'Move packages/core/README.md to root README.md',
    outputs: ['README.md'],
    checks: [
      {
        id: 'root-readme-exists',
        cmd: 'test -f README.md',
        description: 'Root README.md exists',
      },
      {
        id: 'root-readme-has-converge',
        cmd: "grep -qi 'converge' README.md",
        description: 'Root README mentions Converge',
      },
      {
        id: 'root-readme-not-harness-ascii',
        cmd: "! grep -q 'HARNESS' README.md",
        description: 'Root README has no HARNESS ASCII art',
      },
    ],
    body: `Move the publication-quality README from \`packages/core/README.md\` to the repository root.

**Context**: The root \`./README.md\` currently has a stale HARNESS ASCII art banner
and minimal content. The real, comprehensive README lives at \`packages/core/README.md\`
and references \`./banner.svg\`. We want the best content at the root for GitHub visitors.

**Process**:
1. Read \`packages/core/README.md\` — this is the source of truth
2. Read \`./README.md\` — note any content worth preserving (likely none)
3. Copy \`packages/core/README.md\` content to \`./README.md\`
4. Update any relative paths in the moved content:
   - \`./banner.svg\` → \`./banner.svg\` (banner will be at root after task 002)
   - \`./docs/\` links remain valid
   - \`./examples/\` → \`./packages/core/examples/\` (if referenced)
   - Any \`./src/\` references → \`./packages/core/src/\`
5. Replace \`packages/core/README.md\` with a shorter package-level README that:
   - Has a one-line description
   - Links to the root README for full documentation
   - Keeps npm-specific info (install, API entry points)

**Do NOT** delete \`packages/core/README.md\` — replace it with a concise package README.
The root README becomes the canonical documentation entry point.`,
  });

  // 2. Generate banner SVG
  await ctx.spawn({
    id: '002-generate-banner',
    title: 'Generate Converge banner SVG',
    dependencies: ['001-move-readme'],
    outputs: ['banner.svg'],
    checks: [
      {
        id: 'banner-exists',
        cmd: 'test -f banner.svg',
        description: 'banner.svg exists at root',
      },
      {
        id: 'banner-says-converge',
        cmd: "grep -q 'CONVERGE\\|Converge' banner.svg",
        description: 'Banner SVG contains Converge text',
      },
      {
        id: 'banner-no-harness',
        cmd: "! grep -qi 'HARNESS' banner.svg",
        description: 'Banner SVG has no HARNESS text',
      },
    ],
    body: `Generate a new banner SVG for the root README with Converge branding.

**Context**: \`packages/core/banner.svg\` exists with the old HARNESS branding —
pixel-art style with a person walking AI agent dogs (Claude, Codex, Gemini) on
leashes. The concept is good but the text says "HARNESS" and the tagline is stale.

**Process**:
1. Read \`packages/core/banner.svg\` as the starting template
2. Create a new \`./banner.svg\` (at repository root) with these changes:
   - Replace title text "HARNESS" → "CONVERGE" (lines with font-size="48")
   - Update tagline "Gap-driven build system for AI agents" →
     "Define done. Converge gets there." or
     "Gap-driven convergence framework for AI agent orchestration"
   - Keep the pixel-art illustration (person + AI agent dogs) — it's distinctive
   - Keep the footer tagline "Detect gaps • Generate work • Execute • Verify • Converge"
   - Keep all colors, gradients, and styling
   - Ensure the viewBox and dimensions work well as a GitHub README banner
     (800x320 is good — matches current)
3. Copy \`./banner.svg\` to \`packages/core/banner.svg\` as well (keep in sync)
4. Verify the root README.md references \`./banner.svg\` correctly

**Output**: A clean SVG file that renders well on GitHub's light and dark themes.
The SVG should be self-contained (no external font dependencies) and use
monospace font-family for the pixel-art aesthetic.`,
  });

  // 3. Root README.md (enhance after move + banner)
  await ctx.spawn({
    id: '003-root-readme',
    title: 'Enhance root README.md',
    dependencies: ['002-generate-banner'],
    outputs: ['README.md'],
    checks: [
      {
        id: 'readme-exists',
        cmd: 'test -f README.md',
        description: 'README.md exists',
      },
      {
        id: 'readme-has-quickstart',
        cmd: "grep -q 'Quick Start\\|Getting Started\\|quickstart' README.md",
        description: 'README has quick start section',
      },
      {
        id: 'readme-has-badges',
        cmd: "grep -q '\\[!\\[' README.md || grep -q 'badge' README.md",
        description: 'README has badges',
      },
      {
        id: 'readme-has-banner-ref',
        cmd: "grep -q 'banner.svg' README.md",
        description: 'README references banner.svg',
      },
    ],
    body: `Enhance the root README.md (moved from packages/core in task 001) for public release.

**The README already has good content** from the move. This task adds/verifies:

**Reference**: Read \`docs/converge-gtm.md\` for positioning, messaging, and comparison data.

**Verify/add these sections**:
1. **Banner** — \`![Converge](./banner.svg)\` (generated in task 002)
2. **Tagline** — "Define done. Converge gets there."
3. **Badges** — npm version, license, build status, test coverage
4. **One-paragraph description** — gap-driven convergence framework for AI agent orchestration
5. **Why Converge** — 3-4 bullet points from GTM positioning
6. **Quick Start** — install, create playbook, run (< 5 minutes)
7. **How It Works** — brief explanation of the convergence loop
8. **Comparison Table** — vs LangChain, CrewAI, AutoGen, Mastra (from GTM doc)
9. **Packages** — monorepo package list with descriptions
10. **Documentation Links** — link to core package, contributing, examples
11. **License** — Apache 2.0

**Fix any relative paths** that broke during the move from packages/core/.

**Voice**: Professional, concise, technically precise. No hype words.
Draw messaging from \`docs/converge-gtm.md\` sections 1 (Product Positioning)
and 11 (Differentiation Messaging).`,
  });

  // 4. Core package README (now a slimmed-down package README)
  await ctx.spawn({
    id: '004-core-readme',
    title: 'Finalize packages/core/README.md',
    dependencies: ['003-root-readme'],
    outputs: ['packages/core/README.md'],
    checks: [
      {
        id: 'core-readme-exists',
        cmd: 'test -f packages/core/README.md',
        description: 'Core README exists',
      },
      {
        id: 'core-readme-has-api',
        cmd: "grep -q 'API\\|Configuration\\|Usage\\|Install' packages/core/README.md",
        description: 'Core README has API or usage documentation',
      },
    ],
    body: `Finalize the packages/core/README.md as a focused package-level README.

**Context**: The full documentation now lives at the root README.md.
packages/core/README.md should be a concise package README for npm.

**Ensure it contains**:
1. Package name and one-line description
2. Installation instructions (\`npm install @openplaybooks/converge-core\`)
3. Quick usage example (minimal playbook)
4. Link to root README for full documentation
5. Link to API reference / core concepts
6. License

**Also ensure**:
- Banner SVG reference points to \`./banner.svg\` (copied in task 002)
- No broken relative links
- No content duplicated from root README — cross-reference instead

**Do NOT** make this a duplicate of the root README. Keep it short and npm-focused.`,
  });

  // 5. CONTRIBUTING.md
  await ctx.spawn({
    id: '005-contributing',
    title: 'Create CONTRIBUTING.md',
    dependencies: ['003-root-readme'],
    outputs: ['CONTRIBUTING.md'],
    checks: [
      {
        id: 'contributing-exists',
        cmd: 'test -f CONTRIBUTING.md',
        description: 'CONTRIBUTING.md exists',
      },
    ],
    body: `Create CONTRIBUTING.md for open-source contributors.

**Sections**:
1. **Welcome** — brief, friendly intro
2. **Code of Conduct** — link to CODE_OF_CONDUCT.md
3. **Development Setup** — prerequisites, clone, install, build, test
4. **Project Structure** — monorepo layout, package purposes
5. **Making Changes** — branch naming, commit messages, PR process
6. **Testing** — how to run tests, coverage expectations
7. **Documentation** — how to update docs, doc standards
8. **Release Process** — versioning, changelog, npm publish
9. **Getting Help** — where to ask questions

**Tone**: Welcoming but professional. Make it easy for first-time contributors.`,
  });

  // 6. Framework comparisons
  await ctx.spawn({
    id: '006-comparisons',
    title: 'Create framework comparison documentation',
    dependencies: ['003-root-readme'],
    outputs: ['docs/comparisons.md'],
    checks: [
      {
        id: 'comparisons-exists',
        cmd: 'test -f docs/comparisons.md',
        description: 'Comparisons doc exists',
      },
    ],
    body: `Create a detailed framework comparison document.

**Reference**: Read \`docs/converge-gtm.md\` section 11 (Differentiation Messaging)
for comparison data and positioning.

**Compare against**:
- LangChain/LangGraph — graph-based orchestration
- CrewAI — role-based multi-agent
- AutoGen — conversation-based multi-agent
- Mastra — TypeScript agent framework
- OpenHands — step-based coding agent

**For each framework, cover**:
1. Core paradigm (how it orchestrates work)
2. Task decomposition approach
3. Error handling / self-correction
4. State management
5. Observability / debugging
6. Language / ecosystem

**Feature comparison matrix** (table format):
| Feature | Converge | LangChain | CrewAI | AutoGen | Mastra |
|---------|----------|-----------|--------|---------|--------|

**Tone**: Factual and fair. Acknowledge strengths of other frameworks.
Position Converge's gap-driven convergence as a genuinely different paradigm,
not just "better."`,
  });

  // 7. Architecture Decision Records
  await ctx.spawn({
    id: '007-adrs',
    title: 'Create Architecture Decision Records',
    dependencies: ['004-core-readme'],
    outputs: ['docs/adr/'],
    checks: [
      {
        id: 'adr-dir-exists',
        cmd: 'test -d docs/adr',
        description: 'ADR directory exists',
      },
      {
        id: 'adr-index-exists',
        cmd: 'test -f docs/adr/README.md',
        description: 'ADR index exists',
      },
    ],
    body: `Create Architecture Decision Records for key design decisions.

**Create** \`docs/adr/README.md\` (index) and individual ADR files.

**ADRs to document** (read codebase to understand each decision):
1. \`001-filesystem-first.md\` — Why state lives on the filesystem, not a database
2. \`002-gap-driven-convergence.md\` — Why convergence loop over graph/DAG execution
3. \`003-wbs-decomposition.md\` — Why WBS scripts for dynamic task generation
4. \`004-playbook-format.md\` — Why YAML + Markdown over pure code or pure config
5. \`005-monorepo-structure.md\` — Why monorepo with separate packages

**ADR format** (standard template):
\`\`\`markdown
# ADR-NNN: Title

**Status**: Accepted
**Date**: 2026-04-18

## Context
What is the issue that we're seeing that motivates this decision?

## Decision
What is the change that we're proposing and/or doing?

## Consequences
What becomes easier or more difficult to do because of this change?
\`\`\``,
  });

  // 8. CHANGELOG.md
  await ctx.spawn({
    id: '008-changelog',
    title: 'Create CHANGELOG.md',
    dependencies: ['003-root-readme'],
    outputs: ['CHANGELOG.md'],
    checks: [
      {
        id: 'changelog-exists',
        cmd: 'test -f CHANGELOG.md',
        description: 'CHANGELOG.md exists',
      },
    ],
    body: `Create CHANGELOG.md following Keep a Changelog format.

**Format**: https://keepachangelog.com/en/1.1.0/

**Content**:
1. Header explaining the changelog format and versioning
2. \`[Unreleased]\` section with current changes:
   - **Changed**: Renamed from "harness" to "Converge"
   - **Added**: Standardization playbook
   - **Added**: Comprehensive documentation
   - List other notable recent changes from git log
3. \`[0.1.0]\` section for initial public release (placeholder)

**Process**:
1. Run \`git log --oneline -50\` to review recent history
2. Group changes by type: Added, Changed, Deprecated, Removed, Fixed, Security
3. Write in user-facing language, not commit messages

**Note**: This is the root CHANGELOG. Individual packages may have their own.`,
  });
}
