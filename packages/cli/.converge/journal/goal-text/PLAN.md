---
kind: container
children:
  - id: 00-cli-wire
    kind: executable
    title: Wire --from-prompt flag into init command
  - id: 01-analyze-goal-text
    kind: executable
    title: AI-powered goal text analysis
  - id: 02-generate-scaffold
    kind: executable
    title: Generate project scaffold from analyzed goal
  - id: 03-integration-test
    kind: executable
    title: Integration test and migration redirect
---

# Goal

Implement `converge init --from-prompt "<goal text>"` — a feature that takes a natural-language description of a project goal and scaffolds a complete `.converge/` directory (project.yaml, playbook.yml, initial tasks, CLAUDE.md) by analyzing the goal text with AI. This replaces the v1 `converge plan "goal text"` command per the cli-redesign migration table.

# Decision

**Container.** Four ordered children. The CLI wiring must land first so the analyze and scaffold executables have the parsed flag to test against. Analysis runs before scaffold generation (structured output is the contract between them). Integration test runs last, validating the full pipeline plus the migration redirect.

This could be a leaf since the cli-redesign plan describes it as a "thin wrapper" (~50 lines), but the AI analysis step is non-trivial (it must produce structured project metadata from freeform text) and the scaffold generation produces multiple files across the project root — splitting them into separate executables gives each a clear output contract and a deterministic check.

# Children

## 00-cli-wire — Wire --from-prompt flag into init command
- **id**: 00-cli-wire
- **kind**: executable
- **goal**: Add `--from-prompt` flag to the init command, parsed and routed through main.ts.
- **description**: Extends `InitOptions` in `commands.ts` with an optional `fromPrompt?: string` field. In `main.ts` argument parsing, maps `--from-prompt` (and `--fromPrompt`) to `options.fromPrompt`. In the init dispatch case, passes `fromPrompt` from options to `initCommand`. If `--from-prompt` is present, `initCommand` skips interactive prompts and delegates to the analyze+scaffold pipeline (children 01 and 02). If absent, existing interactive behavior is unchanged. Also updates the init help text to mention `--from-prompt`.
- **scope**: Add the type field, CLI arg routing, and conditional branching — no analysis or file generation logic. Those are separate executables with distinct output contracts.
- **inputs**:
  - `packages/cli/src/commands.ts` (existing InitOptions interface, initCommand function)
  - `packages/cli/src/main.ts` (existing argument parser, init dispatch case, help text)
- **dependencies**: none
- **tags**: [cli, wiring]
- **outputs**:
  - `packages/cli/src/commands.ts` (modified: InitOptions gains `fromPrompt`, initCommand gains conditional branch)
  - `packages/cli/src/main.ts` (modified: arg parser routes `--from-prompt`, help text updated)
- **checks**:
  - cmd: grep -q 'fromPrompt' packages/cli/src/commands.ts
  - cmd: grep -q 'from-prompt' packages/cli/src/main.ts
  - cmd: cd packages/cli && pnpm typecheck
- **body**: |
  1. Read `packages/cli/src/commands.ts` to understand the InitOptions interface and initCommand function signature.
  2. Add `fromPrompt?: string` to InitOptions.
  3. In initCommand, add a conditional: if `options.fromPrompt` is set, skip interactive prompts and call the analyze+scaffold functions (imported from `./commands-init-from-prompt.ts`, created by child 02). If absent, proceed with existing interactive flow.
  4. Read `packages/cli/src/main.ts` to understand argument parsing.
  5. Add `--from-prompt` handling in parseArgs or in the init case routing so it flows into InitOptions.
  6. Add `--from-prompt` to the init help text.
  7. Run `pnpm typecheck` — must be green.

