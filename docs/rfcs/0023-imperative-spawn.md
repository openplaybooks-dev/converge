---
RFC: 0023
Title: Imperative Spawn — AI-Native Dynamic Work Breakdown
Status: Draft
Author: Claude (AI Assistant)
Created: 2026-05-20
Supersedes: RFC 0021, RFC 0022 (spawn mechanics)
---

# Imperative Spawn — AI-Native Dynamic Work Breakdown

## Problem

Current spawn mechanism (`spawn.plan.jsonl`) requires AI to:

1. Learn JSONL format and schema
2. Manage `$CONVERGE_TASK_DIR` path
3. Understand `template`, `vars`, `after` field semantics
4. Handle errors (`|| true` anti-pattern)
5. Know when to call `converge apply` manually vs auto

This is framework mechanics leaking into task authoring. AI should focus on **what to spawn**, not **how to spawn**.

## Solution

Replace imperative spawn mechanics with **declarative intent** that the framework interprets.

### Core Principle

> **AI writes task definitions. Framework handles registry.**

AI creates child task files (TASK.md, outputs, etc.) using natural file operations. Framework discovers and registers them automatically via a **convention-over-configuration** approach.

## Design

### Spawn via Directory Convention

AI creates a `.spawn/` directory in its task working directory:

```
06-resources/
├── TASK.md          # Spawner task
└── .spawn/          # Convention: children go here
    ├── resource-auth-01-spec/TASK.md
    ├── resource-auth-02-schema/TASK.md
    ├── resource-tenants-01-spec/TASK.md
    └── resource-tenants-02-schema/TASK.md
```

Framework scans `.spawn/` at task completion, discovers all child TASK.md files, and registers them as DAG nodes.

### Child Task Definition Format

Each child in `.spawn/` is a complete, self-contained task:

```markdown
---
id: resource-auth-01-spec
title: Auth resource — SPEC.md
template: templates/resource-01-spec/TASK.md
vars:
  id: auth
  title: Auth
inputs:
  - .stitch/backend/resources.json
outputs:
  - .stitch/backend/auth/SPEC.md
checks:
  - id: spec-exists
    cmd: test -f .stitch/backend/auth/SPEC.md
---

# Auth SPEC.md

Write the specification for the auth resource...
```

### Variable Injection

Child tasks declare `template:` and `vars:` in frontmatter. Framework:

1. Reads template TASK.md
2. Substitutes `{{vars}}` placeholders
3. Writes rendered TASK.md to journal
4. Registers as a runnable task

### Dependency Chains

Child tasks can express dependencies via frontmatter:

```markdown
---
id: resource-auth-02-schema
title: Auth resource — Pydantic Schema
template: templates/resource-02-schema/TASK.md
depends_on:
  - resource-auth-01-spec
vars:
  id: auth
---
```

Framework computes DAG edges from `depends_on`.

### Auto-Registration Flow

```
1. AI creates .spawn/child-id/TASK.md
2. AI completes parent task (exit 0)
3. Framework scans .spawn/ directory
4. For each child:
   a. Reads TASK.md frontmatter
   b. Resolves template (if specified)
   c. Injects vars into template
   d. Writes to journal as runnable task
5. Framework adds children to DAG with computed dependencies
6. Children execute as normal tasks
```

### Error Handling

- If `.spawn/` is empty: parent succeeds (no children spawned)
- If child TASK.md is malformed: log warning, skip child, continue
- If template resolution fails: mark child as `error` with reason

## File Structure

```
.converge/journal/<playbook>/tasks/<parent-id>/
├── attempts/01/
│   ├── wip/           # AI's working directory
│   │   └── .spawn/   # Convention: children land here
│   │       ├── child-1/TASK.md
│   │       └── child-2/TASK.md
│   └── DONE.result.md
└── children/          # Framework renders here
    ├── child-1/TASK.md  # Template rendered with vars
    └── child-2/TASK.md
```

## Migration from spawn.plan.jsonl

Existing `mode: spawner` tasks with `spawn.plan.jsonl` continue to work. New spawner tasks should use `.spawn/` convention.

Framework detects spawner mode by:
1. `.spawn/` directory exists → use new convention
2. `spawn.plan.jsonl` exists → use legacy mechanism (deprecated)

## Benefits

1. **AI-Native**: AI uses familiar file operations, no framework-specific syntax
2. **Debuggable**: Children are real files, inspectable
3. **Versionable**: `.spawn/` can be git-tracked
4. **Flexible**: Any TASK.md format works, templates optional
5. **Error-Safe**: Malformed children don't crash the parent

## Example: Refactored 06-resources

```markdown
---
id: 06-resources
title: Per-resource 7-step pipeline
mode: spawner
blocking: true
depends_on:
  - 05-auth-rbac-converge
---

# Per-resource 7-step pipeline

Read resources.json and create a task for each resource.

## Body

```bash
#!/usr/bin/env bash
set -euo pipefail

RESOURCES=".stitch/backend/resources.json"
SPAWN_DIR="$CONVERGE_TASK_DIR/.spawn"

mkdir -p "$SPAWN_DIR"

# Read resources and create child tasks
node -e "
const fs = require('fs');
const resources = JSON.parse(fs.readFileSync('$RESOURCES', 'utf8'));
const steps = ['01-spec', '02-schema', '03-model', '04-repo', '05-service', '06-router', '07-test'];

for (const resource of resources) {
  let prevStep = null;
  
  for (const step of steps) {
    const childId = 'resource-' + resource.id + '-' + step;
    const childDir = '$SPAWN_DIR/' + childId;
    
    fs.mkdirSync(childDir, { recursive: true });
    fs.writeFileSync(childDir + '/TASK.md', \`
---
id: \${childId}
title: \${resource.title} — \${step}
template: .converge/playbooks/backend/templates/\${step}/TASK.md
depends_on: \${prevStep ? [prevStep] : []}
vars:
  id: \${resource.id}
  title: \${resource.title}
  \${resource.extraVars || ''}
---

# \${resource.title} — \${step}

Execute step \${step} for resource \${resource.id}.
\`);
    
    prevStep = childId;
  }
}
"
```
```

No JSONL. No `spawn.plan.jsonl`. No error swallowing. Just file creation.

## Implementation Phases

### Phase 1: Core Discovery (RFC 0023)
- Scan `.spawn/` after parent completes
- Read child TASK.md files
- Render templates with vars
- Register as DAG nodes

### Phase 2: Dependency Resolution
- Parse `depends_on` from child frontmatter
- Compute DAG edges
- Handle circular dependency detection

### Phase 3: Template Resolution
- Resolve `template:` path
- Inject `vars:` into template placeholders
- Cache rendered templates

### Phase 4: Deprecation Path
- Warn on `spawn.plan.jsonl` usage
- Document migration path
- Eventually remove legacy mechanism

## Open Questions

1. Should `.spawn/` be relative to WIP dir or attempt root?
2. How to handle spawned children that span multiple waves (incremental spawning)?
3. Should spawned children auto-inherit parent inputs?
4. How to persist `.spawn/` state across partial failures?

## References

- RFC 0021: Declarative spawn apply
- RFC 0022: Task mode contract
- RFC 0020: Converger wave loop
