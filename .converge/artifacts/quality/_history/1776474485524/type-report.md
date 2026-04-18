{
  "generatedAt": "2026-04-18",
  "packages": [
    {
      "name": "@converge/acpfn",
      "path": "packages/acpfn",
      "strict": true,
      "target": "ES2022",
      "module": "NodeNext",
      "typeErrors": 0,
      "anyCount": 8,
      "tsIgnoreCount": 0,
      "typeAssertions": 5
    },
    {
      "name": "@converge/agentfn",
      "path": "packages/agentfn",
      "strict": true,
      "target": "ES2022",
      "module": "NodeNext",
      "typeErrors": 0,
      "anyCount": 1,
      "tsIgnoreCount": 0,
      "typeAssertions": 65
    },
    {
      "name": "@converge/claudefn",
      "path": "packages/claudefn",
      "strict": true,
      "target": "ES2022",
      "module": "NodeNext",
      "typeErrors": 0,
      "anyCount": 18,
      "tsIgnoreCount": 0,
      "typeAssertions": 9
    },
    {
      "name": "codets",
      "path": "packages/codets",
      "strict": true,
      "target": "ES2022",
      "module": "ESNext",
      "typeErrors": 0,
      "anyCount": 0,
      "tsIgnoreCount": 0,
      "typeAssertions": 0
    },
    {
      "name": "@converge/core",
      "path": "packages/core",
      "strict": true,
      "target": "ES2022",
      "module": "ESNext",
      "typeErrors": 41,
      "anyCount": 314,
      "tsIgnoreCount": 0,
      "typeAssertions": 182
    },
    {
      "name": "@converge/geminifn",
      "path": "packages/geminifn",
      "strict": true,
      "target": "ES2022",
      "module": "NodeNext",
      "typeErrors": 0,
      "anyCount": 3,
      "tsIgnoreCount": 0,
      "typeAssertions": 6
    },
    {
      "name": "@converge/kimifn",
      "path": "packages/kimifn",
      "strict": true,
      "target": "ES2022",
      "module": "NodeNext",
      "typeErrors": 0,
      "anyCount": 6,
      "tsIgnoreCount": 0,
      "typeAssertions": 8
    },
    {
      "name": "@converge/openfn",
      "path": "packages/openfn",
      "strict": true,
      "target": "ES2022",
      "module": "NodeNext",
      "typeErrors": 0,
      "anyCount": 1,
      "tsIgnoreCount": 0,
      "typeAssertions": 24
    },
    {
      "name": "@converge/qwenfn",
      "path": "packages/qwenfn",
      "strict": true,
      "target": "ES2022",
      "module": "NodeNext",
      "typeErrors": 0,
      "anyCount": 6,
      "tsIgnoreCount": 0,
      "typeAssertions": 8
    }
  ],
  "totalTypeErrors": 41,
  "totalAnyUsage": 357,
  "totalTsIgnore": 0,
  "recommendations": [
    "Fix 41 type errors in @converge/core — commands-goals.ts (11 errors), tool-environment-repair.ts (7), index.ts (4), goal-planner.ts (3), main.ts (3)",
    "Consider replacing 'any' in packages/core/src/journal/console-formatter.ts (14 occurrences) with typed event interfaces",
    "Consider replacing 'any' in packages/core/src/lifecycle/task-runner.ts (13 occurrences) — use type-only import for SessionLogger",
    "Consider replacing 'any' in packages/core/src/executor/spawn-runner.ts (6 occurrences) with proper subprocess types",
    "Consider replacing 'as any' in packages/core/src/executor/wbs-executor.ts (12 casts) — use discriminated unions or type guards",
    "Consider replacing 'as any' in packages/core/src/journal/session-event-bridge.ts (11 casts) — define typed union for session events",
    "Consider replacing 'as any' in packages/core/src/repair/navigator/actions.ts (9 casts) — extend EventType union",
    "Consider replacing 'any' in packages/claudefn/src/claudefn.ts (8 occurrences) with typed event/error types",
    "Consider replacing 'any' in packages/acpfn/src/acpfn.ts (7 occurrences) with typed event/error types",
    "Add acpfn and openfn to root tsconfig.json references array",
    "Enable noUncheckedIndexedAccess in all packages for safer indexed access"
  ]
}
