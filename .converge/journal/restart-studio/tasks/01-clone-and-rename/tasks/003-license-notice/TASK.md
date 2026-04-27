---
id: 003-license-notice
title: Preserve upstream LICENSE and write NOTICE attribution
dependencies:
  - 001-clone-mc
outputs:
  - packages/studio/LICENSE
  - packages/studio/LICENSE.upstream
  - packages/studio/NOTICE
checks:
  - id: upstream-license-preserved
    description: LICENSE.upstream contains MIT
    cmd: "test -f packages/studio/LICENSE.upstream && grep -qi 'MIT' packages/studio/LICENSE.upstream"
  - id: notice-attribution
    description: NOTICE attributes mission-control with the SHA
    cmd: "test -f packages/studio/NOTICE && grep -qi 'mission-control' packages/studio/NOTICE && grep -q 'a020d1b7' packages/studio/NOTICE"
---

```bash
mv packages/studio/LICENSE packages/studio/LICENSE.upstream
```

Write a fresh `packages/studio/LICENSE` (MIT, copyright Converge contributors) and `packages/studio/NOTICE`:

```
@converge/studio

This package is derived from builderz-labs/mission-control
(https://github.com/builderz-labs/mission-control), licensed under MIT.
See LICENSE.upstream for the original copyright and license terms.

Forked at upstream commit: a020d1b7d045e0e09616663ffb39963f432a3f4c

Modifications:
- Replaced SQLite/Prisma data layer with a filesystem adapter that reads
  converge's .converge/ directory directly.
- Removed framework-specific adapters (OpenClaw, CrewAI, LangGraph, AutoGen),
  multi-tenant gateway support, and agent-fleet domain components.
- Rebound dashboard, sidebar, header, and detail-page surfaces to converge's
  playbook + run + journal model.
```
