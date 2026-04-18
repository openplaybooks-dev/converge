# Yields JSON Implementation

## Problem

The yields planning process was generating unparseable output because:

1. **Double JSON output**: The planning agent's response contained the same JSON block twice
2. **Format violations**: The output included extra text after the JSON closing tag
3. **Markdown parsing issues**: Relying on regex to extract JSON from markdown code blocks was error-prone

### Example of the Issue

From task `01-analyze-animations-for-homepage`, the log showed:

- Lines 1054-1113: First JSON block
- Lines 1114-1171: Duplicate JSON block
- Lines 1172-1209: Summary text (violated "nothing after ```" rule)

This caused the parser to fail because it expected exactly ONE JSON code block with no extra content.

## Solution

Changed from markdown-based JSON extraction to direct JSON file writing:

### Before (Problematic)

1. Agent generates markdown with ```json code block
2. System parses markdown using regex to extract JSON
3. Issues: extra text, duplicate blocks, format violations

### After (Better)

1. Provide AI with a JSON schema describing the task format
2. Instruct AI to write directly to a JSON file using the Write tool
3. System reads and parses the JSON file
4. Benefits:
   - No markdown parsing
   - Built-in JSON validation
   - No ambiguity about format
   - Clearer error messages

## Changes Made

### 1. Updated `YIELDS_PLANNING_PROMPT` (lines 706-777)

**Before:**

````
## Response Format — STRICT REQUIREMENT

You MUST respond with ONLY a JSON code block. Nothing else.

FORBIDDEN:
- ❌ Any text before the ```json opening
- ❌ Any text after the ``` closing
...

Example of CORRECT response:
```json
[...]
````

```

**After:**
```

## Output Format

Use the Write tool to create a file at {{yieldsJsonPath}} with a JSON array of tasks.

Example:
[
{
"id": "task-1",
...
}
]

````

### 2. Updated `parseYieldedTasks` function (lines 779-813)

**Before:**
```typescript
function parseYieldedTasks(raw: string): TaskDef[] {
  // Try to extract JSON from code block
  let jsonBlockMatch = raw.match(/```json\s*([\s\S]*?)\s*```/);
  if (!jsonBlockMatch) {
    jsonBlockMatch = raw.match(/```\s*([\s\S]*?)\s*```/);
  }
  let jsonStr = jsonBlockMatch ? jsonBlockMatch[1] : raw;

  try {
    const parsed = JSON.parse(jsonStr);
    // ...
  }
}
````

**After:**

```typescript
function parseYieldedTasks(raw: string): TaskDef[] {
  // Direct JSON parsing - no markdown code block extraction needed
  try {
    const parsed = JSON.parse(raw);
    // ...
  }
}
```

### 3. Updated `runYields` function (lines 903-957)

**Before:**

````typescript
const planPrompt = YIELDS_PLANNING_PROMPT
  .replace('{{prompt}}', interpolatedPlan)
  .replace('{{taskTitle}}', ctx.task.title)
  .replace('{{outputs}}', outputFiles);

const planResult = await ctx.agent(planPrompt, {
  inputs: ctx.task.outputs,
  permissionMode: 'plan',
  // ...
});

const agentOutput = planResult.output || '';

// Validate presence of code block (```json or ```)
const hasCodeBlock = /```(?:json)?\s*[\s\S]*?\s*```/.test(agentOutput);
if (!hasCodeBlock) {
  ctx.log.error('Yields agent response must contain JSON in a code block');
  throw new Error(...);
}
````

**After:**

```typescript
// Determine where the agent should write the JSON file
const yieldsJsonPath = ctx.taskDir
  ? `${ctx.taskDir}/yields.json`
  : `.converge/plans/${ctx.taskId.replace(/\./g, "-")}-yields.json`;

const planPrompt = YIELDS_PLANNING_PROMPT.replace(
  "{{prompt}}",
  interpolatedPlan,
)
  .replace("{{taskTitle}}", ctx.task.title)
  .replace("{{outputs}}", outputFiles)
  .replace("{{yieldsJsonPath}}", yieldsJsonPath);

const planResult = await ctx.agent(planPrompt, {
  inputs: ctx.task.outputs,
  outputs: [yieldsJsonPath], // Tell agent where to write
  permissionMode: "plan",
  // ...
});

// Read the JSON file instead of parsing markdown
let agentOutput = "";
if (await ctx.tools.file.exists(yieldsJsonPath)) {
  agentOutput = await ctx.tools.file.read(yieldsJsonPath);
}

// Validate that yields.json exists and is valid JSON
if (!agentOutput) {
  ctx.log.error("Yields agent did not create yields.json file");
  throw new Error(
    `Yields agent must write tasks to ${yieldsJsonPath}.\n` +
      "See YIELDS_PLANNING_PROMPT for required JSON structure.",
  );
}
```

## Benefits

1. **No markdown parsing** - Direct JSON file read eliminates regex complexity
2. **Clear separation** - Agent uses Write tool (standard workflow)
3. **Better errors** - JSON.parse gives clear line/column errors
4. **No ambiguity** - Can't accidentally include extra text or duplicate blocks
5. **Consistent** - Matches how other file-based workflows work
6. **Easier debugging** - The yields.json file can be inspected directly

## Testing

The changes maintain backward compatibility:

- The `yields.md` file is still generated for auditability (lines 968-1026)
- The validation logic remains unchanged
- Task spawning logic remains unchanged

## Next Steps

When the next yields-driven task runs, it will:

1. Generate a `yields.json` file in the task directory
2. Parse tasks from that JSON file
3. Still generate the human-readable `yields.md` for review
4. Avoid the duplicate JSON / extra text issues that caused parsing failures
