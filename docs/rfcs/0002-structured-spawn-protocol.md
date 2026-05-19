# RFC 0002: Structured JSON spawn protocol

**Status**: Draft
**Backwards-compatible**: Yes (string form continues to parse)
**Estimate**: 2-3 days

## Problem

The cli-seed agent contract today: agent emits a JSON object with `commands: string[]` where each string is a shell-like `converge spawn template …` command. The CLI re-parses each string through a custom tokenizer (`packages/core/src/seed/cli-spawn.ts:43`) that supports double-quote, single-quote, and backslash escapes.

This is using **shell quoting as an API**. It has costs:

1. **Agents make quoting mistakes.** In `examples/baby-app`'s recent run, the agent emitted `--var title=Cycle Tracking` (no quotes around the multi-word value). The tokenizer split on the space, parser saw `Tracking` as a positional flag, the whole run died with `Unknown flag for spawn template: Tracking`. Cost: 1.5h of stalled time.
2. **Unicode and special characters are landmines.** Any path with a space, single quote, backslash, dollar sign, or non-ASCII char is at risk.
3. **Each value gets parsed twice** (once by bash, once by our tokenizer when re-read).
4. **The grammar is implicit.** There's no formal schema; the parser's behaviour is the spec.

## Current behaviour

Inspect `packages/core/src/executor/cli-seed-executor.ts:13-100`:

- The seed prompt (lines 25-40) tells the agent "Use one command per line in the `commands` array" — strings only.
- The schema `CmdSchema` at line 15-19 is `z.object({ commands: z.union([z.array(z.string()), z.string()]), ... })`. Strings only.
- The parser `parseSpawnCliLine` at `cli-spawn.ts:90` calls `tokenize()` then walks the resulting argv.

## Proposal

Extend the cli-seed schema to accept either strings **or** structured objects:

```ts
const SpawnTemplateObject = z.object({
  kind: z.literal("template"),
  path: z.string(),
  id: z.string().optional(),
  vars: z.record(z.string(), z.string()).optional(),
});

const SpawnTaskObject = z.object({
  kind: z.literal("task"),
  id: z.string(),
  title: z.string().optional(),
  taskFile: z.string().optional(),
  dependsOn: z.array(z.string()).optional(),
  inputs: z.array(z.string()).optional(),
  outputs: z.array(z.string()).optional(),
  tags: z.array(z.string()).optional(),
  vars: z.record(z.string(), z.string()).optional(),
  checks: z.array(z.object({ id: z.string(), cmd: z.string() })).optional(),
  body: z.string().optional(),
});

const SpawnCommand = z.union([z.string(), SpawnTemplateObject, SpawnTaskObject]);

const CmdSchema = z.object({
  commands: z.union([z.array(SpawnCommand), z.string()]),
  done: z.boolean().optional(),
  reasoning: z.string().optional(),
});
```

Object form bypasses `tokenize()` entirely — no quoting, no escaping, no ambiguity. Strings continue to work for backwards compatibility and ergonomic shell-style emission.

## Code-level design

### 1. Schema change (`cli-seed-executor.ts:15-19`)

Replace `CmdSchema` with the union above. Add `SpawnCommand` to the exports.

### 2. Dispatcher in the seed executor (`cli-seed-executor.ts:87-91`)

```ts
const parsed = commands.map((item) => {
  if (typeof item === "string") {
    return { line: item, parsed: parseSpawnCliLine(item) };
  }
  // Structured object — coerce directly to SpawnCliCommand shape.
  return { line: JSON.stringify(item), parsed: coerceStructuredSpawn(item) };
});
```

### 3. New coercion function (`cli-spawn.ts`)

```ts
export function coerceStructuredSpawn(input: unknown): SpawnCliCommand {
  // input is already z-parsed; we just shape-shift to the existing internal type.
  if ((input as any).kind === "template") {
    return {
      kind: "template",
      path: (input as any).path,
      id: (input as any).id,
      vars: { ...((input as any).vars ?? {}) },
    };
  }
  // ...same for task
}
```

### 4. Prompt update (`cli-seed-executor.ts:25-40`)

Add to the seed prompt:

```
You may emit commands in two forms:

1. Shell-string form (legacy, fine for simple cases):
   "converge spawn template --path X --id Y --var k=v"

2. Structured-object form (preferred when any var contains spaces,
   quotes, slashes, or non-ASCII characters):
   {
     "kind": "template",
     "path": "<template-path>",
     "id": "<id>",
     "vars": { "k": "v with spaces", "k2": "v2" }
   }

Prefer the structured form. The string form is provided only for backwards
compatibility with playbooks that have script bodies that printf shell lines.
```

### 5. Documentation

Update `docs/reference/cli-seed.md` (or wherever the cli-seed contract lives) with both forms and a note that string form is legacy.

## Migration

- **Zero migration required.** All existing string-emitting playbooks continue to work.
- Add `examples/hello-world/` or a new `examples/hello-spawn/` test fixture that uses the structured form to make sure it's covered.
- Update `examples/flutter-app/` and `examples/baby-app/` task bodies opportunistically: where the bash printf is doing quote-juggling, switch to a body that prints JSON objects via `jq -n`. This makes the example playbooks more robust.

## Test plan

Add tests under `packages/core/src/seed/__tests__/cli-spawn.test.ts`:

1. **Object form, template kind**: parses to expected SpawnCliCommand.
2. **Object form, task kind**: parses to expected SpawnCliCommand.
3. **Object form, var with spaces**: `vars.title = "Cycle Tracking"` round-trips.
4. **Object form, var with quotes**: `vars.title = "it's a test \"value\""` round-trips.
5. **Object form, var with unicode**: `vars.title = "週次"` round-trips.
6. **Mixed array**: `[string, object, string]` works.
7. **Regression**: baby-app's `Cycle Tracking` case via object form.

## What this does NOT do

- Doesn't deprecate the string form (yet — would be a separate breaking RFC).
- Doesn't change how the runtime validates spawned children. RFC 0001 covers that.
- Doesn't change the `converge spawn` CLI subcommand (the human-facing one) — that's still shell-style.

## Out of scope

- A complete JSON-Schema for the contract (would be RFC 0009 retry-context's scope).
