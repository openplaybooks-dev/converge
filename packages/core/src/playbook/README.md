# Playbook Hash Tracking & Sync

This module implements hash-based change detection for playbooks and journal synchronization.

## Overview

**Problem:** Playbooks are templates that can be modified during execution. We need to detect when playbooks change and handle it gracefully.

**Solution:** Hash-based change detection with user control.

## Architecture

```
Playbooks = Immutable Templates (git tracked)
Journal = Execution State (selective git tracking)
Hash = Keeps them in sync
```

## Key Concepts

### Source of Truth

**For Task Execution:**
1. Journal TASK.md (PRIMARY) - Frozen at task start
2. LEARN.md (SECONDARY) - What went wrong
3. Playbook TASK.md (REFERENCE) - Latest template

**For WBS Execution:**
1. Playbook WBS script (PRIMARY) - Always use latest
2. LEARN.md (SECONDARY) - What went wrong
3. Journal context (TERTIARY) - Parent task info

### Hash Tracking

- Playbook hash stored in `.converge/playbooks/{name}/.hash`
- Journal hash stored in `.converge/journal/{name}/.playbook-hash`
- Compared on every run to detect changes

## Usage

### Check Playbook Status

```typescript
import { checkPlaybookStatus } from './playbook';

const status = await checkPlaybookStatus(playbookDir, journalDir);

if (status.status === 'outdated') {
  console.log('Playbook changed!');
  console.log('Changes:', status.changes);
  // Prompt user: continue or restart
}
```

### Sync Journal Hash

```typescript
import { syncJournalHash } from './playbook';

// Mark journal as up-to-date with current playbook
await syncJournalHash(playbookDir, journalDir);
```

### Template Materialization

```typescript
import { materializeTemplate } from './playbook/template-materializer';

await materializeTemplate({
  templatePath: 'playbooks/game-dev/tasks/wbs/templates/character-spec.md',
  targetPath: 'journal/game-dev/tasks/10-ideation/spawned/spec-w1/TASK.md',
  vars: {
    charId: 'w1',
    charName: 'Warrior Alpha',
    charClass: 'warrior'
  }
});
```

### WBS Repair

```typescript
import { classifyWBSError, writeWBSLearnMd } from './playbook/wbs-repair';

try {
  await executeWBS(taskId);
} catch (error) {
  const errorType = classifyWBSError(error);
  await writeWBSLearnMd(journalDir, taskId, attempt, error);
  
  if (attempt < maxAttempts) {
    // AI repairs WBS script in playbook
    await repairWBS(taskId, attempt);
    // Retry
  }
}
```

## Files

- `hash.ts` - SHA256 hash calculation for playbook tree
- `sync.ts` - Playbook-journal synchronization
- `template-materializer.ts` - Template variable substitution
- `wbs-repair.ts` - WBS script failure handling and repair

## Git Strategy

### Commit
- ✅ Playbooks (templates)
- ✅ Journal task state (status.json)
- ✅ Journal spawned tasks (TASK.md, status.json)
- ✅ Journal playbook hash (.playbook-hash)
- ✅ Artifacts (project outputs)

### Ignore
- ❌ Journal attempts (execution logs)
- ❌ Journal sessions (optional audit trail)

## Edge Cases Handled

1. **Playbook modified during execution** - Journal copy protects running tasks
2. **WBS script failures** - AI repairs in playbook, retries execution
3. **Deeply nested WBS breaks** - Hierarchical repair at failure level
4. **Git branch switching** - Hash mismatch detected, user prompted
5. **Partial WBS spawns** - Keep successful spawns, retry failed portion

## Testing

See `/tmp/converge-poc/` for POC validation:
- `hash.js` - Hash calculation tests
- `full-scenario.js` - Full architecture demo
- `battle-test.js` - Edge case tests
- `wbs-failure-test.js` - WBS failure tests
