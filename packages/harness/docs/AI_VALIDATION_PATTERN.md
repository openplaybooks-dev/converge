# AI Validation Pattern for Self-Correcting Tasks

**Pattern:** Use `ctx.ai.ask()` for validation instead of brittle shell checks

**Benefits:**
- More flexible and semantic
- Self-correcting loops
- Fewer false negatives
- Context-aware validation

---

## Problem: Traditional Shell-Based Checks

### ❌ Brittle Approach

```yaml
checks:
  - id: file-has-header
    cmd: grep -q "# Site Structure" .stitch/SITE.md
    description: File has correct header
```

**Issues:**
- Exact string matching (fails if AI uses "# Sitemap" instead)
- No semantic understanding
- Can't self-correct
- False negatives common

---

## Solution: AI-Powered Validation

### ✅ Flexible Approach

**In Skill Instructions:**

```markdown
## Step 4: AI Self-Validation

After generating files, use `ctx.ai.ask()` to validate:

\`\`\`typescript
const validation = await ctx.ai.ask({
  prompt: \`
Review the files I just created:

1. QUALITY CHECKS:
   - Are all required sections present?
   - Is the content accurate and complete?
   - Does it match the source material?

2. FORMAT CHECKS:
   - Is JSON valid (if applicable)?
   - Are IDs unique and in correct format?
   - Are relationships consistent?

3. COMPLETENESS:
   - Did I include everything from the source?
   - Are there any gaps or missing information?

Files to review:
- .stitch/SITE.md
- .stitch/screens.json

Respond with:
✅ VALID: [what's correct]
❌ ISSUES: [problems found]
🔧 FIXES: [how to correct them]
  \`.trim()
});

// Self-correction loop
if (validation.includes('❌') || validation.includes('🔧')) {
  console.log('Issues detected, applying fixes...');

  // Extract fix instructions
  // Apply corrections
  // Regenerate files

  // Validate again (recursive until clean)
}
\`\`\`
```

**In Task Definition:**

```yaml
---
name: my-task
description: Generate files with AI validation
skill: my-skill
checks: []  # Empty - AI validates instead!
---
```

---

## Use Cases

### 1. File Generation Tasks

**Before (brittle):**
```bash
test -f output.json
grep -q "expected-field" output.json
node -e "JSON.parse(fs.readFileSync('output.json'))"
```

**After (flexible):**
```typescript
await ctx.ai.ask({
  prompt: `Validate output.json:
- Is it valid JSON?
- Does it have all required fields?
- Is the data structure correct?

If not, fix it and regenerate.`
});
```

### 2. Code Generation Tasks

**Before (brittle):**
```bash
grep -q "export default" component.tsx
grep -q "interface Props" component.tsx
tsc --noEmit component.tsx
```

**After (flexible):**
```typescript
await ctx.ai.ask({
  prompt: `Review component.tsx:
- Does it follow React best practices?
- Are types correctly defined?
- Will it compile without errors?

If issues found, fix and regenerate.`
});
```

### 3. Documentation Tasks

**Before (brittle):**
```bash
grep -q "# Title" README.md
grep -q "## Installation" README.md
wc -l README.md | awk '{if($1<10)exit 1}'
```

**After (flexible):**
```typescript
await ctx.ai.ask({
  prompt: `Review README.md:
- Does it have all standard sections?
- Is the content clear and helpful?
- Are examples complete?

If improvements needed, apply them.`
});
```

---

## Pattern: Self-Correcting Loop

### Template

```typescript
async function generateWithValidation() {
  let attempts = 0;
  const MAX_ATTEMPTS = 3;

  while (attempts < MAX_ATTEMPTS) {
    // Generate files
    await generateFiles();

    // AI validation
    const validation = await ctx.ai.ask({
      prompt: `Validate the generated files...

      Respond with one of:
      - ✅ VALID - if everything is correct
      - ❌ ISSUES: [list] - if problems found
      `
    });

    if (validation.includes('✅ VALID')) {
      console.log('Validation passed!');
      return;
    }

    // Extract issues and fix
    console.log(`Attempt ${attempts + 1}: Issues found, fixing...`);
    console.log(validation);

    // Let AI fix based on its own feedback
    await ctx.ai.ask({
      prompt: `You identified these issues:

      ${validation}

      Please fix them now by regenerating the files correctly.`
    });

    attempts++;
  }

  throw new Error(`Validation failed after ${MAX_ATTEMPTS} attempts`);
}
```

---

## Integration with Gap Detection

### Gap-Fixer Tasks Should Use AI Validation

When the gap detection system spawns a gap-fixer task, it should include AI validation instructions:

**Gap-Fixer Prompt Template:**

