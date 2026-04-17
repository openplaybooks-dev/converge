# Search Guide for AI Agents

## Quick Start

The `converge search` command helps you find information in crew projects using tools you already know: **Grep, Glob, and Read**.

## Common Searches

### Find Tasks by Status

```bash
# Show the pattern
crew search status

# Use Grep tool with the pattern
grep -r '"status": "pending"' .converge/epics/*/tasks/*/task.json
```

### Find Tasks by Title

```bash
# Show the pattern
crew search title

# Use Grep tool to search for "authentication"
grep -r '"title".*authentication' .converge/epics/*/tasks/*/task.json
```

### List Tasks in a Epic

```bash
# Show the pattern
crew search epic

# List tasks in epic 2
ls .converge/epics/02-*/tasks/
```

### Find Task by Display ID

```bash
# Show the pattern
crew search display

# Navigate to task m2.3 (epic 2, task 3)
cat .converge/epics/02-*/tasks/03-*/task.json
```

## Directory Structure

```
.converge/
├── project.json              # Project metadata
├── epics/
│   └── {n}-{slug}/           # Epic directories (01-capture, 02-analysis, etc.)
│       ├── epic.json    # Epic data
│       └── tasks/
│           └── {n}-{slug}/   # Task directories (01-init-compound, etc.)
│               └── task.json # Task data
```

## Display ID to Path Mapping

- `m1.1` → `.converge/epics/01-{slug}/tasks/01-{slug}/task.json`
- `m2.3` → `.converge/epics/02-{slug}/tasks/03-{slug}/task.json`
- `m4.5` → `.converge/epics/04-{slug}/tasks/05-{slug}/task.json`

## All Available Patterns

Run `converge search` to see all 12 available search patterns, or `converge search quick` for a quick reference.

## Tips for Agents

1. **Use Grep for content search**: Status, assignee, tags, dependencies
2. **Use Glob for file patterns**: Finding files by epic/task number
3. **Use Read to load details**: After finding the right file
4. **Combine searches**: Use multiple grep commands to narrow results
5. **File names encode structure**: Numbers in directory names map to display IDs

## Example Agent Workflow

1. User asks: "Find all pending tasks"
2. Agent runs: `converge search status`
3. Agent sees example: `grep -r '"status": "pending"' .converge/epics/*/tasks/*/task.json`
4. Agent uses Grep tool with that pattern
5. Agent parses results and presents to user

## Why This Approach?

- ✅ **Simple**: No databases, no indexes, no complex queries
- ✅ **Familiar**: You already know Grep, Glob, and Read
- ✅ **Transparent**: You can see exactly what's being searched
- ✅ **Flexible**: Modify patterns for your specific needs
- ✅ **Educational**: Learn the crew project structure

The `.converge/` directory structure IS the search index. File navigation IS the search engine.
