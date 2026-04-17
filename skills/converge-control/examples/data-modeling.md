# Scenario: Data Modeling Pipeline

**Pattern:** Retry with LEARN.md (self-correction loop)

**Use case:** Analyze Google Sheets data and generate SQL schema with automatic failure recovery.

---

## Epic Structure

```
01-prepare-requirements/
├── tasks/001-analyze-sheets-data/
│   └── TASK.md (skill: sheets-modeling)
└── tasks/002-generate-sql-schema/
    └── TASK.md
```

---

## Execution with Failure Recovery

### Iteration 1: Analyze Sheets (Attempt 1)

```bash
converge run --step
# Executes: 001-analyze-sheets-data
# Invokes: /sheets-modeling skill
# Creates: data-modeling/analysis.json
# Checks: [✅ file-exists, ❌ file-nonempty]
# Status: ❌ Failed (empty file)
# Writes: attempts/wip/LEARN.md
```

**What happened:**
- Task created the output file
- But file was empty (0 bytes)
- Check `file-nonempty` failed
- AI wrote LEARN.md documenting the issue

---

### LEARN.md Contents (Attempt 1)

```markdown
## What Went Wrong

File `data-modeling/analysis.json` was created but is empty.

## Root Cause

Sheets API returned empty data — no rows found in the sheet.

## Attempted Fix

Added error handling to check for empty sheets before writing JSON.

## Why Fix Failed

Code now handles empty sheets but still writes empty JSON file instead of
populating it with error information or sample data.

## Suggested Next Steps

1. Verify Google Sheets URL is correct in task inputs
2. Check if sheet has proper read permissions
3. Add fallback to write structured error message in JSON format
4. Or populate with sample schema if sheet is empty

## Files to Check

- TASK.md: Verify Sheets URL parameter
- .env: Check Google API credentials
- data-modeling/analysis.json: Should contain valid JSON even on error
```

---

### Iteration 2: Analyze Sheets (Attempt 2)

```bash
converge run --step
# Executes: 001-analyze-sheets-data (retry)
# Reads: attempts/01/LEARN.md
# Applies: Lessons learned from attempt 1
# Creates: data-modeling/analysis.json (now populated)
# Checks: [✅ file-exists, ✅ file-nonempty, ✅ valid-json]
# Status: ✅ Complete
# Archives: attempts/wip/ → attempts/02/
```

**What changed:**
- AI read LEARN.md from attempt 1
- Understood the root cause (empty data handling)
- Applied fix (write error JSON or sample data)
- File now has content
- All checks pass

---

### Iteration 3: Generate SQL Schema

```bash
converge run --step
# Executes: 002-generate-sql-schema
# Inputs: data-modeling/analysis.json
# Creates: data-modeling/schema.sql
# Status: ✅ Complete
```

**Dependency resolution:**
- Task 002 depends on 001 via `.deps(['001-analyze-sheets-data'])`
- Task 002 needs `analysis.json` as input
- Converge waited for 001 to complete before running 002
- Once 001 succeeded, 002 became eligible

---

## Key Patterns

### 1. Automatic Retry with LEARN.md

**How it works:**
1. **Attempt 1 fails** → AI writes LEARN.md explaining what went wrong
2. **Converge unlocks task** for retry (up to max attempts)
3. **Attempt 2 starts** → AI reads LEARN.md from previous attempt
4. **AI applies fix** based on lessons learned
5. **Checks re-run** → If pass, task complete; if fail, write new LEARN.md

**Key files:**
```
attempts/
├── wip/                    # Current attempt
│   └── LEARN.md           # Written if current attempt fails
├── 01/                     # First attempt (archived)
│   └── LEARN.md           # Lessons from attempt 1
└── 02/                     # Second attempt (archived if needed)
    └── LEARN.md           # Lessons from attempt 2 (if failed again)
```

---

### 2. Self-Correction Using Previous Attempt Analysis

**LEARN.md structure:**
```markdown
## What Went Wrong
[Specific symptom or error]

## Root Cause
[Why it happened]

## Attempted Fix
[What was tried during this attempt]

## Why Fix Failed
[Why the fix didn't work]

## Suggested Next Steps
[Concrete actions for next attempt]

## Files to Check
[Relevant files and what to look for]
```

**AI reads this in next attempt and:**
- Understands what was already tried
- Avoids repeating the same mistake
- Applies more targeted fix
- Documents new findings if still failing

---

### 3. Attempt Archiving

**After each attempt:**
```bash
# Before next attempt
mv attempts/wip attempts/01

# Start fresh attempt
mkdir attempts/wip
```

**Benefits:**
- Complete history of what was tried
- Can compare outputs across attempts
- Can see progression of fixes
- Easy debugging ("what changed between attempt 1 and 2?")

---

### 4. Dependency Blocking

