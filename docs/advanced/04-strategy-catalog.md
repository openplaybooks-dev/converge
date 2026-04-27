---
title: "The strategy catalog"
description: "How the repair pipeline scales. A flat registry of named strategies with declarative context steps, not an orchestrator with hard-coded dispatch."
sidebar:
  order: 4
---

## The hard-coded dispatcher problem

The user-facing version of self-correction — covered in [Concepts: self-correction](/concepts/self-correction/) — describes a pipeline of named repair strategies that try to unblock failed tasks. This page is about the engineering of that pipeline. Specifically: how do you keep adding repair strategies for years without the dispatcher turning into a 2000-line `switch` statement?

The naive approach is exactly that switch. When a check fails, look at the failure type, branch to the matching repair function, run it. New failure type → new branch. New strategy → modify the dispatcher. Within a year you have a god-object that every team contributing a repair strategy has to touch, and merge conflicts on the dispatcher are constant.

The next-naivest approach is a pipeline: an ordered list of strategies, each given a chance to claim the failure. Better — strategies are independently testable, registration is simpler. But still load-bearing on the order. Adding a strategy means deciding where in the pipeline it goes. Removing one means knowing what was downstream of it. You've moved the conditional logic out of the switch and into a sequence, but the implicit dependency is the same.

The next move — the one Converge made — is to flatten the pipeline into a catalog, with each strategy declaring what kinds of failures it can handle and what context it needs. The dispatcher becomes a tiny query: "give me all strategies that can handle gap kind X." Order is derived, not declared. New strategies are registered, not inserted.

## The descriptor

Every strategy registers with a `StrategyDescriptor` (`packages/core/src/navigator/repair/strategy-catalog.ts:115`):

```typescript
export interface StrategyDescriptor {
  name: string;
  description: string;
  gapKinds: string[];
  contextSteps: ContextStep[];
  type: "builtin" | "skill";
  strategy?: FixStrategy;       // for TS-class strategies
  skillPath?: string;           // for TASK.md-defined skills
  deterministic?: boolean;
  priority?: number;
}
```

Five things matter on this descriptor.

**`name`** is the unique identifier the AI selector and operators reference.

**`description`** is what the AI selector reads when picking among eligible strategies for a non-deterministic gap. It's not just documentation — it's load-bearing for runtime decisions. Bad descriptions mean bad selection. Descriptions are written for the AI as much as for humans.

**`gapKinds`** is what makes the catalog queryable. A strategy declares the gap kinds it claims (`["check-failed", "output"]`, or `["*"]` to match anything). The dispatcher's `getEligible(gapKind)` query (line 222) becomes a single filter pass over the catalog.

**`contextSteps`** is the most interesting field. It's a declarative recipe for what the strategy needs before it runs. More on this below.

**`deterministic`** is a hint to the runtime: "this strategy doesn't need an AI call." Used for ordering — deterministic strategies run first, AI-driven ones only when those fail.

## Declarative context steps

This is where the catalog stops being just a registry and starts being the actual interesting design.

In a hand-written dispatcher, every repair function does its own context-gathering. It runs the shell commands it needs, reads the files it needs, calls AI for the sub-questions it needs. The result is a lot of boilerplate per strategy and a lot of pre-conditions implicit in code.

Converge separates the *declaration* of what context a strategy needs from the *execution* of gathering it. Strategies declare their needs in the descriptor; the framework runs the steps and hands the results in. Six step types (`strategy-catalog.ts:63-94`):

```typescript
export type ContextStep =
  | { type: "gap"; fields: string[] }
  | { type: "cmd"; cmd: string; label: string }
  | { type: "file"; path: string; label: string; optional?: boolean }
  | { type: "files"; pattern: string; label: string; maxFiles?: number }
  | { type: "prompt"; question: string; label: string }
  | { type: "custom"; fn: (gap, projectDir) => Promise<string>; label: string };
```

- **`gap`** — extract specific fields from the failed gap's metadata.
- **`cmd`** — run a shell command, capture stdout.
- **`file`** — read a single file's contents.
- **`files`** — glob and read multiple files.
- **`prompt`** — ask the AI a sub-question (e.g. "given this gap, what's the relevant config field?").
- **`custom`** — escape hatch: arbitrary async function for context that doesn't fit the others.

The framework runs the steps and collects results into a `GatheredContext` object (line 100), which the strategy receives at execution time. The strategy's actual `tryFix` method gets a fully-populated context — no plumbing, no orchestration code repeated per strategy.

Two examples from the builtin catalog (lines 549–566):

```typescript
{
  strategyClass: "MissingInputPatternRepairStrategy",
  descriptor: {
    name: "missing-input-pattern",
    description: "Fixes glob pattern mismatches where files exist but at a different path...",
    gapKinds: ["blocker", "input"],
    contextSteps: [
      { type: "gap", fields: ["inputPattern"] },
      { type: "cmd",
        cmd: "find . -maxdepth 4 -type f | head -50",
        label: "filesystem-sample" },
    ],
    deterministic: true,
    priority: 8.5,
  },
},
```

