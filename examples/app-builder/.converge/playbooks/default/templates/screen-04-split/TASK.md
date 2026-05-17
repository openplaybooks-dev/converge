---
title: "Split — {{title}}"
description: Extract local reusable components from the generated {{title}} screen
blocking: true
skills:
  - react-building-layouts
vars:
  screenId:
  title:
  screenPath:
  componentsDir:
inputs:
  - "{{screenPath}}"
outputs:
  - "{{screenPath}}"
  - "{{componentsDir}}/**/*.tsx"
checks:
  - id: screen-still-exists
    cmd: "test -f {{screenPath}}"
    description: screen still exists after split
---
# Split Screen Components

Refactor `{{screenPath}}` only as needed:

- extract repeated or dense view sections into `{{componentsDir}}`
- keep route-level orchestration in the screen file
- do not abstract single-use trivial markup