## 01-analyze-goal-text — AI-powered goal text analysis
- **id**: 01-analyze-goal-text
- **kind**: executable
- **goal**: Convert a freeform goal text string into a structured project configuration via AI.
- **description**: Takes a raw "goal text" string (e.g. "a next.js blog with markdown posts and rss") and uses an AI agent call to extract structured metadata: a kebab-case project name, a one-line description, suggested coding agents, a tech stack summary, and a list of 3-7 initial task titles with brief descriptions. The output is a JSON file consumed by child 02. The AI prompt includes the converge project schema (project.yaml fields, playbook.yml fields) so the model produces compatible output. Reuses the existing `agentfn` import pattern already used by `converge plan`.
- **scope**: AI call + output JSON schema. Does NOT write project files — that's child 02's job. Does NOT touch CLI wiring — that's child 00's job.
- **inputs**:
  - `packages/core/src/config/loader.ts` (reference for project.yaml schema)
  - `packages/cli/src/commands.ts` (reference for ProviderId catalog)
- **dependencies**: none (reads pre-existing files only)
- **tags**: [ai, analysis]
- **outputs**:
  - `packages/cli/src/analyze-goal-text.ts` (new: exports `analyzeGoalText(prompt: string) => Promise<GoalAnalysis>`)
- **checks**:
  - cmd: test -f packages/cli/src/analyze-goal-text.ts
  - cmd: cd packages/cli && pnpm typecheck
  - cmd: grep -q 'analyzeGoalText' packages/cli/src/analyze-goal-text.ts
- **body**: |
  1. Create `packages/cli/src/analyze-goal-text.ts`.
  2. Define the `GoalAnalysis` interface (TypeScript type exported from the module):

  ## Output schema
  ```typescript
  interface GoalAnalysis {
    name: string;              // kebab-case project name
    description: string;       // one-line project description
    agents: string[];          // recommended agent IDs (e.g. ["claude"])
    defaultAgent: string;      // default agent ID
    techStack: string;         // brief tech stack summary (e.g. "Next.js + Tailwind")
    tasks: {
      id: string;              // kebab-case task id (e.g. "01-scaffold-nextjs")
      title: string;           // human-readable task title
      description: string;     // one-paragraph task description
    }[];
  }
  ```

  ## Example
  ```json
  {
    "name": "markdown-blog",
    "description": "A Next.js blog with markdown posts and RSS feed",
    "agents": ["claude"],
    "defaultAgent": "claude",
    "techStack": "Next.js 15 + Tailwind CSS + gray-matter + RSS",
    "tasks": [
      { "id": "01-scaffold-app", "title": "Scaffold Next.js app", "description": "Create a Next.js 15 app with TypeScript and Tailwind CSS using create-next-app." },
      { "id": "02-markdown-posts", "title": "Add markdown post loading", "description": "Add gray-matter and fs-based markdown loading from a content/posts/ directory. Each post has frontmatter (title, date, slug) and a markdown body." },
      { "id": "03-rss-feed", "title": "Generate RSS feed", "description": "Add an RSS feed generator that reads all posts and outputs an XML feed at /rss.xml." },
      { "id": "04-list-and-post-pages", "title": "Build post list and detail pages", "description": "Create a paginated post list at / and individual post pages at /posts/[slug] using Next.js dynamic routes." }
    ]
  }
  ```

  3. Implement `analyzeGoalText(prompt: string): Promise<GoalAnalysis>`:
     - Import `agentfn` (same pattern as `main.ts` plan case: `import { agentfn } from "@openplaybooks/converge-agentfn"`).
     - Construct an AI prompt that includes: the user's goal text, the GoalAnalysis interface as a JSON schema, the provider catalog from `commands.ts`, and instructions to derive a kebab-case name, a one-line description, suitable agents, and 3-7 concrete implementation tasks.
     - Call the AI, parse the JSON response, validate it matches GoalAnalysis shape, and return it.
  4. Run `pnpm typecheck` — must be green.

