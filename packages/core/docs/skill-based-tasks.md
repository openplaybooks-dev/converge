# Skill-Based Tasks

This document explains how the Converge framework discovers and handles skills vs tasks.

## Skill Discovery Patterns

The framework distinguishes between three types of markdown files:

### 1. Shared Skills (Discovered as Skills)
- **Pattern**: `.converge/skills/**/SKILL.md`
- **Purpose**: Reusable AI capabilities shared across tasks
- **Count**: One per skill (e.g., stitch-design, sheets-modeling)
- **Example**: `.converge/skills/stitch-design/SKILL.md`

### 2. Task Metadata (Discovered as Tasks)
- **Pattern**: `.converge/epics/**/*/SKILL.md` (handled by scanSkillOnlyTasks)
- **Purpose**: Task-specific instructions and configuration
- **Example**: `.converge/epics/02-ux-ui/001-create-ux-overview/SKILL.md`
- **Note**: Converted to TaskConfig if no task.ts exists

### 3. Supporting Documentation (Not Discovered)
- **Examples**: README.md, references/*.md, workflows/*.md, examples/*.md
- **Purpose**: Human-readable documentation for skills
- **Discovery**: Explicitly excluded by using SKILL.md pattern instead of *.md

## Configuration

**Important**: Always use the pattern `.converge/skills/**/SKILL.md` in your converge.ts config,
NOT `.converge/skills/**/*.md`, to avoid discovering documentation files as skills.

### Correct Configuration

```typescript
export default defineConverge({
  discovery: {
    tasks:  ['.converge/tasks/**/*.ts', '.converge/epics/**/*.ts'],
    checks: ['.converge/checks/**/*.ts'],
    agents: ['.converge/agents/**/*.md'],
    skills: ['.converge/skills/**/SKILL.md'], // ✓ Only match SKILL.md files
    watch:  false,
    spawn:  'subtasks-only',
  },
});
```

### Incorrect Configuration (DO NOT USE)

```typescript
export default defineConverge({
  discovery: {
    // ... other patterns ...
    skills: ['.converge/skills/**/*.md'], // ✗ Matches ALL markdown files including docs
  },
});
```

## How It Works

1. **Framework Default**: The scanner (`src/discovery/scanner.ts`) uses `.converge/skills/**/SKILL.md` as the default pattern at lines 58-60.

2. **Workspace Override**: The workspace config (`workspace/.converge/converge.ts`) should use the same pattern to maintain consistency.

3. **Discovery Process**:
   - Shared skills in `.converge/skills/` are discovered as skills
   - Task-specific SKILL.md files in `.converge/epics/` are discovered as tasks via `scanSkillOnlyTasks()`
   - Supporting documentation is not discovered at all

## Directory Structure Example

```
.converge/
├── skills/
│   ├── stitch-design/
│   │   ├── SKILL.md                    ← Discovered as skill
│   │   ├── README.md                   ← NOT discovered (docs only)
│   │   ├── references/
│   │   │   └── api-guide.md            ← NOT discovered (docs only)
│   │   └── workflows/
│   │       └── iteration-flow.md       ← NOT discovered (docs only)
│   └── sheets-modeling/
│       ├── SKILL.md                    ← Discovered as skill
│       └── examples/
│           └── sample-schema.md        ← NOT discovered (docs only)
└── epics/
    └── 02-ux-ui/
        └── 001-create-ux-overview/
            └── SKILL.md                ← Discovered as task (not skill)
```

## Expected Counts

For a typical workspace:
- **Skills**: 7-10 (one SKILL.md per skill directory)
- **Tasks**: 5-8 (including skill-based tasks from epics)
- **Epics**: 2-3 (epic.ts files)

If you see 50+ "skills" discovered, you're using the wrong pattern and discovering documentation files.

## Troubleshooting

### Problem: Too many skills discovered (e.g., 57 instead of 10)

**Cause**: Using `.converge/skills/**/*.md` instead of `.converge/skills/**/SKILL.md`

**Solution**: Update `converge.ts` line 26 to use `.converge/skills/**/SKILL.md`

### Problem: Tasks not showing skill metadata

**Cause**: Task SKILL.md files not being discovered by `scanSkillOnlyTasks()`

**Solution**: Verify epic task folders follow the pattern `.converge/epics/**/*/SKILL.md`
