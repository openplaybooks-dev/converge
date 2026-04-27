---
id: 003-license-notice
title: Preserve upstream license and add NOTICE
dependencies:
  - 001-clone-prune
outputs:
  - packages/converge-studio/LICENSE
  - packages/converge-studio/LICENSE.upstream
  - packages/converge-studio/NOTICE
  - packages/converge-studio/README.md
checks:
  - id: upstream-license-preserved
    description: LICENSE.upstream is the original Mission Control LICENSE
    cmd: "test -f packages/converge-studio/LICENSE.upstream && grep -qi 'MIT' packages/converge-studio/LICENSE.upstream"
  - id: notice-attribution
    description: NOTICE file mentions builderz-labs/mission-control and includes upstream SHA
    cmd: "test -f packages/converge-studio/NOTICE && grep -qi 'mission-control' packages/converge-studio/NOTICE && grep -qE '[0-9a-f]{7,40}' packages/converge-studio/NOTICE"
  - id: studio-license-mit
    description: Root LICENSE is MIT
    cmd: "test -f packages/converge-studio/LICENSE && grep -qi 'MIT' packages/converge-studio/LICENSE"
  - id: readme-mentions-fork
    description: README.md documents the fork lineage
    cmd: "test -f packages/converge-studio/README.md && grep -qi 'mission-control' packages/converge-studio/README.md"
---

Preserve attribution for the Mission Control fork.

**Steps**:

1. **Move upstream LICENSE**: rename `packages/converge-studio/LICENSE` → `packages/converge-studio/LICENSE.upstream`. (Whatever was at `LICENSE` in the upstream clone — typically MIT.)

2. **Write a fresh `LICENSE`** for `@converge/studio` (MIT, copyright Converge contributors). Use the same MIT template as `packages/core/LICENSE` if present.

3. **Write `NOTICE`** with attribution:

   ```
   @converge/studio

   This package is derived from builderz-labs/mission-control
   (https://github.com/builderz-labs/mission-control), licensed under MIT.
   See LICENSE.upstream for the original copyright and license terms.

   Forked at upstream commit: <SHA from packages/converge-studio/UPSTREAM_SHA>
   Fork date: <ISO date>

   Modifications:
   - Replaced SQLite/Prisma data layer with a filesystem adapter that reads
     converge's .converge/ directory directly.
   - Removed framework-specific adapters (OpenClaw, CrewAI, LangGraph, AutoGen),
     auth (NextAuth), agent registry, and multi-tenant support.
   - Added playbook authoring, task editing, and run-supervisor surfaces
     specific to converge's playbook + journal model.
   ```

   Read the SHA from `packages/converge-studio/UPSTREAM_SHA` (created by 001-clone-prune) and substitute it.

4. **Write `packages/converge-studio/README.md`** documenting:
   - That this is a Next.js app forked from `builderz-labs/mission-control` (link).
   - The upstream commit SHA pinned at fork time.
   - High-level architecture: filesystem-canonical (no SQLite); reads `.converge/` via `ConvergeAdapter`.
   - How to run: `pnpm --filter @converge/studio dev` or `converge studio` from any converge project.

**Verify**: all four manifest checks pass.