**Task 002 waits for 001:**
```yaml
# 002-generate-sql-schema/TASK.md
---
dependencies:
  - 001-analyze-sheets-data          # Explicit dependency
inputs:
  - data-modeling/analysis.json      # Implicit dependency
outputs:
  - data-modeling/schema.sql
---
```

**Execution order guaranteed:**
1. 001 must complete successfully
2. Only then does 002 become eligible
3. If 001 fails, 002 never runs
4. If 001 retries, 002 continues waiting

---

## Implementation

### Task 001: Analyze Sheets Data

```yaml
# .converge/epics/01-prepare-requirements/tasks/001-analyze-sheets-data/TASK.md
---
title: Analyze Google Sheets Data
description: Read sheets and generate data model analysis
skills:
  - sheets-modeling
outputs:
  - data-modeling/analysis.json
checks:
  - id: file-exists
    description: Analysis file created
    cmd: test -f data-modeling/analysis.json
  - id: file-nonempty
    description: Analysis not empty
    cmd: test -s data-modeling/analysis.json
  - id: valid-json
    description: Valid JSON format
    cmd: jq empty data-modeling/analysis.json
---

# Analyze Google Sheets Data

Invoke the **/sheets-modeling** skill to analyze Google Sheets data.

Create:
- data-modeling/analysis.json (structured data model)

The skill will:
1. Connect to Google Sheets API
2. Read sheet structure and data
3. Infer data types and relationships
4. Generate normalized schema proposal

If the sheet is empty or inaccessible, write a valid JSON file with:
```json
{
  "error": "description of error",
  "sampleSchema": { }
}
```
```

### Task 002: Generate SQL Schema

```yaml
# .converge/epics/01-prepare-requirements/tasks/002-generate-sql-schema/TASK.md
---
title: Generate SQL Schema
description: Convert data model to SQL DDL statements
dependencies:
  - 001-analyze-sheets-data
inputs:
  - data-modeling/analysis.json
outputs:
  - data-modeling/schema.sql
checks:
  - id: file-exists
    description: Schema file created
    cmd: test -f data-modeling/schema.sql
  - id: has-tables
    description: Contains CREATE TABLE
    cmd: grep -q "CREATE TABLE" data-modeling/schema.sql
---

# Generate SQL Schema

Read the data model from data-modeling/analysis.json.

Generate SQL schema in data-modeling/schema.sql with:
- CREATE TABLE statements
- Primary keys
- Foreign keys
- Indexes
- Constraints

Use PostgreSQL syntax.
```

---

## Common Issues

### Task keeps failing with same error

**Cause:** LEARN.md not being read or applied correctly

**Solution:**
```bash
# Check if LEARN.md exists
cat .converge/journal/epics/01-prepare-requirements/tasks/001-analyze-sheets-data/attempts/01/LEARN.md

# Compare attempt 1 and attempt 2 logs
diff attempts/01/log.log attempts/02/log.log

# Look for evidence AI read LEARN.md
grep -i "learn" attempts/02/log.log
```

---

### Max attempts reached

**Cause:** Fundamental issue not being resolved

**Solution:**
```bash
# Read all attempt LEARN.md files
cat attempts/01/LEARN.md
cat attempts/02/LEARN.md

# Identify recurring root cause
# Fix task definition if needed
vim .converge/epics/01-prepare-requirements/tasks/001-analyze-sheets-data/TASK.md

# Reset and retry
converge reset 001-analyze-sheets-data
converge run --step 001-analyze-sheets-data
```

---

### Downstream task runs before upstream completes

**Cause:** Missing dependency declaration

**Solution:**
```bash
# Verify deps in TASK.md
grep dependencies .converge/epics/01-prepare-requirements/tasks/002-generate-sql-schema/TASK.md

# Should have:
.deps(['001-analyze-sheets-data'])

# Add if missing, then reset
converge reset 002-generate-sql-schema
```

---

## Variations

### Variation 1: More Attempts

```typescript
// In converge.ts config
export default {
  maxAttempts: 5,  // Allow up to 5 retry attempts
}
```

### Variation 2: Different Retry Logic Per Task

Set `correction-budget` in TASK.md frontmatter:
```yaml
---
correction-budget: 3   # Override global setting
---
```

---

## Summary

**When to use this pattern:**
- Tasks that might fail on first attempt (API calls, network, external deps)
- Complex tasks where first attempt reveals issues
- Tasks that benefit from iterative refinement

**Key implementation steps:**
1. Design realistic checks (not too strict, not too loose)
2. Write clear prompts explaining what to do on failure
3. Ensure AI has enough context to self-correct
4. Use layered checks (existence → non-empty → valid content)
5. Review LEARN.md after failures to understand issues

**Benefits:**
- Automatic recovery from transient failures
- Learning accumulates across attempts
- Clear audit trail of what was tried
- No manual intervention needed for common issues
