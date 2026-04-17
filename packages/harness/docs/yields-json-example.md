# Yields JSON Example

## Before (Problematic)

### Agent Output (markdown with code block)
```markdown
# Analysis Complete

Based on the animation analysis, here are the follow-up tasks:

```json
[
  {
    "id": "task-1",
    "title": "Implement scroll animations",
    "inputs": ["docs/animations.md"],
    "outputs": ["src/components/ScrollAnimation.tsx"],
    "checks": ["build"],
    "prompt": "Create scroll animation component"
  }
]
```

Summary: Created 1 task for implementing scroll animations.

```json
[
  {
    "id": "task-1",
    "title": "Implement scroll animations",
    "inputs": ["docs/animations.md"],
    "outputs": ["src/components/ScrollAnimation.tsx"],
    "checks": ["build"],
    "prompt": "Create scroll animation component"
  }
]
```
```

### Problems
1. Two identical JSON blocks (duplicate)
2. Text before the first JSON block ("# Analysis Complete")
3. Text between JSON blocks ("Summary: ...")
4. Regex parser tries to find ONE code block but finds TWO
5. Parser fails or gets confused by extra content

---

## After (Solution)

### Prompt to Agent
```
Use the Write tool to create a file at apps/steep_app/.harness/epics/02-page-homepage/tasks/01-analyze-animations-for-homepage/yields.json with a JSON array of tasks.

Each task object must have these fields:
- "id": short-kebab-id
- "title": Human readable title (one deliverable)
- "inputs": Array of file paths the agent needs to read
- "outputs": Array of file paths this task will create
- "checks": Array of verification commands (e.g., ["build"], ["tsc"])
- "prompt": Self-contained instructions (keep under 500 words)

Example:
[
  {
    "id": "task-1",
    "title": "Do something",
    "inputs": ["file.md"],
    "outputs": ["output.tsx"],
    "checks": ["build"],
    "prompt": "Instructions here"
  }
]
```

### Agent Actions
1. Agent uses Write tool to create `yields.json`
2. File contains pure JSON (no markdown, no extra text)
3. Agent can still generate other output/summaries as needed
4. But the JSON file is clean and parseable

### File: `yields.json`
```json
[
  {
    "id": "implement-scroll-animations",
    "title": "Implement scroll-reveal animations",
    "inputs": ["docs/pages/homepage/animations.md"],
    "outputs": ["src/components/ScrollReveal.tsx"],
    "checks": ["build"],
    "prompt": "Create a scroll-reveal component based on the animation spec in docs/pages/homepage/animations.md. The component should handle intersection observer setup and apply reveal animations to child elements."
  },
  {
    "id": "implement-hero-animations",
    "title": "Implement GSAP hero pin animation",
    "inputs": ["docs/pages/homepage/animations.md"],
    "outputs": ["src/components/HeroSection.tsx"],
    "checks": ["build"],
    "prompt": "Implement the scroll-pinned hero animation using GSAP ScrollTrigger as specified in the animations doc. The hero should pin while content scrolls beneath it."
  }
]
```

### System Processing
```typescript
// Read the JSON file
const yieldsJsonPath = `${taskDir}/yields.json`;
const jsonContent = await ctx.tools.file.read(yieldsJsonPath);

// Parse directly as JSON (no regex, no markdown extraction)
const tasks = JSON.parse(jsonContent);

// Success! Clean, unambiguous parsing
```

---

## Benefits Demonstrated

### 1. No Parsing Ambiguity
- **Before**: "Is this the right code block? Are there multiple? Is there text outside?"
- **After**: File contains only JSON, JSON.parse() handles it

### 2. Better Error Messages
- **Before**: "Failed to extract JSON from markdown" (unclear where the problem is)
- **After**: "SyntaxError: Unexpected token } in JSON at position 142" (exact location)

### 3. Easier Debugging
- **Before**: Have to inspect agent output logs, search for code blocks
- **After**: `cat yields.json` shows exactly what was generated

### 4. Consistent with Other Workflows
- **Before**: Yields used special markdown parsing, different from other tools
- **After**: Yields uses Write tool just like everything else

### 5. Agent Can Still Be Conversational
- **Before**: Agent had to ONLY output JSON, nothing else (restrictive)
- **After**: Agent writes JSON to file, can still provide summaries/explanations in conversation

---

## Migration Path

The change is **backward compatible**:

1. Old tasks that expected markdown parsing will still work (if they followed the rules)
2. New tasks will use JSON file writing (cleaner, more reliable)
3. The `yields.md` file is still generated for human review
4. No changes needed to task validation or spawning logic

When a task with yields runs:
```
1. Agent receives prompt with {{yieldsJsonPath}} placeholder filled in
2. Agent uses Write tool to create yields.json
3. System reads yields.json and parses as pure JSON
4. System generates yields.md for human review (unchanged)
5. System validates and spawns tasks (unchanged)
```
