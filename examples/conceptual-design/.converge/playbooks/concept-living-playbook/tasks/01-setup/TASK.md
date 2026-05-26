---
id: 01-setup
title: Prepare workspace and fetch design system
depends_on: []
blocking: true
outputs:
  - concepts/.workspace/ready.txt
  - concepts/.workspace/chosen-design-system.txt
  - concepts/.workspace/design-system.md
checks:
  - id: workspace-ready
    cmd: test -d concepts/.workspace
    description: Workspace directory exists
  - id: name-chosen
    cmd: test -s concepts/.workspace/chosen-design-system.txt
    description: Design system name chosen
  - id: design-md-fetched
    cmd: test -s concepts/.workspace/design-system.md
    description: DESIGN.md fetched
---

# Setup and Fetch Design System

1. Create `concepts/.workspace/` directory.
2. Verify `docs/design/living-playbook-spec.md` exists.
3. Read `$CONVERGE_VAR_DESIGN_SYSTEM`. If `"random"` or empty, fetch the listing from `https://api.github.com/repos/VoltAgent/awesome-design-md/contents/design-md`, pick one at random. Otherwise use the given name.
4. Write the name to `concepts/.workspace/chosen-design-system.txt`.
5. Fetch the DESIGN.md from `https://raw.githubusercontent.com/VoltAgent/awesome-design-md/main/design-md/{name}/DESIGN.md` and save to `concepts/.workspace/design-system.md`.
6. Create `concepts/{name}/` directory.
7. Write `concepts/.workspace/ready.txt`.
