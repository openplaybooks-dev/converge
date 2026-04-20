# Developer Experience Analysis

## CLI Experience

The CLI (`packages/core/src/cli/main.ts`, ~1257 lines) uses a custom argument parser and a large switch statement for command dispatch. Commands are intuitively named (`init`, `plan`, `run`, `reset`, `status`) and deprecated commands show helpful redirects (e.g., `tree` suggests `converge status`).

**What works well:**
- Error messages use emoji markers and include actionable suggestions (e.g., "Run `converge playbook list` to see available playbooks")
- Graceful shutdown with SIGINT/SIGTERM handlers (10s timeout before force exit)
- Per-command `--help` is available via `help.ts` (254 lines)
- Backward-compatible: deprecated commands show migration hints

**What's confusing:**
- `converge help` output (lines 142-173) lists ~20 commands in a dense block with no one-line descriptions and no grouping by category (workflow vs. inspection vs. management)
- Unknown command error is terse: just `Unknown command: "xyz"` with no "did you mean?" suggestions
- Custom argument parser (lines 78-135) silently ignores invalid values (e.g., `--max-iterations=abc` becomes the string "abc" with no validation error)
- No short-form flags for common options (`-p` for `--playbook`, `-d` for `--dir`)
- Error formatting is inconsistent: some use `\n   ` indent, some use bare `console.error`, some prefix with `"Error:"`, others don't

## Public API

The main entry point (`packages/core/src/index.ts`, 675 lines) exports ~90 symbols organized into 14 commented sections (Config, Hooks, Discovery, Storage, Gap Framework, Goals, Runtime, Unit, Metrics, Orchestrator, etc.).

**What works well:**
- Well-organized section headers make the file navigable
- Full TypeScript support with `.d.ts` exports
- Multiple entry points: `@converge/core` (main), `@converge/core/planner`, `@converge/core/client`
- Legacy APIs marked `@deprecated` with migration paths
- The `Unit` class and `taskDef()` builder are promoted as the primary abstractions

**What's confusing or inconsistent:**
- 90+ flat exports with no namespace grouping make it hard for new users to know where to start
- Naming conventions are mixed: `taskDef` (camelCase function) vs. `TaskDefinition` (PascalCase type); `v2TaskDef` vs `v1TaskDef` creates aliasing confusion
- No "quick start" exports or examples like "to build a simple orchestrator, import these 5 things"
- Advanced features (`MetaAnalyzer`, `YieldsProcessor`, `AutoVerifyManager`) are buried without usage context

## Documentation

**README.md (120 lines):** Clear value proposition ("Define what 'done' looks like... Converge continuously measures gaps"), includes a flowchart diagram, and has a use-cases section. The quick-start is 4 lines (`init`, `plan`, `run`) which is attractively simple but doesn't show expected output or what happens next.

**docs/getting-started.md (~150 lines):** Covers prerequisites (Node.js 18+), installation (global and local), and two paths (AI-assisted via `converge plan`, manual setup). The manual path is tedious (requires creating directory structure by hand) and the guide lacks error-recovery guidance.

**packages/core/README.md (726 lines):** Detailed three-layer architecture explanation (Project > Task > Attempt), visual directory structure, and CLI reference. Very thorough but very long -- hard to find specific information without searching.

**What's missing:**
- No troubleshooting guide (how to debug a failed check, where logs live, how to reset a stuck task)
- No "common errors" section for new users
- No comparison with alternatives (LangGraph, CrewAI, AutoGen)
- The `examples/hello-world/` project exists but isn't documented as a learning resource
- No guide for writing TASK.md files from scratch without `converge plan`

## Onboarding Friction

**Installation is smooth:** Single `npm install -g @converge/core` works. No complex setup.

**First run is fast:** `converge init` + `converge plan "prompt"` + `converge run` gets you started with AI-generated tasks.

**Where new users would get stuck:**

1. **API key requirement is not obvious.** AI-assisted features (which are the primary workflow) require a provider API key (Claude, Gemini, etc.). This isn't mentioned until the user tries to run and gets an error.

2. **Configuration confusion.** Three config formats exist (`.converge/PROJECT.md`, `.converge/project.yaml`, `.converge/project.yml`) with no clear guidance on which to use. The CLI tries multiple discovery strategies and may silently pick the wrong playbook.

3. **Debugging failures.** When a task's check fails, there's no documented path for "what do I do now?" -- `converge verify` exists but isn't mentioned in getting-started. Log locations (`.converge/journal/`) aren't explained.

4. **Tooling assumptions.** Checks run as shell commands (`test -f`, `grep`, `npm test`), but the docs don't explain what shell environment is expected or how to use non-shell checks (Python, Docker, etc.).

5. **No "hello world" walkthrough.** The quick-start jumps to AI-generated playbooks. A manual step-by-step example showing "create this TASK.md, run this check, see this output" would build mental models faster.

## Top Recommendation

**Add a troubleshooting and debugging guide.** This is the single biggest gap in the developer experience.

Converge's core loop is: define tasks with checks, run AI agents, verify with checks, self-correct on failure. When something goes wrong, the user needs to understand:

- Where to find execution logs (`.converge/journal/<playbook>/tasks/.../attempts/`)
- How to read FEEDBACK.md and LEARN.md from failed attempts
- How to reset a task (`converge reset <task>`) and re-run
- How to manually run a check command to debug it
- Common failure patterns (check command typo, missing tool, wrong working directory)

Right now, the framework handles self-correction well for AI agents, but the *human* developer has no guide for when they need to intervene. A 2-page "When Things Go Wrong" document would dramatically reduce the time from "my task failed" to "I understand why and know how to fix it."