```markdown
# Gap-Fixer Task: Create Missing File

You need to create: \`${missingFile}\`

## Requirements
[AI-generated requirements based on context]

## Instructions
1. Read related files for context
2. Generate the missing file
3. **VALIDATE YOUR WORK:**
   \`\`\`typescript
   const check = await ctx.ai.ask({
     prompt: "Verify ${missingFile} is correct and complete"
   });
   \`\`\`
4. Fix any issues found
5. Validate again until clean

## Success Criteria
- File exists
- File is valid format
- File matches schema expected by downstream tasks
- **AI validation confirms quality**
```

---

## Benefits Over Shell Checks

| Aspect | Shell Checks | AI Validation |
|--------|--------------|---------------|
| Flexibility | ❌ Exact match only | ✅ Semantic understanding |
| Self-correction | ❌ No | ✅ Yes |
| Context awareness | ❌ No | ✅ Yes |
| False negatives | ⚠️ Common | ✅ Rare |
| Maintenance | ⚠️ High | ✅ Low |
| Error messages | ❌ Generic | ✅ Specific |

---

## Best Practices

### 1. Clear Validation Criteria

```typescript
// ❌ Vague
await ctx.ai.ask({ prompt: "Is this file okay?" });

// ✅ Specific
await ctx.ai.ask({
  prompt: `Validate file.json:
  1. Valid JSON syntax?
  2. Has fields: id, name, description?
  3. All IDs are unique?
  4. Matches schema in schema.json?`
});
```

### 2. Structured Responses

```typescript
// ✅ Use markers for parsing
const validation = await ctx.ai.ask({
  prompt: `...

  Respond in this format:
  ✅ VALID: [what passed]
  ❌ ISSUES: [what failed]
  🔧 FIXES: [how to fix]
  `
});

// Easy to parse
const hasIssues = validation.includes('❌');
```

### 3. Limited Retry Attempts

```typescript
// ✅ Prevent infinite loops
const MAX_ATTEMPTS = 3;
let attempts = 0;

while (attempts < MAX_ATTEMPTS) {
  // ... validation loop
  attempts++;
}
```

### 4. Log Validation Results

```typescript
// ✅ Record validation for debugging
console.log('🔍 AI Validation Result:');
console.log(validation);

// Log to journal
await ctx.journal.log({
  type: 'ai-validation',
  result: validation,
  passed: validation.includes('✅')
});
```

---

## Migration Guide

### Converting Existing Tasks

**Step 1: Identify brittle checks**
```yaml
checks:
  - id: has-header
    cmd: grep -q "# Title" output.md
  - id: has-sections
    cmd: grep -q "## Section" output.md
```

**Step 2: Replace with AI validation in skill**
```markdown
## Validation

Use AI to verify output.md:
\`\`\`typescript
await ctx.ai.ask({
  prompt: "Does output.md have a title and sections?"
});
\`\`\`
```

**Step 3: Remove shell checks**
```yaml
checks: []  # AI validates instead
```

**Step 4: Test**
```bash
pnpm harness run --task my-task
```

---

## Examples in Practice

### Example 1: UX Breakdown Task

**File:** `.harness/skills/ux-breakdown/SKILL.md`

```markdown
### Step 4: Self-Validation

\`\`\`typescript
const validation = await ctx.ai.ask({
  prompt: \`
Review .stitch/SITE.md and .stitch/screens.json:

1. SITE.md:
   - Documents all routes?
   - Clear navigation hierarchy?

2. screens.json:
   - Valid JSON?
   - All screens from UX.md included?
   - Unique IDs in kebab-case?

Respond: ✅ VALID or ❌ ISSUES: [list]
  \`
});

if (validation.includes('❌')) {
  // Fix and retry
}
\`\`\`
```

### Example 2: Gap-Fixer Task

**Auto-generated by `GapTaskSpawner`:**

```markdown
# Fix Gap: Create Missing File

\`\`\`typescript
// Generate the file
await createMissingFile();

// AI validates
const check = await ctx.ai.ask({
  prompt: \`
Verify the file I just created meets requirements:
- Correct format?
- Complete content?
- Matches downstream expectations?
  \`
});

// Self-correct if needed
if (check.includes('❌')) {
  await fixIssues();
}
\`\`\`
```

---

## Summary

**Key Takeaway:** Let AI validate its own work instead of writing brittle shell checks.

**Implementation:**
1. Add AI validation step to skill instructions
2. Use `ctx.ai.ask()` for semantic checks
3. Implement self-correction loops
4. Remove or minimize shell-based checks
5. Log validation results for debugging

**Result:** More robust, flexible, and self-correcting tasks! 🎯
