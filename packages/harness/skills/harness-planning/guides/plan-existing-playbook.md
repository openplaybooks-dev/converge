# Modify / Extend Existing Playbook

## Mission

Add tasks to, modify, or extend an existing harness playbook based on the user's prompt. Preserve existing structure and progress.

**Inputs:**
- User prompt (what to add/change)
- Existing playbook name (`--name`)
- Project directory

**Outputs:**
- Updated or new TASK.md files in `.harness/playbooks/{name}/tasks/`
- Updated `playbook.yml` if run config changes are needed

---

## Step 1: Read the Existing Playbook

Load and understand the current structure before making changes.

```bash
# Read playbook config
cat .harness/playbooks/{name}/playbook.yml

# List existing epics and tasks
find .harness/playbooks/{name}/tasks -name "TASK.md" | sort

# Read each TASK.md to understand scope, dependencies, outputs
```

**Capture:**
- List of epics with their IDs and titles
- List of tasks per epic with IDs, dependencies, and status
- Dependency graph (what depends on what)
- Highest epic number (for adding new epics)
- Highest task number per epic (for adding new tasks)

---

## Step 2: Understand the Modification Request

Parse the user's prompt to determine the type of change:

| Change Type | Example Prompt | Action |
|-------------|---------------|--------|
| **Add feature** | "Add authentication" | New epic or tasks in existing epic |
| **Extend epic** | "Add more API endpoints" | New tasks in existing epic |
| **Modify task** | "Change the database to PostgreSQL" | Update existing TASK.md |
| **Add cross-cutting** | "Add tests for everything" | New epic with deps on existing tasks |
| **Restructure** | "Split the backend epic" | Reorganize existing tasks |

---

## Step 3: Design the Changes

### Adding New Tasks

- Use the next available ID number (don't reuse or gap-fill)
- Wire dependencies to existing tasks where needed
- Follow the same conventions as existing tasks (check style, output patterns)

### Adding New Epics

- Use the next available 2-digit prefix
- If the new epic depends on existing epics, add cross-epic dependencies: `{epic-id}.{task-id}`

### Modifying Existing Tasks

- Read the current TASK.md fully before modifying
- Preserve existing checks that still apply
- Update dependencies if the task's inputs changed
- Don't break downstream tasks that depend on this one

### Dependency Rules

- **New → Existing:** Add dependency on existing task IDs
- **Existing → New:** Only if the user explicitly requested it
- **Never remove existing dependencies** unless the user asked to restructure
- **Check for cycles** after adding new dependencies

---

## Step 4: Write the Changes

### For New Tasks

Create new `TASK.md` files following the existing format:

```yaml
---
id: {next-available-id}
title: Human-Readable Title
description: What this task accomplishes
dependencies:
  - existing-task-id
inputs:
  - path/to/input
outputs:
  - path/to/output
checks:
  - id: check-id
    cmd: shell-command-returns-0
    description: What this validates
---

# Task Title

[Step-by-step instructions]
```

### For Modified Tasks

Edit the existing TASK.md — update only the sections that changed. Preserve:
- Existing checks (add new ones, don't remove working ones)
- Existing outputs (add new ones if needed)
- Task body structure

### For playbook.yml

Only modify if:
- Run config needs to change (e.g., more iterations for added scope)
- Description should reflect expanded scope

---

## Step 5: Verify Compatibility

After writing changes:

1. **No broken references** — All dependency IDs point to existing tasks
2. **No cycles** — New dependencies don't create circular chains
3. **Existing checks still valid** — Modified tasks retain their checks
4. **New tasks have checks** — Every new output has at least existence + non-empty checks
5. **ID ordering** — New IDs follow the existing sequence

```bash
# Verify all TASK.md files parse correctly
find .harness/playbooks/{name}/tasks -name "TASK.md" -exec head -1 {} \;

# Verify no duplicate task IDs
find .harness/playbooks/{name}/tasks -name "TASK.md" -exec grep "^id:" {} \; | sort | uniq -d
```

Print summary: what was added, what was modified, new dependency links.

---

## Success Criteria

- Existing playbook structure is preserved (no accidental deletions)
- New tasks have: id, title, outputs, checks
- Dependencies are valid and acyclic
- Modified tasks retain existing checks
- Summary of changes printed
