{
  "framework": "vitest",
  "totalTests": 1321,
  "passed": 1166,
  "failed": 147,
  "skipped": 8,
  "coverage": {
    "lines": null,
    "branches": null,
    "functions": null,
    "statements": null
  },
  "lowCoverageFiles": [],
  "failedTests": [
    {
      "name": "[core] WBS Path Resolution Integration > Real WBS Task: 002-001-page-home-dashboard > should create correct task context",
      "error": "AssertionError: expected '/Users/minh/Documents/converge/artifa\u2026' to contain 'journal/default/tasks/03-implement-ap\u2026'\n    at /Users/minh/Documents/converge/packages/core/tests/integration/wbs-path-res"
    },
    {
      "name": "[core] Path Resolution Consistency > should match for root-level task (no /tasks/ subdirectory)",
      "error": "AssertionError: expected '/test/project/.converge/journal/stand\u2026' to be '/test/project/.converge/journal/defau\u2026' // Object.is equality\n    at /Users/minh/Documents/converge/packages/core/tests/journal"
    },
    {
      "name": "[core] Path Resolution Consistency > should match for WBS subtask (under /tasks/ subdirectory)",
      "error": "AssertionError: expected '/test/project/.converge/journal/stand\u2026' to be '/test/project/.converge/journal/defau\u2026' // Object.is equality\n    at /Users/minh/Documents/converge/packages/core/tests/journal"
    },
    {
      "name": "[core] Path Resolution Consistency > should match for deeply nested task",
      "error": "AssertionError: expected '/test/project/.converge/journal/stand\u2026' to be '/test/project/.converge/journal/defau\u2026' // Object.is equality\n    at /Users/minh/Documents/converge/packages/core/tests/journal"
    },
    {
      "name": "[core] Path Resolution Consistency > should never add /tasks/ if not present in taskId",
      "error": "AssertionError: expected '/test/project/.converge/journal/stand\u2026' to be '/test/project/.converge/journal/defau\u2026' // Object.is equality\n    at /Users/minh/Documents/converge/packages/core/tests/journal"
    },
    {
      "name": "[core] Path Resolution Consistency > should handle hierarchical taskId with two segments",
      "error": "AssertionError: expected '/test/project/.converge/journal/stand\u2026' to be '/test/project/.converge/journal/defau\u2026' // Object.is equality\n    at /Users/minh/Documents/converge/packages/core/tests/journal"
    },
    {
      "name": "[core] Parent Facts Loading > should have context with parent reference",
      "error": "AssertionError: expected '/Users/minh/Documents/converge/packag\u2026' to be '/Users/minh/Documents/converge/packag\u2026' // Object.is equality\n    at /Users/minh/Documents/converge/packages/core/tests/unit/pa"
    },
    {
      "name": "[core] path-utils > constructJournalPath > should mirror epic structure exactly for root tasks",
      "error": "AssertionError: expected '.converge/journal/standardize/tasks/0\u2026' to be '.converge/journal/default/tasks/03-im\u2026' // Object.is equality\n    at /Users/minh/Documents/converge/packages/core/tests/unit/pa"
    },
    {
      "name": "[core] path-utils > constructJournalPath > should mirror epic structure exactly for WBS subtasks",
      "error": "AssertionError: expected '.converge/journal/standardize/tasks/0\u2026' to be '.converge/journal/default/tasks/03-im\u2026' // Object.is equality\n    at /Users/minh/Documents/converge/packages/core/tests/unit/pa"
    },
    {
      "name": "[core] path-utils > constructJournalPath > should mirror epic structure exactly for deeply nested tasks",
      "error": "AssertionError: expected '.converge/journal/standardize/tasks/0\u2026' to be '.converge/journal/default/tasks/03-im\u2026' // Object.is equality\n    at /Users/minh/Documents/converge/packages/core/tests/unit/pa"
    },
    {
      "name": "[core] path-utils > constructJournalPath > should strip TASK.md from journal paths",
      "error": "AssertionError: expected '.converge/journal/standardize/tasks/0\u2026' to be '.converge/journal/default/tasks/03-im\u2026' // Object.is equality\n    at /Users/minh/Documents/converge/packages/core/tests/unit/pa"
    },
    {
      "name": "[core] path-utils > constructJournalPath > should work with absolute paths",
      "error": "AssertionError: expected '/Users/minh/project/.converge/journal\u2026' to be '/Users/minh/project/.converge/journal\u2026' // Object.is equality\n    at /Users/minh/Documents/converge/packages/core/tests/unit/pa"
    },
    {
      "name": "[core] path-utils > constructJournalPath > should strip TASK.md from journal paths",
      "error": "AssertionError: expected '.converge/journal/standardize/tasks/0\u2026' to be '.converge/journal/default/tasks/03-im\u2026' // Object.is equality\n    at /Users/minh/Documents/converge/packages/core/tests/unit/pa"
    },
    {
      "name": "[core] LoopFunctionExecutor > ctx.ai.ask() > restricts evaluator to Read and Glob tools",
      "error": "AssertionError: expected [ 'Read', 'Glob', 'Grep' ] to deeply equal [ 'Read', 'Glob' ]\n    at /Users/minh/Documents/converge/packages/core/tests/unit/executor/loop-executor.test.ts:490:38\n    at proce"
    },
    {
      "name": "[core] LoopFunctionExecutor > ctx.ai.ask().asJson() > uses a separate agentfn call with the custom schema",
      "error": "AssertionError: expected [ 'Read', 'Glob', 'Grep' ] to deeply equal [ 'Read', 'Glob' ]\n    at /Users/minh/Documents/converge/packages/core/tests/unit/executor/loop-executor.test.ts:593:34\n    at proce"
    },
    {
      "name": "[core] TaskExecutor > ctx.ai.fn() > each call invokes claudefn and returns typed result",
      "error": "TypeError: Cannot read properties of undefined (reading 'answer')\n    at /Users/minh/Documents/converge/packages/core/tests/unit/executor/task-executor.test.ts:273:21\n    at processTicksAndRejections "
    },
    {
      "name": "[core] TaskExecutor > ctx.ai.fn() > multiple calls to same fn are independent and journaled separately",
      "error": "AssertionError: expected +0 to be 1 // Object.is equality\n    at /Users/minh/Documents/converge/packages/core/tests/unit/executor/task-executor.test.ts:297:25\n    at processTicksAndRejections (node:in"
    },
    {
      "name": "[core] TaskExecutor > ctx.ai.fn() > agentfn constructed once per fn() call, not per invocation",
      "error": "AssertionError: expected +0 to be 1 // Object.is equality\n    at /Users/minh/Documents/converge/packages/core/tests/unit/executor/task-executor.test.ts:323:52\n    at processTicksAndRejections (node:in"
    },
    {
      "name": "[core] TaskExecutor > ctx.ai.fn() > respects custom allowedTools",
      "error": "AssertionError: expected undefined to deeply equal [ 'Read', 'Bash' ]\n    at /Users/minh/Documents/converge/packages/core/tests/unit/executor/task-executor.test.ts:358:34\n    at processTicksAndRejecti"
    },
    {
      "name": "[core] TaskExecutor > ctx.ai.fn() > logs CLAUDEFN_FAILED on error and re-throws",
      "error": "AssertionError: expected '[vitest] No \"runAgent\" export is defi\u2026' to contain 'claudefn execution failed'\n    at /Users/minh/Documents/converge/packages/core/tests/unit/executor/task-executor.test.ts:3"
    },
    {
      "name": "[core] TaskExecutor > ctx.ai.ask() > returns true when AI answers yes",
      "error": "AssertionError: expected false to be true // Object.is equality\n    at /Users/minh/Documents/converge/packages/core/tests/unit/executor/task-executor.test.ts:401:22\n    at processTicksAndRejections (n"
    },
    {
      "name": "[core] TaskExecutor > ctx.ai.ask() > uses read-only tools",
      "error": "AssertionError: expected undefined to deeply equal [ 'Read', 'Glob' ]\n    at /Users/minh/Documents/converge/packages/core/tests/unit/executor/task-executor.test.ts:427:34\n    at processTicksAndRejecti"
    },
    {
      "name": "[core] TaskExecutor > ctx.ai.ask().asJson() > returns structured data matching the schema",
      "error": "AssertionError: expected undefined to deeply equal { remaining: 3, \u2026(1) }\n    at /Users/minh/Documents/converge/packages/core/tests/unit/executor/task-executor.test.ts:452:22\n    at processTicksAndRej"
    },
    {
      "name": "[core] TaskExecutor > ctx.ai.ask().asJson() > uses a separate agentfn call with the custom schema",
      "error": "AssertionError: expected undefined to be defined\n    at /Users/minh/Documents/converge/packages/core/tests/unit/executor/task-executor.test.ts:470:20\n    at processTicksAndRejections (node:internal/pr"
    },
    {
      "name": "[core] TaskExecutor > ctx.ai.ask().asJson() > propagates errors (does not swallow like boolean ask)",
      "error": "AssertionError: expected '[vitest] No \"runAgent\" export is defi\u2026' to contain 'claudefn execution failed'\n    at /Users/minh/Documents/converge/packages/core/tests/unit/executor/task-executor.test.ts:4"
    },
    {
      "name": "[core] Journal API > Task Journal API > should find errors",
      "error": "AssertionError: expected [ { \u2026(5) }, { \u2026(5) }, { \u2026(5) } ] to have a length of 2 but got 3\n    at Proxy.<anonymous> (file:///Users/minh/Documents/converge/packages/core/node_modules/@vitest/expect/dist"
    },
    {
      "name": "[core] Journal API > Task Journal API > should search log by pattern",
      "error": "AssertionError: expected [ { \u2026(5) }, { \u2026(5) }, { \u2026(5) } ] to have a length of 2 but got 3\n    at Proxy.<anonymous> (file:///Users/minh/Documents/converge/packages/core/node_modules/@vitest/expect/dist"
    },
    {
      "name": "[core] Journal API > Task Journal API > should read log with filters",
      "error": "AssertionError: expected [ { \u2026(5) }, { \u2026(5) }, { \u2026(5) }, \u2026(4) ] to have a length of 2 but got 7\n    at Proxy.<anonymous> (file:///Users/minh/Documents/converge/packages/core/node_modules/@vitest/expec"
    },
    {
      "name": "[core] Journal API > Task Journal API > should return empty arrays when no journal exists",
      "error": "AssertionError: expected [ { id: 'gap-001', \u2026(8) }, \u2026(1) ] to have a length of +0 but got 2\n    at Proxy.<anonymous> (file:///Users/minh/Documents/converge/packages/core/node_modules/@vitest/expect/di"
    },
    {
      "name": "[core] Journal Writer > logTaskEvent > should log task events to JSONL and human-readable log",
      "error": "AssertionError: expected [ { type: 'task_start', \u2026(7) }, \u2026(22) ] to have a length of 2 but got 23\n    at Proxy.<anonymous> (file:///Users/minh/Documents/converge/packages/core/node_modules/@vitest/exp"
    },
    {
      "name": "[core] Journal Writer > logTaskEvent > should log errors",
      "error": "AssertionError: expected [ { \u2026(5) }, { \u2026(5) }, { \u2026(5) }, \u2026(5) ] to have a length of 1 but got 8\n    at Proxy.<anonymous> (file:///Users/minh/Documents/converge/packages/core/node_modules/@vitest/expec"
    },
    {
      "name": "[core] journal structure > getJournalStructure > should create epic-level structure",
      "error": "AssertionError: expected '/Users/test/project/.converge/journal\u2026' to be '/Users/test/project/.converge/journal\u2026' // Object.is equality\n    at /Users/minh/Documents/converge/packages/core/tests/unit/jo"
    },
    {
      "name": "[core] journal structure > getJournalStructure > should create task-level structure for root tasks",
      "error": "AssertionError: expected '/Users/test/project/.converge/journal\u2026' to be '/Users/test/project/.converge/journal\u2026' // Object.is equality\n    at /Users/minh/Documents/converge/packages/core/tests/unit/jo"
    },
    {
      "name": "[core] journal structure > getJournalStructure > should create proper hierarchy for nested tasks (one level)",
      "error": "AssertionError: expected '/Users/test/project/.converge/journal\u2026' to be '/Users/test/project/.converge/journal\u2026' // Object.is equality\n    at /Users/minh/Documents/converge/packages/core/tests/unit/jo"
    },
    {
      "name": "[core] journal structure > getJournalStructure > should create proper hierarchy for deeply nested tasks (two levels)",
      "error": "AssertionError: expected '/Users/test/project/.converge/journal\u2026' to be '/Users/test/project/.converge/journal\u2026' // Object.is equality\n    at /Users/minh/Documents/converge/packages/core/tests/unit/jo"
    },
    {
      "name": "[core] journal structure > getJournalStructure > should create proper hierarchy for very deeply nested tasks (three levels)",
      "error": "AssertionError: expected '/Users/test/project/.converge/journal\u2026' to be '/Users/test/project/.converge/journal\u2026' // Object.is equality\n    at /Users/minh/Documents/converge/packages/core/tests/unit/jo"
    },
    {
      "name": "[core] journal structure > getJournalStructure > should handle taskId with trailing slash",
      "error": "AssertionError: expected '/Users/test/project/.converge/journal\u2026' to be '/Users/test/project/.converge/journal\u2026' // Object.is equality\n    at /Users/minh/Documents/converge/packages/core/tests/unit/jo"
    },
    {
      "name": "[core] journal structure > getJournalStructure > should handle taskId with multiple slashes",
      "error": "AssertionError: expected '/Users/test/project/.converge/journal\u2026' to be '/Users/test/project/.converge/journal\u2026' // Object.is equality\n    at /Users/minh/Documents/converge/packages/core/tests/unit/jo"
    },
    {
      "name": "[core] journal structure > getTaskAttemptDir > should create attempt dir for root task",
      "error": "AssertionError: expected '/Users/test/project/.converge/journal\u2026' to be '/Users/test/project/.converge/journal\u2026' // Object.is equality\n    at /Users/minh/Documents/converge/packages/core/tests/unit/jo"
    },
    {
      "name": "[core] journal structure > getTaskAttemptDir > should create attempt dir for nested task",
      "error": "AssertionError: expected '/Users/test/project/.converge/journal\u2026' to be '/Users/test/project/.converge/journal\u2026' // Object.is equality\n    at /Users/minh/Documents/converge/packages/core/tests/unit/jo"
    },
    {
      "name": "[core] journal structure > getTaskAttemptDir > should handle string attempt numbers",
      "error": "AssertionError: expected '/Users/test/project/.converge/journal\u2026' to be '/Users/test/project/.converge/journal\u2026' // Object.is equality\n    at /Users/minh/Documents/converge/packages/core/tests/unit/jo"
    },
    {
      "name": "[core] journal structure > getTaskAttemptDir > should pad numeric attempt numbers",
      "error": "AssertionError: expected '/Users/test/project/.converge/journal\u2026' to be '/Users/test/project/.converge/journal\u2026' // Object.is equality\n    at /Users/minh/Documents/converge/packages/core/tests/unit/jo"
    },
    {
      "name": "[core] journal structure > getAncestorJournalPaths > should return parent path for one level of nesting",
      "error": "AssertionError: expected '/Users/test/project/.converge/journal\u2026' to be '/Users/test/project/.converge/journal\u2026' // Object.is equality\n    at /Users/minh/Documents/converge/packages/core/tests/unit/jo"
    },
    {
      "name": "[core] journal structure > getAncestorJournalPaths > should return all ancestor paths for deeply nested tasks",
      "error": "AssertionError: expected '/Users/test/project/.converge/journal\u2026' to be '/Users/test/project/.converge/journal\u2026' // Object.is equality\n    at /Users/minh/Documents/converge/packages/core/tests/unit/jo"
    },
    {
      "name": "[core] journal structure > journal structure consistency > should verify epic structure mirrors journal structure",
      "error": "AssertionError: expected '/Users/test/project/.converge/journal\u2026' to contain '/journal/default/tasks/03-implement-a\u2026'\n    at /Users/minh/Documents/converge/packages/core/tests/unit/journal/structure.t"
    },
    {
      "name": "[core] journal structure > PlaybookContext routing > should fall back to legacy paths when no context",
      "error": "AssertionError: expected '/Users/test/project/.converge/journal\u2026' to be '/Users/test/project/.converge/journal\u2026' // Object.is equality\n    at /Users/minh/Documents/converge/packages/core/tests/unit/jo"
    },
    {
      "name": "[core] format rules > id-format > flags non-standard id",
      "error": "Error: Rule \"id-format\" not found\n    at runRule (/Users/minh/Documents/converge/packages/core/tests/unit/validation/format-rules.test.ts:22:20)\n    at /Users/minh/Documents/converge/packages/core/tes"
    },
    {
      "name": "[core] format rules > id-format > passes with NNN-kebab format",
      "error": "Error: Rule \"id-format\" not found\n    at runRule (/Users/minh/Documents/converge/packages/core/tests/unit/validation/format-rules.test.ts:22:20)\n    at /Users/minh/Documents/converge/packages/core/tes"
    },
    {
      "name": "[core] format rules > id-format > passes with NN-kebab format (epic-level task)",
      "error": "Error: Rule \"id-format\" not found\n    at runRule (/Users/minh/Documents/converge/packages/core/tests/unit/validation/format-rules.test.ts:22:20)\n    at /Users/minh/Documents/converge/packages/core/tes"
    },
    {
      "name": "[core] format rules > id-format > skips empty id (handled by id-required)",
      "error": "Error: Rule \"id-format\" not found\n    at runRule (/Users/minh/Documents/converge/packages/core/tests/unit/validation/format-rules.test.ts:22:20)\n    at /Users/minh/Documents/converge/packages/core/tes"
    },
    {
      "name": "[core] structure rules > inputs-not-self-referential > flags overlapping input/output paths",
      "error": "Error: Rule \"inputs-not-self-referential\" not found\n    at runRule (/Users/minh/Documents/converge/packages/core/tests/unit/validation/structure-rules.test.ts:34:20)\n    at /Users/minh/Documents/conve"
    },
    {
      "name": "[core] structure rules > inputs-not-self-referential > passes with no overlap",
      "error": "Error: Rule \"inputs-not-self-referential\" not found\n    at runRule (/Users/minh/Documents/converge/packages/core/tests/unit/validation/structure-rules.test.ts:34:20)\n    at /Users/minh/Documents/conve"
    },
    {
      "name": "[core] syntax rules > inputs-outputs-overlap > flags overlapping paths",
      "error": "Error: Rule \"inputs-outputs-overlap\" not found\n    at runRule (/Users/minh/Documents/converge/packages/core/tests/unit/validation/syntax-rules.test.ts:21:20)\n    at /Users/minh/Documents/converge/pack"
    },
    {
      "name": "[core] syntax rules > inputs-outputs-overlap > passes with no overlap",
      "error": "Error: Rule \"inputs-outputs-overlap\" not found\n    at runRule (/Users/minh/Documents/converge/packages/core/tests/unit/validation/syntax-rules.test.ts:21:20)\n    at /Users/minh/Documents/converge/pack"
    },
    {
      "name": "[claudefn] claudefn \u2014 core API > invokes claude CLI with --dangerously-skip-permissions and -p flag",
      "error": "Error: logDir is required - claudefn no longer uses a default log directory\n    at createLogFile (/Users/minh/Documents/converge/packages/claudefn/src/claudefn.ts:61:11)\n    at executeViaCli (/Users/m"
    },
    {
      "name": "[claudefn] claudefn \u2014 core API > returns result with data, raw, and durationMs",
      "error": "Error: logDir is required - claudefn no longer uses a default log directory\n    at createLogFile (/Users/minh/Documents/converge/packages/claudefn/src/claudefn.ts:61:11)\n    at executeViaCli (/Users/m"
    },
    {
      "name": "[claudefn] claudefn \u2014 core API > interpolates {{input}} in prompt template",
      "error": "Error: logDir is required - claudefn no longer uses a default log directory\n    at createLogFile (/Users/minh/Documents/converge/packages/claudefn/src/claudefn.ts:61:11)\n    at executeViaCli (/Users/m"
    },
    {
      "name": "[claudefn] claudefn \u2014 core API > works without {{input}} placeholder",
      "error": "Error: logDir is required - claudefn no longer uses a default log directory\n    at createLogFile (/Users/minh/Documents/converge/packages/claudefn/src/claudefn.ts:61:11)\n    at executeViaCli (/Users/m"
    },
    {
      "name": "[claudefn] claudefn \u2014 core API > passes extra cliFlags to the spawn args",
      "error": "Error: logDir is required - claudefn no longer uses a default log directory\n    at createLogFile (/Users/minh/Documents/converge/packages/claudefn/src/claudefn.ts:61:11)\n    at executeViaCli (/Users/m"
    },
    {
      "name": "[claudefn] claudefn \u2014 core API > passes cwd to spawn options",
      "error": "Error: logDir is required - claudefn no longer uses a default log directory\n    at createLogFile (/Users/minh/Documents/converge/packages/claudefn/src/claudefn.ts:61:11)\n    at executeViaCli (/Users/m"
    },
    {
      "name": "[claudefn] claudefn \u2014 allowedTools > passes --allowedTools flag to CLI when allowedTools is set",
      "error": "Error: logDir is required - claudefn no longer uses a default log directory\n    at createLogFile (/Users/minh/Documents/converge/packages/claudefn/src/claudefn.ts:61:11)\n    at executeViaCli (/Users/m"
    },
    {
      "name": "[claudefn] claudefn \u2014 allowedTools > does not pass --allowedTools flag when not set",
      "error": "Error: logDir is required - claudefn no longer uses a default log directory\n    at createLogFile (/Users/minh/Documents/converge/packages/claudefn/src/claudefn.ts:61:11)\n    at executeViaCli (/Users/m"
    },
    {
      "name": "[claudefn] claudefn \u2014 allowedTools > does not pass --allowedTools flag when empty array",
      "error": "Error: logDir is required - claudefn no longer uses a default log directory\n    at createLogFile (/Users/minh/Documents/converge/packages/claudefn/src/claudefn.ts:61:11)\n    at executeViaCli (/Users/m"
    },
    {
      "name": "[claudefn] claudefn \u2014 allowedTools > places --allowedTools before extra cliFlags",
      "error": "Error: logDir is required - claudefn no longer uses a default log directory\n    at createLogFile (/Users/minh/Documents/converge/packages/claudefn/src/claudefn.ts:61:11)\n    at executeViaCli (/Users/m"
    },
    {
      "name": "[claudefn] claudefn \u2014 dynamic prompt > accepts a function that returns a prompt string",
      "error": "Error: logDir is required - claudefn no longer uses a default log directory\n    at createLogFile (/Users/minh/Documents/converge/packages/claudefn/src/claudefn.ts:61:11)\n    at executeViaCli (/Users/m"
    },
    {
      "name": "[claudefn] claudefn \u2014 dynamic prompt > passes input to the prompt function",
      "error": "Error: logDir is required - claudefn no longer uses a default log directory\n    at createLogFile (/Users/minh/Documents/converge/packages/claudefn/src/claudefn.ts:61:11)\n    at executeViaCli (/Users/m"
    },
    {
      "name": "[claudefn] claudefn \u2014 dynamic prompt > prompt function receives undefined when no input given",
      "error": "Error: logDir is required - claudefn no longer uses a default log directory\n    at createLogFile (/Users/minh/Documents/converge/packages/claudefn/src/claudefn.ts:61:11)\n    at executeViaCli (/Users/m"
    },
    {
      "name": "[claudefn] claudefn \u2014 dynamic prompt > dynamic prompt works with before hook",
      "error": "Error: logDir is required - claudefn no longer uses a default log directory\n    at createLogFile (/Users/minh/Documents/converge/packages/claudefn/src/claudefn.ts:61:11)\n    at executeViaCli (/Users/m"
    },
    {
      "name": "[claudefn] claudefn \u2014 dynamic prompt > dynamic prompt can use closures for context",
      "error": "Error: logDir is required - claudefn no longer uses a default log directory\n    at createLogFile (/Users/minh/Documents/converge/packages/claudefn/src/claudefn.ts:61:11)\n    at executeViaCli (/Users/m"
    },
    {
      "name": "[claudefn] claudefn \u2014 schema validation > parses JSON output through zod schema",
      "error": "Error: logDir is required - claudefn no longer uses a default log directory\n    at createLogFile (/Users/minh/Documents/converge/packages/claudefn/src/claudefn.ts:61:11)\n    at executeViaCli (/Users/m"
    },
    {
      "name": "[claudefn] claudefn \u2014 schema validation > extracts JSON from markdown code fences before parsing",
      "error": "Error: logDir is required - claudefn no longer uses a default log directory\n    at createLogFile (/Users/minh/Documents/converge/packages/claudefn/src/claudefn.ts:61:11)\n    at executeViaCli (/Users/m"
    },
    {
      "name": "[claudefn] claudefn \u2014 schema validation > preserves raw output even when schema is used",
      "error": "Error: logDir is required - claudefn no longer uses a default log directory\n    at createLogFile (/Users/minh/Documents/converge/packages/claudefn/src/claudefn.ts:61:11)\n    at executeViaCli (/Users/m"
    },
    {
      "name": "[claudefn] claudefn \u2014 hooks > calls before hook and allows prompt modification",
      "error": "Error: logDir is required - claudefn no longer uses a default log directory\n    at createLogFile (/Users/minh/Documents/converge/packages/claudefn/src/claudefn.ts:61:11)\n    at executeViaCli (/Users/m"
    },
    {
      "name": "[claudefn] claudefn \u2014 hooks > calls after hook with result and duration",
      "error": "Error: logDir is required - claudefn no longer uses a default log directory\n    at createLogFile (/Users/minh/Documents/converge/packages/claudefn/src/claudefn.ts:61:11)\n    at executeViaCli (/Users/m"
    },
    {
      "name": "[claudefn] claudefn \u2014 hooks > calls onStream hook with each stdout chunk",
      "error": "Error: logDir is required - claudefn no longer uses a default log directory\n    at createLogFile (/Users/minh/Documents/converge/packages/claudefn/src/claudefn.ts:61:11)\n    at executeViaCli (/Users/m"
    },
    {
      "name": "[claudefn] claudefn \u2014 hooks > before hook returning void keeps original prompt",
      "error": "Error: logDir is required - claudefn no longer uses a default log directory\n    at createLogFile (/Users/minh/Documents/converge/packages/claudefn/src/claudefn.ts:61:11)\n    at executeViaCli (/Users/m"
    },
    {
      "name": "[claudefn] claudefn \u2014 error handling > throws on non-zero exit code with stderr",
      "error": "AssertionError: expected [Function] to throw error including 'Something went wrong' but got 'logDir is required - claudefn no long\u2026'\n    at _Assertion.<anonymous> (file:///Users/minh/Documents/converg"
    },
    {
      "name": "[claudefn] claudefn \u2014 error handling > throws on non-zero exit code even without stderr",
      "error": "AssertionError: expected [Function] to throw error matching /exit code 1/i but got 'logDir is required - claudefn no long\u2026'\n    at _Assertion.<anonymous> (file:///Users/minh/Documents/converge/node_mo"
    },
    {
      "name": "[claudefn] claudefn \u2014 error handling > times out and kills the process",
      "error": "AssertionError: expected [Function] to throw error matching /timed out/i but got 'logDir is required - claudefn no long\u2026'\n    at _Assertion.<anonymous> (file:///Users/minh/Documents/converge/node_modu"
    },
    {
      "name": "[claudefn] claudefn \u2014 error handling > retries on failure up to maxRetries",
      "error": "Error: logDir is required - claudefn no longer uses a default log directory\n    at createLogFile (/Users/minh/Documents/converge/packages/claudefn/src/claudefn.ts:61:11)\n    at executeViaCli (/Users/m"
    },
    {
      "name": "[claudefn] claudefn \u2014 promptless usage > uses input as the full prompt when no prompt option is given",
      "error": "Error: logDir is required - claudefn no longer uses a default log directory\n    at createLogFile (/Users/minh/Documents/converge/packages/claudefn/src/claudefn.ts:61:11)\n    at executeViaCli (/Users/m"
    },
    {
      "name": "[claudefn] claudefn \u2014 promptless usage > returns result data from promptless call",
      "error": "Error: logDir is required - claudefn no longer uses a default log directory\n    at createLogFile (/Users/minh/Documents/converge/packages/claudefn/src/claudefn.ts:61:11)\n    at executeViaCli (/Users/m"
    },
    {
      "name": "[agentfn] agent \u2014 core API > delegates to claudefn agent",
      "error": "Error: agentfn: agent() is not available \u2014 the Claude Agent SDK backend has been removed. Use agentfn() instead.\n    at agent (/Users/minh/Documents/converge/packages/agentfn/src/agent.ts:22:9)\n    at"
    },
    {
      "name": "[agentfn] agent \u2014 core API > passes options through to claudefn agent",
      "error": "Error: agentfn: agent() is not available \u2014 the Claude Agent SDK backend has been removed. Use agentfn() instead.\n    at agent (/Users/minh/Documents/converge/packages/agentfn/src/agent.ts:22:9)\n    at"
    },
    {
      "name": "[agentfn] agent \u2014 core API > strips provider field before passing to claudefn agent",
      "error": "Error: agentfn: agent() is not available \u2014 the Claude Agent SDK backend has been removed. Use agentfn() instead.\n    at agent (/Users/minh/Documents/converge/packages/agentfn/src/agent.ts:22:9)\n    at"
    },
    {
      "name": "[agentfn] agent \u2014 core API > returns the result from claudefn agent",
      "error": "Error: agentfn: agent() is not available \u2014 the Claude Agent SDK backend has been removed. Use agentfn() instead.\n    at agent (/Users/minh/Documents/converge/packages/agentfn/src/agent.ts:22:9)\n    at"
    },
    {
      "name": "[agentfn] agent \u2014 kimi provider > throws when provider is kimi",
      "error": "AssertionError: expected [Function] to throw error matching /agent.*not supported.*kimi/i but got 'agentfn: agent() is not available \u2014 t\u2026'\n    at Proxy.<anonymous> (file:///Users/minh/Documents/conver"
    },
    {
      "name": "[agentfn] agent \u2014 kimi provider > throws when default provider is kimi",
      "error": "AssertionError: expected [Function] to throw error matching /agent.*not supported.*kimi/i but got 'agentfn: agent() is not available \u2014 t\u2026'\n    at Proxy.<anonymous> (file:///Users/minh/Documents/conver"
    },
    {
      "name": "[agentfn] agent \u2014 qwen provider > throws when provider is qwen",
      "error": "AssertionError: expected [Function] to throw error matching /agent.*not supported.*qwen/i but got 'agentfn: agent() is not available \u2014 t\u2026'\n    at Proxy.<anonymous> (file:///Users/minh/Documents/conver"
    },
    {
      "name": "[agentfn] agent \u2014 qwen provider > throws when default provider is qwen",
      "error": "AssertionError: expected [Function] to throw error matching /agent.*not supported.*qwen/i but got 'agentfn: agent() is not available \u2014 t\u2026'\n    at Proxy.<anonymous> (file:///Users/minh/Documents/conver"
    },
    {
      "name": "[agentfn] agent \u2014 gemini provider > throws when provider is gemini",
      "error": "AssertionError: expected [Function] to throw error matching /agent.*not supported.*gemini/i but got 'agentfn: agent() is not available \u2014 t\u2026'\n    at Proxy.<anonymous> (file:///Users/minh/Documents/conv"
    },
    {
      "name": "[agentfn] agent \u2014 gemini provider > throws when default provider is gemini",
      "error": "AssertionError: expected [Function] to throw error matching /agent.*not supported.*gemini/i but got 'agentfn: agent() is not available \u2014 t\u2026'\n    at Proxy.<anonymous> (file:///Users/minh/Documents/conv"
    },
    {
      "name": "[agentfn] agent \u2014 advanced options > passes MCP servers config",
      "error": "Error: agentfn: agent() is not available \u2014 the Claude Agent SDK backend has been removed. Use agentfn() instead.\n    at agent (/Users/minh/Documents/converge/packages/agentfn/src/agent.ts:22:9)\n    at"
    },
    {
      "name": "[agentfn] agent \u2014 advanced options > passes subagent definitions",
      "error": "Error: agentfn: agent() is not available \u2014 the Claude Agent SDK backend has been removed. Use agentfn() instead.\n    at agent (/Users/minh/Documents/converge/packages/agentfn/src/agent.ts:22:9)\n    at"
    },
    {
      "name": "[agentfn] agent \u2014 advanced options > passes resume session ID",
      "error": "Error: agentfn: agent() is not available \u2014 the Claude Agent SDK backend has been removed. Use agentfn() instead.\n    at agent (/Users/minh/Documents/converge/packages/agentfn/src/agent.ts:22:9)\n    at"
    },
    {
      "name": "[agentfn] agent \u2014 advanced options > passes effort and maxBudgetUsd",
      "error": "Error: agentfn: agent() is not available \u2014 the Claude Agent SDK backend has been removed. Use agentfn() instead.\n    at agent (/Users/minh/Documents/converge/packages/agentfn/src/agent.ts:22:9)\n    at"
    },
    {
      "name": "[agentfn] agentfn \u2014 core API > delegates to claudefn by default",
      "error": "AssertionError: expected \"spy\" to be called once, but got 0 times\n    at /Users/minh/Documents/converge/packages/agentfn/tests/agentfn.test.ts:124:26\n    at file:///Users/minh/Documents/converge/node_"
    },
    {
      "name": "[agentfn] agentfn \u2014 core API > delegates to kimifn when provider is kimi",
      "error": "AssertionError: expected \"spy\" to be called once, but got 0 times\n    at /Users/minh/Documents/converge/packages/agentfn/tests/agentfn.test.ts:136:24\n    at file:///Users/minh/Documents/converge/node_"
    },
    {
      "name": "[agentfn] agentfn \u2014 core API > delegates to qwenfn when provider is qwen",
      "error": "AssertionError: expected \"spy\" to be called once, but got 0 times\n    at /Users/minh/Documents/converge/packages/agentfn/tests/agentfn.test.ts:148:24\n    at file:///Users/minh/Documents/converge/node_"
    },
    {
      "name": "[agentfn] agentfn \u2014 core API > delegates to geminifn when provider is gemini",
      "error": "AssertionError: expected \"spy\" to be called once, but got 0 times\n    at /Users/minh/Documents/converge/packages/agentfn/tests/agentfn.test.ts:161:26\n    at file:///Users/minh/Documents/converge/node_"
    },
    {
      "name": "[agentfn] agentfn \u2014 core API > returns result with provider field set to claude",
      "error": "Error: logDir is required - claudefn no longer uses a default log directory\n    at createLogFile (/Users/minh/Documents/converge/packages/claudefn/src/claudefn.ts:61:11)\n    at executeViaCli (/Users/m"
    },
    {
      "name": "[agentfn] agentfn \u2014 core API > returns result with provider field set to kimi",
      "error": "AssertionError: expected { \u2026(4) } to deeply equal { data: 'Hello from Kimi', \u2026(3) }\n    at /Users/minh/Documents/converge/packages/agentfn/tests/agentfn.test.ts:197:20\n    at processTicksAndRejections"
    },
    {
      "name": "[agentfn] agentfn \u2014 core API > returns result with provider field set to qwen",
      "error": "Error: STACK_TRACE_ERROR\n    at task (file:///Users/minh/Documents/converge/node_modules/@vitest/runner/dist/chunk-hooks.js:638:27)\n    at Object.<anonymous> (file:///Users/minh/Documents/converge/nod"
    },
    {
      "name": "[agentfn] agentfn \u2014 core API > returns result with provider field set to gemini",
      "error": "Error: STACK_TRACE_ERROR\n    at task (file:///Users/minh/Documents/converge/node_modules/@vitest/runner/dist/chunk-hooks.js:638:27)\n    at Object.<anonymous> (file:///Users/minh/Documents/converge/nod"
    },
    {
      "name": "[agentfn] agentfn \u2014 core API > passes input through to the underlying function",
      "error": "Error: logDir is required - claudefn no longer uses a default log directory\n    at createLogFile (/Users/minh/Documents/converge/packages/claudefn/src/claudefn.ts:61:11)\n    at executeViaCli (/Users/m"
    },
    {
      "name": "[agentfn] agentfn \u2014 options forwarding > forwards shared options to claudefn",
      "error": "AssertionError: expected \"spy\" to be called with arguments: [ ObjectContaining{\u2026} ]\u001b[90m\n\nNumber of calls: \u001b[1m0\u001b[22m\n\u001b[39m\n    at Proxy.<anonymous> (file:///Users/minh/Documents/converge/node_modules"
    },
    {
      "name": "[agentfn] agentfn \u2014 options forwarding > forwards shared options to kimifn",
      "error": "AssertionError: expected \"spy\" to be called with arguments: [ ObjectContaining{\u2026} ]\u001b[90m\n\nNumber of calls: \u001b[1m0\u001b[22m\n\u001b[39m\n    at Proxy.<anonymous> (file:///Users/minh/Documents/converge/node_modules"
    },
    {
      "name": "[agentfn] agentfn \u2014 options forwarding > forwards claude-only options to claudefn",
      "error": "AssertionError: expected \"spy\" to be called with arguments: [ ObjectContaining{\u2026} ]\u001b[90m\n\nNumber of calls: \u001b[1m0\u001b[22m\n\u001b[39m\n    at Proxy.<anonymous> (file:///Users/minh/Documents/converge/node_modules"
    },
    {
      "name": "[agentfn] agentfn \u2014 options forwarding > does not pass claude-only options to kimifn",
      "error": "TypeError: Cannot read properties of undefined (reading '0')\n    at /Users/minh/Documents/converge/packages/agentfn/tests/agentfn.test.ts:358:56\n    at file:///Users/minh/Documents/converge/node_modul"
    },
    {
      "name": "[agentfn] agentfn \u2014 options forwarding > forwards shared options to qwenfn",
      "error": "AssertionError: expected \"spy\" to be called with arguments: [ ObjectContaining{\u2026} ]\u001b[90m\n\nNumber of calls: \u001b[1m0\u001b[22m\n\u001b[39m\n    at Proxy.<anonymous> (file:///Users/minh/Documents/converge/node_modules"
    },
    {
      "name": "[agentfn] agentfn \u2014 options forwarding > does not pass claude-only options to qwenfn",
      "error": "TypeError: Cannot read properties of undefined (reading '0')\n    at /Users/minh/Documents/converge/packages/agentfn/tests/agentfn.test.ts:406:56\n    at file:///Users/minh/Documents/converge/node_modul"
    },
    {
      "name": "[agentfn] agentfn \u2014 options forwarding > forwards shared options to geminifn",
      "error": "AssertionError: expected \"spy\" to be called with arguments: [ ObjectContaining{\u2026} ]\u001b[90m\n\nNumber of calls: \u001b[1m0\u001b[22m\n\u001b[39m\n    at Proxy.<anonymous> (file:///Users/minh/Documents/converge/node_modules"
    },
    {
      "name": "[agentfn] agentfn \u2014 options forwarding > does not pass claude-only options to geminifn",
      "error": "TypeError: Cannot read properties of undefined (reading '0')\n    at /Users/minh/Documents/converge/packages/agentfn/tests/agentfn.test.ts:454:58\n    at file:///Users/minh/Documents/converge/node_modul"
    },
    {
      "name": "[agentfn] agentfn \u2014 options forwarding > forwards hooks to the underlying provider",
      "error": "AssertionError: expected \"spy\" to be called with arguments: [ ObjectContaining{\u2026} ]\u001b[90m\n\nNumber of calls: \u001b[1m0\u001b[22m\n\u001b[39m\n    at Proxy.<anonymous> (file:///Users/minh/Documents/converge/node_modules"
    },
    {
      "name": "[agentfn] agentfn \u2014 options forwarding > forwards schema to the underlying provider",
      "error": "AssertionError: expected \"spy\" to be called with arguments: [ ObjectContaining{\u2026} ]\u001b[90m\n\nNumber of calls: \u001b[1m0\u001b[22m\n\u001b[39m\n    at Proxy.<anonymous> (file:///Users/minh/Documents/converge/node_modules"
    },
    {
      "name": "[agentfn] agentfn \u2014 default provider > uses global default provider when none specified",
      "error": "AssertionError: expected \"spy\" to be called once, but got 0 times\n    at /Users/minh/Documents/converge/packages/agentfn/tests/agentfn.test.ts:508:24\n    at file:///Users/minh/Documents/converge/node_"
    },
    {
      "name": "[agentfn] agentfn \u2014 default provider > explicit provider overrides global default",
      "error": "AssertionError: expected \"spy\" to be called once, but got 0 times\n    at /Users/minh/Documents/converge/packages/agentfn/tests/agentfn.test.ts:522:26\n    at file:///Users/minh/Documents/converge/node_"
    },
    {
      "name": "[agentfn] agentfn \u2014 stream mode > delegates stream mode to claudefn",
      "error": "AssertionError: expected \"spy\" to be called with arguments: [ ObjectContaining {\"mode\": \"stream\"} ]\u001b[90m\n\nNumber of calls: \u001b[1m0\u001b[22m\n\u001b[39m\n    at Proxy.<anonymous> (file:///Users/minh/Documents/conve"
    },
    {
      "name": "[agentfn] agentfn \u2014 promptless usage > works without a prompt option",
      "error": "AssertionError: expected \"spy\" to be called with arguments: [ ObjectContaining{\u2026} ]\u001b[90m\n\nNumber of calls: \u001b[1m0\u001b[22m\n\u001b[39m\n    at Proxy.<anonymous> (file:///Users/minh/Documents/converge/node_modules"
    },
    {
      "name": "[agentfn] agentfn \u2014 SDK result fields > preserves sessionId, costUsd, numTurns from claude SDK",
      "error": "Error: logDir is required - claudefn no longer uses a default log directory\n    at createLogFile (/Users/minh/Documents/converge/packages/claudefn/src/claudefn.ts:61:11)\n    at executeViaCli (/Users/m"
    },
    {
      "name": "[agentfn] compose \u2014 core API > delegates to claudefn compose by default",
      "error": "AssertionError: expected \"spy\" to be called once, but got 0 times\n    at /Users/minh/Documents/converge/packages/agentfn/tests/compose.test.ts:132:31\n    at file:///Users/minh/Documents/converge/node_"
    },
    {
      "name": "[agentfn] compose \u2014 core API > delegates to kimifn compose when provider is kimi",
      "error": "AssertionError: expected \"spy\" to be called once, but got 0 times\n    at /Users/minh/Documents/converge/packages/agentfn/tests/compose.test.ts:154:29\n    at file:///Users/minh/Documents/converge/node_"
    },
    {
      "name": "[agentfn] compose \u2014 core API > delegates to qwenfn compose when provider is qwen",
      "error": "AssertionError: expected \"spy\" to be called once, but got 0 times\n    at /Users/minh/Documents/converge/packages/agentfn/tests/compose.test.ts:176:29\n    at file:///Users/minh/Documents/converge/node_"
    },
    {
      "name": "[agentfn] compose \u2014 core API > delegates to geminifn compose when provider is gemini",
      "error": "AssertionError: expected \"spy\" to be called once, but got 0 times\n    at /Users/minh/Documents/converge/packages/agentfn/tests/compose.test.ts:199:31\n    at file:///Users/minh/Documents/converge/node_"
    },
    {
      "name": "[agentfn] compose \u2014 result augmentation > adds provider: claude to the result",
      "error": "AssertionError: expected '{\"data\":\"\",\"raw\":\"\",\"durationMs\":0,\"p\u2026' to be 'composed result' // Object.is equality\n    at /Users/minh/Documents/converge/packages/agentfn/tests/compose.test.ts:231:25\n    "
    },
    {
      "name": "[agentfn] compose \u2014 result augmentation > adds provider: kimi to the result",
      "error": "AssertionError: expected 'You have access to these async functi\u2026' to be 'kimi composed' // Object.is equality\n    at /Users/minh/Documents/converge/packages/agentfn/tests/compose.test.ts:261:25\n    at"
    },
    {
      "name": "[agentfn] compose \u2014 result augmentation > adds provider: qwen to the result",
      "error": "Error: STACK_TRACE_ERROR\n    at task (file:///Users/minh/Documents/converge/node_modules/@vitest/runner/dist/chunk-hooks.js:638:27)\n    at Object.<anonymous> (file:///Users/minh/Documents/converge/nod"
    },
    {
      "name": "[agentfn] compose \u2014 result augmentation > adds provider: gemini to the result",
      "error": "Error: STACK_TRACE_ERROR\n    at task (file:///Users/minh/Documents/converge/node_modules/@vitest/runner/dist/chunk-hooks.js:638:27)\n    at Object.<anonymous> (file:///Users/minh/Documents/converge/nod"
    },
    {
      "name": "[agentfn] compose \u2014 options forwarding > forwards shared options to claude compose",
      "error": "AssertionError: expected \"spy\" to be called with arguments: [ ObjectContaining{\u2026} ]\u001b[90m\n\nNumber of calls: \u001b[1m0\u001b[22m\n\u001b[39m\n    at Proxy.<anonymous> (file:///Users/minh/Documents/converge/node_modules"
    },
    {
      "name": "[agentfn] compose \u2014 options forwarding > forwards shared options to kimi compose",
      "error": "AssertionError: expected \"spy\" to be called with arguments: [ ObjectContaining{\u2026} ]\u001b[90m\n\nNumber of calls: \u001b[1m0\u001b[22m\n\u001b[39m\n    at Proxy.<anonymous> (file:///Users/minh/Documents/converge/node_modules"
    },
    {
      "name": "[agentfn] compose \u2014 options forwarding > forwards claude-only options to claude compose",
      "error": "AssertionError: expected \"spy\" to be called with arguments: [ ObjectContaining{\u2026} ]\u001b[90m\n\nNumber of calls: \u001b[1m0\u001b[22m\n\u001b[39m\n    at Proxy.<anonymous> (file:///Users/minh/Documents/converge/node_modules"
    },
    {
      "name": "[agentfn] compose \u2014 options forwarding > does not pass claude-only options to kimi compose",
      "error": "TypeError: Cannot read properties of undefined (reading '0')\n    at /Users/minh/Documents/converge/packages/agentfn/tests/compose.test.ts:465:61\n    at file:///Users/minh/Documents/converge/node_modul"
    },
    {
      "name": "[agentfn] compose \u2014 options forwarding > forwards shared options to qwen compose",
      "error": "AssertionError: expected \"spy\" to be called with arguments: [ ObjectContaining{\u2026} ]\u001b[90m\n\nNumber of calls: \u001b[1m0\u001b[22m\n\u001b[39m\n    at Proxy.<anonymous> (file:///Users/minh/Documents/converge/node_modules"
    },
    {
      "name": "[agentfn] compose \u2014 options forwarding > does not pass claude-only options to qwen compose",
      "error": "TypeError: Cannot read properties of undefined (reading '0')\n    at /Users/minh/Documents/converge/packages/agentfn/tests/compose.test.ts:533:61\n    at file:///Users/minh/Documents/converge/node_modul"
    },
    {
      "name": "[agentfn] compose \u2014 options forwarding > forwards shared options to gemini compose",
      "error": "AssertionError: expected \"spy\" to be called with arguments: [ ObjectContaining{\u2026} ]\u001b[90m\n\nNumber of calls: \u001b[1m0\u001b[22m\n\u001b[39m\n    at Proxy.<anonymous> (file:///Users/minh/Documents/converge/node_modules"
    },
    {
      "name": "[agentfn] compose \u2014 options forwarding > does not pass claude-only options to gemini compose",
      "error": "TypeError: Cannot read properties of undefined (reading '0')\n    at /Users/minh/Documents/converge/packages/agentfn/tests/compose.test.ts:601:63\n    at file:///Users/minh/Documents/converge/node_modul"
    },
    {
      "name": "[agentfn] compose \u2014 options forwarding > passes tools through to the underlying compose",
      "error": "TypeError: Cannot read properties of undefined (reading '0')\n    at /Users/minh/Documents/converge/packages/agentfn/tests/compose.test.ts:638:63\n    at file:///Users/minh/Documents/converge/node_modul"
    },
    {
      "name": "[agentfn] compose \u2014 default provider > uses global default provider",
      "error": "AssertionError: expected \"spy\" to be called once, but got 0 times\n    at /Users/minh/Documents/converge/packages/agentfn/tests/compose.test.ts:668:29\n    at file:///Users/minh/Documents/converge/node_"
    },
    {
      "name": "[agentfn] compose \u2014 default provider > explicit provider overrides default",
      "error": "AssertionError: expected \"spy\" to be called once, but got 0 times\n    at /Users/minh/Documents/converge/packages/agentfn/tests/compose.test.ts:692:31\n    at file:///Users/minh/Documents/converge/node_"
    },
    {
      "name": "[agentfn] Skill/Agent loader (.converge folder) > enhancePrompt > adds skill references for /skill commands",
      "error": "AssertionError: expected 'Follow /web2next workflow' to contain '[^skill:web2next]'\n    at /Users/minh/Documents/converge/packages/agentfn/tests/skills.test.ts:19:22\n    at file:///Users/minh/Document"
    },
    {
      "name": "[agentfn] Skill/Agent loader (.converge folder) > enhancePrompt > treats @agent refs as agents (with fallback to skills)",
      "error": "AssertionError: expected '@websnap capture this site' to contain '[^skill:websnap]'\n    at /Users/minh/Documents/converge/packages/agentfn/tests/skills.test.ts:29:22\n    at file:///Users/minh/Document"
    },
    {
      "name": "[agentfn] Skill/Agent loader (.converge folder) > enhancePrompt > includes user prompt section",
      "error": "AssertionError: expected 'Use /web2next' to contain '<!-- USER PROMPT -->'\n    at /Users/minh/Documents/converge/packages/agentfn/tests/skills.test.ts:37:22\n    at file:///Users/minh/Documents/converg"
    },
    {
      "name": "[agentfn] Skill/Agent loader (.converge folder) > listSkills > finds web2next and websnap skills in project",
      "error": "AssertionError: expected [] to include 'web2next'\n    at Proxy.<anonymous> (file:///Users/minh/Documents/converge/node_modules/@vitest/expect/dist/index.js:1191:15)\n    at Proxy.<anonymous> (file:///U"
    },
    {
      "name": "[qwenfn] Skill loader > enhancePrompt > adds skill references for /skill commands",
      "error": "AssertionError: expected 'Follow /web2next workflow' to contain '[^skill:web2next]'\n    at /Users/minh/Documents/converge/packages/qwenfn/tests/skills.test.ts:19:22\n    at file:///Users/minh/Documents"
    },
    {
      "name": "[qwenfn] Skill loader > enhancePrompt > treats @agent refs as skills (Qwen has no subagents)",
      "error": "AssertionError: expected '@websnap capture this site' to contain '[^skill:websnap]'\n    at /Users/minh/Documents/converge/packages/qwenfn/tests/skills.test.ts:29:22\n    at file:///Users/minh/Documents"
    },
    {
      "name": "[qwenfn] Skill loader > enhancePrompt > includes user prompt section",
      "error": "AssertionError: expected 'Use /web2next' to contain '<!-- USER PROMPT -->'\n    at /Users/minh/Documents/converge/packages/qwenfn/tests/skills.test.ts:37:22\n    at file:///Users/minh/Documents/converge"
    },
    {
      "name": "[qwenfn] Skill loader > listSkills > finds web2next and websnap skills in project",
      "error": "AssertionError: expected [ 'converge-control', \u2026(1) ] to include 'web2next'\n    at Proxy.<anonymous> (file:///Users/minh/Documents/converge/node_modules/@vitest/expect/dist/index.js:1191:15)\n    at Pr"
    }
  ]
}