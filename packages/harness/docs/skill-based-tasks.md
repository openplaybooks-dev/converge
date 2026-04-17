# Skill-Based Tasks

This document explains how the harness framework discovers and handles skills vs tasks.

## Skill Discovery Patterns

The framework distinguishes between three types of markdown files:

### 1. Shared Skills (Discovered as Skills)
- **Pattern**: `.harness/skills/**/SKILL.md`
- **Purpose**: Reusable AI capabilities shared across tasks
- **Count**: One per skill (e.g., stitch-design, sheets-modeling)
- **Example**: `.harness/skills/stitch-design/SKILL.md`

### 2. Task Metadata (Discovered as Tasks)
- **Pattern**: `.harness/epics/**/*/SKILL.md` (handled by scanSkillOnlyTasks)
- **Purpose**: Task-specific instructions and configuration
- **Example**: `.harness/epics/02-ux-ui/001-create-ux-overview/SKILL.md`
- **Note**: Converted to TaskConfig if no task.ts exists

### 3. Supporting Documentation (Not Discovered)
- **Examples**: README.md, references/*.md, workflows/*.md, examples/*.md
- **Purpose**: Human-readable documentation for skills
- **Discovery**: Explicitly excluded by using SKILL.md pattern instead of *.md

## Configuration

**Important**: Always use the pattern `.harness/skills/**/SKILL.md` in your harness.ts config,
NOT `.harness/skills/**/*.md`, to avoid discovering documentation files as skills.

### Correct Configuration

```typescript
export default defineHarness({
  discovery: {
    tasks:  ['.harness/tasks/**/*.ts', '.harness/epics/**/*.ts'],
    checks: ['.harness/checks/**/*.ts'],
    agents: ['.harness/agents/**/*.md'],
    skills: ['.harness/skills/**/SKILL.md'], // ✓ Only match SKILL.md files
    watch:  false,
    spawn:  'subtasks-only',
  },
});
```

### Incorrect Configuration (DO NOT USE)

```typescript
export default defineHarness({
  discovery: {
    // ... other patterns ...
    skills: ['.harness/skills/**/*.md'], // ✗ Matches ALL markdown files including docs
  },
});
```

## How It Works

1. **Framework Default**: The scanner (`src/discovery/scanner.ts`) uses `.harness/skills/**/SKILL.md` as the default pattern at lines 58-60.

2. **Workspace Override**: The workspace config (`workspace/.harness/harness.ts`) should use the same pattern to maintain consistency.

3. **Discovery Process**:
   - Shared skills in `.harness/skills/` are discovered as skills
   - Task-specific SKILL.md files in `.harness/epics/` are discovered as tasks via `scanSkillOnlyTasks()`
   - Supporting documentation is not discovered at all

## Directory Structure Example

```
.harness/
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

**Cause**: Using `.harness/skills/**/*.md` instead of `.harness/skills/**/SKILL.md`

**Solution**: Update `harness.ts` line 26 to use `.harness/skills/**/SKILL.md`

### Problem: Tasks not showing skill metadata

**Cause**: Task SKILL.md files not being discovered by `scanSkillOnlyTasks()`

**Solution**: Verify epic task folders follow the pattern `.harness/epics/**/*/SKILL.md`
