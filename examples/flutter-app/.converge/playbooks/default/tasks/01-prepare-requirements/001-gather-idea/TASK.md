---
id: 001-gather-idea
title: Validate App Idea
description: Validate that idea.md exists with required sections
tags:
  - requirements
outputs:
  - idea.md
checks:
  - id: idea-md-exists
    cmd: test -f idea.md
    description: idea.md exists
  - id: idea-has-purpose
    cmd: grep -q "## Purpose" idea.md
    description: idea.md has purpose section
---

# Validate App Idea

Validate that `idea.md` exists and contains the required sections.

## Step 0: Check idea.md Exists

```bash
if [ -f idea.md ] && grep -q "## Purpose" idea.md; then
  echo "idea.md exists with required sections"
  exit 0
else
  echo "ERROR: idea.md is missing or lacks ## Purpose section"
  echo "Create idea.md with at least a ## Purpose section before running this pipeline."
  exit 1
fi
```

## Success Criteria

- idea.md exists in root directory
- idea.md has "## Purpose" section
- File has valid content (not empty)
