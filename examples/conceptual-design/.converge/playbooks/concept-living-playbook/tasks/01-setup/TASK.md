---
id: 01-setup
title: Prepare workspace and fetch design system
depends_on: []
blocking: true
checks:
  - id: workspace-ready
    cmd: test -d "concepts/${CONVERGE_PARTITION_KEY}" || test "$(ls -d concepts/*/ 2>/dev/null | wc -l)" -gt 0
    description: Partition output directory exists
  - id: design-md-fetched
    cmd: test -f "concepts/${CONVERGE_PARTITION_KEY}/design-system.md"
    description: DESIGN.md fetched
---

# Setup and Fetch Design System

1. Create `concepts/$CONVERGE_PARTITION_KEY/` directory.
2. Verify `docs/design/design-brief.md` exists.
3. The design system name is `$CONVERGE_PARTITION_KEY`. If it is `"random"`, fetch the listing from `https://api.github.com/repos/VoltAgent/awesome-design-md/contents/design-md`, pick one at random and use that name.
4. Fetch the DESIGN.md from `https://raw.githubusercontent.com/VoltAgent/awesome-design-md/main/design-md/{name}/DESIGN.md` and save to `concepts/$CONVERGE_PARTITION_KEY/design-system.md`.
5. Write `concepts/$CONVERGE_PARTITION_KEY/ready.txt`.
