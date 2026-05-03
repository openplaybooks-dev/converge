---
name: repair-skillmd
description: Fix SKILL.md frontmatter and structure issues — missing name, outputs, checks, malformed YAML
allowed-tools:
  - Read
  - Write
  - Edit
  - Bash
tags:
  - repair
  - gap:output
  - gap:check-failed
  - gap:seed
context:
  - type: gap
    fields: [gapKind, unitPath, taskTitle, taskId]
  - type: file
    path: "{unitPath}"
    label: skill-source
  - type: ai
    prompt: >
      Read the SKILL.md file at `{unitPath}` and check for these issues:
      1. Missing `name` field in YAML frontmatter
      2. Missing or empty `outputs` array
      3. Missing or empty `checks` array
      4. Checks with missing id/cmd/description fields
      5. `allowed-tools` not being an array
      6. Missing or very short body (< 50 chars of instructions)
      7. Malformed YAML syntax

      For each issue found, state: what's wrong, where it is, and what the fix should be.
      Be specific — include the exact YAML that needs to change.
    label: issue-analysis
    tools: [Read]
    timeoutMs: 30000
---

# Repair SKILL.md

Fix structural issues in a SKILL.md task definition file.

## Step 1: Read Context

1. Read `repair-context/gap.md` — what gap triggered this
2. Read `repair-context/issue-analysis.md` — AI pre-analysis of what's wrong
3. Read `repair-context/skill-source.md` — the actual SKILL.md content
4. Read `repair-context/history.md` (if exists)

## Step 2: Fix Issues

Apply fixes based on the issue analysis. Common fixes:

| Issue                     | Fix                                                         |
| ------------------------- | ----------------------------------------------------------- |
| Missing `name`            | Extract from directory name                                 |
| Missing `outputs`         | Read the task body to infer what it should produce          |
| Missing `checks`          | Add `test -f` checks for each output                        |
| Invalid check format      | Add missing id/cmd/description fields                       |
| `allowed-tools` not array | Convert to `[Read, Write, Edit, Bash]`                      |
| Missing body              | Keep existing body, add structure if completely empty       |
| Malformed YAML            | Fix the YAML syntax — ensure proper indentation and quoting |

## Step 3: Edit the File

Use the Edit tool to make targeted changes to the SKILL.md file.
Create a `.backup` copy first:

```bash
cp "{unitPath}" "{unitPath}.backup"
```

**Rules**:

- Preserve the existing body content — don't rewrite instructions
- Only fix the frontmatter issues identified in the analysis
- Ensure the `---` delimiters are present and correct
- Use proper YAML formatting (2-space indent, no tabs)

## Step 4: Verify

```bash
# Check YAML is valid
node -e "require('yaml').parse(require('fs').readFileSync('{unitPath}','utf8').match(/^---\n([\s\S]*?)\n---/)[1])"
```