## 02-generate-scaffold — Generate project scaffold from analyzed goal
- **id**: 02-generate-scaffold
- **kind**: executable
- **goal**: Write the full `.converge/` scaffold (project.yaml, playbook.yml, tasks, CLAUDE.md) from a GoalAnalysis.
- **description**: Takes the structured GoalAnalysis produced by child 01 and writes the complete project scaffold: `.converge/project.yaml` (with name, description, agents), `.converge/playbooks/default/playbook.yml` (with run config), one TASK.md per analyzed task under `tasks/`, `.converge/.gitignore`, and optionally a root `CLAUDE.md` if the tech stack warrants project-level instructions. This module is called from the init command when `--from-prompt` is set. It reuses the existing project.yaml and playbook.yml render functions already in commands.ts (renderProjectYaml, renderPlaybookYml) and follows the TASK.md format from task-md-definition.ts.
- **scope**: File writing only. Does NOT do AI analysis (consumes its output). Does NOT do CLI wiring (called by it).
- **inputs**:
  - `packages/cli/src/commands.ts` (existing renderProjectYaml, renderPlaybookYml helpers)
  - `packages/core/src/config/task-md-definition.ts` (TASK.md frontmatter schema reference)
- **dependencies**:
  - 00-cli-wire (initCommand must accept fromPrompt)
  - 01-analyze-goal-text (consumes GoalAnalysis type and function)
- **tags**: [scaffold, file-generation]
- **outputs**:
  - `packages/cli/src/commands-init-from-prompt.ts` (new: exports `scaffoldFromGoalAnalysis(analysis: GoalAnalysis, projectDir: string) => Promise<void>`)
- **checks**:
  - cmd: test -f packages/cli/src/commands-init-from-prompt.ts
  - cmd: cd packages/cli && pnpm typecheck
  - cmd: grep -q 'scaffoldFromGoalAnalysis' packages/cli/src/commands-init-from-prompt.ts
  - cmd: grep -q 'project.yaml' packages/cli/src/commands-init-from-prompt.ts
  - cmd: grep -q 'playbook.yml' packages/cli/src/commands-init-from-prompt.ts
  - cmd: grep -q 'TASK.md' packages/cli/src/commands-init-from-prompt.ts
