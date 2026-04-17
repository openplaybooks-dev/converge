# agentfn/src

Source modules for the unified agent function layer.

`agentfn` wraps multiple LLM providers (Claude, Kimi, Qwen, Gemini) behind a single API. Each module below handles one concern.

## Modules

### `index.ts`

Barrel export. Re-exports everything from the other modules plus shared utilities from `claudefn` (`extractJson`, `resolvePrompt`, `parseToolCalls`, `buildToolPreamble`, `buildCodePreamble`, `extractCode`, `executeCode`, `GlobalQueue`, `getDefaultQueue`, `setDefaultQueue`).

### `types.ts`

Unified type definitions across all providers.

| Type | Description |
|------|-------------|
| `Provider` | `"claude" \| "kimi" \| "qwen" \| "gemini"` |
| `AgentFnResult<T>` | `{ data, raw, durationMs, provider, sessionId?, costUsd?, numTurns? }` |
| `AgentFnOptions<T>` | Shared options (`prompt`, `schema`, `hooks`, `timeoutMs`, `maxRetries`, `cwd`, `queue`, `cliFlags`, `enableSkills`) plus Claude-specific extras (`mode`, `allowedTools`, `model`, etc.) |
| `AgentFnHooks` | `{ before?, after?, onStream?, onMessage?, onFeedback? }` |
| `ToolDef` | `{ fn: AgentFn, description: string }` — tool for composition |
| `ComposeOptions<T>` | Extends `AgentFnOptions` with `tools`, `composeMode`, `maxIterations` |

Also re-exports shared types from `claudefn` (`PromptInput`, `ExecutionMode`, `ClaudeFnOptions`, etc.).

### `provider.ts`

Global default provider state.

- `getDefaultProvider()` — returns current default (initially `"claude"`)
- `setDefaultProvider(provider)` — sets the global default

### `agentfn.ts`

Core factory function.

```typescript
const ask = agentfn({ prompt: "Translate {{input}} to French" });
const result = await ask("hello");
// { data: "Bonjour", raw: "...", durationMs: 42, provider: "claude" }
```

- Delegates to `claudefn()`, `kimifn()`, `qwenfn()`, or `geminifn()` based on provider
- Maps unified options to provider-specific option shapes (strips Claude-only fields for other providers)
- Enhances prompts with skill/agent references when `enableSkills: true` (default)
- Augments results with a `provider` field

### `compose.ts`

Composition of multiple `agentfn` functions as tools.

```typescript
const translate = agentfn({ prompt: "Translate {{input}} to French" });
const summarize = agentfn({ prompt: "Summarize {{input}}" });

const fn = compose({
  prompt: "Translate then summarize {{input}}",
  tools: {
    translate: { fn: translate, description: "Translate text" },
    summarize: { fn: summarize, description: "Summarize text" },
  },
});
```

- Supports `composeMode: "code"` (default) or `"tool_call"`
- Delegates to each provider's own compose implementation
- `maxIterations` caps tool-call rounds (default 10)

### `skills.ts`

Loads skills and agents from the `.crew` folder.

**Discovery:**
- `findProjectRoot(cwd?)` — walks up looking for `pnpm-workspace.yaml` or `package.json`
- `getCrewDir(cwd?)` — resolves `.crew` path (respects `CREW_PATH` env var)

**Listing:**
- `listSkills(cwd?)` — folders containing `SKILL.md`
- `listAgents(cwd?)` — folders containing `AGENT.md` or `*.md`

**Resolution:**
- `getSkillPath(name, cwd?)` — `.harness/{name}/SKILL.md`
- `getAgentPath(name, cwd?)` — `.harness/{name}/AGENT.md` or `.harness/{name}.md`

**Metadata:**
- `getSkillMeta(path)` / `getAgentMeta(path)` — parse YAML frontmatter (`name`, `description`, etc.)

### `prompting.ts`

Prompt enhancement with skill/agent injection.

- `extractSkillRefs(prompt)` — finds `/name` references
- `extractAgentRefs(prompt)` — finds `@name` references
- `enhancePrompt(prompt, options?)` — resolves references, loads metadata, appends footnotes:

```
<!-- REFERENCED SKILLS/AGENTS -->
[^skill:web2next]: **web2next** — Generate Next.js projects [Load: .harness/web2next/SKILL.md]

<!-- USER PROMPT -->
Follow /web2next workflow
```

## Data Flow

```
agentfn(options)
  ├─ enhancePrompt()        ← injects skill/agent footnotes
  ├─ map options → provider-specific shape
  └─ delegate to claudefn | kimifn | qwenfn | geminifn
       └─ return AgentFnResult with `provider` field

compose(options)
  ├─ enhancePrompt()
  ├─ wrap tools as ToolDefs
  └─ delegate to provider compose()
       └─ orchestrate tool calls (code or tool_call mode)
```