That strategy needs two pieces of context: the broken input pattern (from the gap's metadata) and a sample of what's actually on the filesystem (a `find` command). The strategy itself is then a small function that diffs the two and proposes pattern variations. No `find` invocation in the strategy code — the framework ran it because the descriptor said so.

```typescript
{
  strategyClass: "DependencyBackoffStrategy",
  descriptor: {
    name: "dependency-backoff",
    description: "Resolves missing input dependencies by finding the upstream producer task and scheduling it to run first...",
    gapKinds: ["blocker", "input", "missing-intermediate"],
    contextSteps: [
      { type: "gap", fields: ["inputPattern", "missingInputs"] },
      { type: "cmd",
        cmd: "find .converge/epics -name \"TASK.md\" -exec grep -l \"outputs:\" {} \\; 2>/dev/null | head -20",
        label: "producer-candidates" },
    ],
    deterministic: false,
    priority: 9,
  },
},
```

This one needs the missing input plus a list of every TASK.md that declares outputs (candidate producers). The descriptor says exactly that; the framework runs the `find`; the strategy's job is to use AI to pick which candidate is the right producer to schedule. The strategy is small because the boilerplate isn't in it.

## Deterministic-first ordering

`getEligible(gapKind)` at line 222 returns the matching strategies in a specific order:

```typescript
return all.sort((a, b) => {
  if (a.deterministic && !b.deterministic) return -1;
  if (!a.deterministic && b.deterministic) return 1;
  return (b.priority ?? 5) - (a.priority ?? 5);
});
```

Deterministic strategies first, then by priority descending. The runtime tries each in order; the first that successfully fixes the gap stops the chain.

Why deterministic-first matters: it's a cost-saving discipline. AI-driven strategies are expensive — each one is a model call with non-trivial latency. Deterministic strategies are cheap — they're pattern matches and shell commands. If a pattern-based fix can resolve a gap, you should always try it before an AI call.

Concretely, if a task fails because its input glob doesn't match anything, two strategies are eligible: `missing-input-pattern` (deterministic — pattern variation testing) and `dependency-backoff` (AI — find the producer). The catalog tries `missing-input-pattern` first. If that resolves the gap (often it does — the most common cause is a path-mismatch the pattern can repair without AI), no AI call happens. If not, `dependency-backoff` runs.

This ordering isn't a list someone hand-curated. It comes out of two declarative fields on each descriptor: `deterministic: boolean` and `priority: number`. Adding a new deterministic strategy doesn't require rebalancing anything. It enters the order automatically.

## What the catalog gives you operationally

**Strategy authoring is local.** A new repair strategy is one descriptor and one implementation file under `packages/core/src/navigator/repair/strategies/`. The dispatcher doesn't change. No merge conflicts on a central switch. Reviewers can audit the strategy in isolation — `gapKinds` tells them what it claims; `contextSteps` tells them what it needs; the implementation tells them what it does with that context.

**The catalog is introspectable.** `formatCatalogForAI()` at line 253 serializes the eligible strategies for a gap into a prompt section. The AI selector sees the same view of the catalog operators do — names, descriptions, what each can handle. Operators can dump the catalog from the CLI without reading source.

**TASK.md skills get the same first-class treatment as TS-class strategies.** A skill declared as a TASK.md file under `.converge/skills/` is registered into the same catalog with `type: "skill"`. The dispatcher doesn't distinguish between the two — both have descriptors, both go through the same `getEligible` query, both get the same context-gathering machinery. Repair recipes can ship as markdown files instead of code, which is what makes contributing repair logic accessible to non-engineers.

## What the catalog gives up

Order-by-priority is a global ordering. If a strategy needs to run only when *another* strategy has been tried and failed, that's not directly expressible — it has to be encoded in the strategy's `canHandle` logic, not in the catalog. In practice this hasn't been a constraint for the seven builtins (they're independently applicable), but it's a real ceiling.

The catalog also doesn't model strategy *combinations* — sequences where strategy A's output feeds strategy B. Each strategy is invoked in isolation against a gathered context. If multi-strategy workflows become common, that would warrant additional structure on top of the catalog.

## How this compares

**Kubernetes CSI plugins.** CSI is a registry of storage provider plugins, each declaring its capabilities (volume types, snapshot support, expansion support, etc.). The orchestrator queries the registry by capability and dispatches to the matching plugin. The Converge strategy catalog is the same shape applied to repair: descriptors declare capabilities (gapKinds), the dispatcher queries by need (the gap's kind).

**Compiler optimization passes.** Modern compilers maintain a registry of optimization passes, each declaring its preconditions and postconditions. The pass manager picks an order satisfying constraints. Converge is simpler — global priority instead of constraint solving — but the discipline is the same: strategies declare their applicability declaratively; orchestration is derived.

**Plugin systems generally.** The pattern of "registry of capabilities, dispatcher derives behavior from the registry" is the standard plugin shape (VS Code extensions, Webpack loaders, Babel plugins, ESLint rules). Converge's contribution is applying it to the AI repair domain, where the *AI selector itself* reads the catalog for non-deterministic decisions — the dispatcher and the AI use the same view.

## When this matters for your work

You'll feel the catalog the first time you want to add a custom repair strategy for a failure mode specific to your project. Instead of forking the framework, you write a descriptor and an implementation, register it once, and it's part of the dispatch. The framework treats it identically to builtin strategies.

You'll also feel it operationally: "what would the framework try if check X failed?" is `registry.getEligible(gapKind).map(d => d.name)` — a single function call, not a code archaeology project.

## Where this lives

- `packages/core/src/navigator/repair/strategy-catalog.ts` — the registry: `StrategyDescriptor` (line 115), `ContextStep` types (lines 63–94), `UnifiedStrategyRegistry` class (line 141), `getEligible` (line 222), `formatCatalogForAI` (line 253), `getBuiltinDescriptors` (line 489) with all 7 builtin descriptors through line 631.
- `packages/core/src/navigator/repair/strategies/` — the implementations of each builtin strategy. Each file pairs with one descriptor in the catalog.
- `.converge/skills/*/TASK.md` — skill-based repair recipes (declared as markdown, registered into the same catalog with `type: "skill"`).

For the next layer — the unglamorous correctness primitives that make every repair-and-retry cycle safe to interrupt and resume — see [Runtime hygiene](./05-runtime-hygiene).