- **body**: |
  1. Create `packages/cli/src/commands-init-from-prompt.ts`.
  2. Import `GoalAnalysis` type from `./analyze-goal-text.ts` (child 01's output).
  3. Implement `scaffoldFromGoalAnalysis(analysis: GoalAnalysis, projectDir: string): Promise<void>`:
     a. Create `.converge/playbooks/default/tasks/` directory.
     b. Write `.converge/project.yaml` using a template that includes `name`, `description`, `agents`, and `defaultAgent` from the analysis. Reuse the YAML shape from `renderProjectYaml` in commands.ts.
     c. Write `.converge/playbooks/default/playbook.yml` with `name`, `description`, `run.mode: autonomous`, `run.maxTaskAttempts: 3`, `run.resume: true`.
     d. For each task in `analysis.tasks`, write a TASK.md file:

     ## Output schema (TASK.md frontmatter)
     ```yaml
     ---
     id: <task.id>
     title: <task.title>
     description: <task.description>
     inputs: []
     outputs: []
     checks: []
     tags: []
     ---

     # <task.title>

     <task.description>
     ```

     ## Example TASK.md
     ```markdown
     ---
     id: 01-scaffold-app
     title: Scaffold Next.js app
     description: |
       Create a Next.js 15 app with TypeScript and Tailwind CSS
       using create-next-app.
     inputs: []
     outputs: []
     checks: []
     tags:
       - scaffold
     ---

     # Scaffold Next.js app

     Create a Next.js 15 app with TypeScript and Tailwind CSS using create-next-app.
     ```

     e. Write `.converge/.gitignore` with `journal/`.
     f. If `analysis.techStack` is non-empty, write a root `CLAUDE.md` with a brief project overview section naming the tech stack and goal.
  4. Run `pnpm typecheck` — must be green.

## 03-integration-test — Integration test and migration redirect
- **id**: 03-integration-test
- **kind**: executable
- **goal**: Prove `converge init --from-prompt "..."` works end-to-end and the v1 migration redirect fires.
- **description**: Writes an integration test file that (1) runs `converge init --from-prompt "a react todo app with local storage" --yes` in a temp directory and asserts the generated files exist and are well-formed, and (2) extends the existing migration redirect test to verify `converge plan "goal text"` exits non-zero with the init --from-prompt hint. The test creates a real tmpdir, runs the CLI against the built dist, and inspects the output files.
- **scope**: Test file only. Does NOT modify production code.
- **inputs**:
  - `packages/cli/tests/integration/migration-redirects.test.ts` (existing migration test — extend it)
  - `packages/cli/dist/index.js` (CLI build — pre-existing dependency, requires `pnpm build`)
  - `packages/cli/src/commands.ts` (reference for expected output file paths)
  - `packages/cli/src/analyze-goal-text.ts` (reference for GoalAnalysis shape)
- **dependencies**:
  - 00-cli-wire (needs --from-prompt flag to exist)
  - 01-analyze-goal-text (needs analysis module to exist)
  - 02-generate-scaffold (needs scaffold module to exist)
- **tags**: [test, integration]
- **outputs**:
  - `packages/cli/tests/integration/init-from-prompt.test.ts` (new: integration test for init --from-prompt)
- **checks**:
  - cmd: test -f packages/cli/tests/integration/init-from-prompt.test.ts
  - cmd: grep -qE "init.*--from-prompt|fromPrompt" packages/cli/tests/integration/init-from-prompt.test.ts
  - cmd: grep -qE "converge init.*--from-prompt|use:.*converge init" packages/cli/tests/integration/migration-redirects.test.ts
- **body**: |
  1. Create `packages/cli/tests/integration/init-from-prompt.test.ts`.
  2. Write test cases:
     a. **Basic scaffold**: Run `converge init --from-prompt "a react todo app with local storage" --yes` in a tmpdir. Assert exit code 0. Assert `.converge/project.yaml` exists and contains a name derived from the prompt. Assert `.converge/playbooks/default/playbook.yml` exists. Assert at least one TASK.md exists under `tasks/`. Assert `.converge/.gitignore` exists.
     b. **No --from-prompt still works**: Run `converge init --yes` in a tmpdir. Assert exit code 0. Assert `.converge/project.yaml` exists with default name.
     c. **--from-prompt with --force overwrite**: Run `converge init --from-prompt "test" --yes`, then re-run with `--force`. Assert both succeed.
     d. **Existing .converge without --force exits non-zero**: Run init in a dir with pre-existing `.converge/`. Assert exit code non-zero.
  3. Extend `packages/cli/tests/integration/migration-redirects.test.ts`: verify the existing `plan "goal text"` row continues to match the `init --from-prompt` hint. If the row isn't yet passing (red phase), ensure the test exist and is written correctly.
  4. The tests use `spawnSync('node', [CLI, 'init', '--from-prompt', prompt, '--yes'], { cwd: tmpdir })` pattern — matching the migration test style.
  5. Run `pnpm typecheck` — must be green.
  Note: These tests require the built CLI (`packages/cli/dist/index.js`). The check cannot run the full test suite against a live AI API, so the check verifies: file exists, typecheck passes, and key patterns are present. The full suite runs as part of child 02's integration into the CI.

# Open questions

- **AI model choice for analyzeGoalText.** The function needs an AI call. Should it use `agentfn` (existing pattern in the plan case) or should it accept a model parameter for testability? The plan case uses `agentfn` — this playbook should follow that pattern. If `agentfn` is unavailable (e.g., in CI), the analyze step will fail — do we need a mock/test mode?
- **Where does the generated playbook name go?** If the user passes `converge init --from-prompt "build a blog" --name my-blog`, does `--name` take precedence over the AI-suggested name? Leaning: yes, explicit flags override AI suggestions. This affects how child 02 merges CLI flags with analysis output.
- **Does this duplicate cli-redesign phase 06?** The cli-redesign playbook has a pending `02-deps-and-init-from-prompt` task that also implements this feature. If that task ships first, this playbook becomes a no-op or needs to coordinate. If this playbook ships first, cli-redesign's task should verify the feature exists rather than reimplement it.
- **Goal text → task generation quality.** The AI generates task titles and descriptions from freeform text. How much detail is expected? A one-line title per task? A full TASK.md body? The example shows a one-paragraph description per task — is that enough for the converge runner to operate on? The runner typically needs more specific instructions (files to create, commands to run). Should the AI generate richer task bodies, or should a follow-up `converge plan` call elaborate each task?
