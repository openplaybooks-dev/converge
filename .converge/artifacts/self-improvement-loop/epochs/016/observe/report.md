# Audit Report: Framework vs Project (Model #3)

**Epoch:** 16
**Mental Model:** Framework vs Project
**Rule:** NEVER hardcode project-specific paths, skill names, asset names, or domain concepts into the framework (`packages/`).

## Step 1: Mental Model Summary

From `CLAUDE.md §3.5` and `AGENTS.md §3.5`: The framework (`packages/`) is generic; projects (`examples/`) are specific. Project-specific paths, skill names, asset names, or domain concepts must never leak into framework code. When project-specific behavior is needed, it goes in the project's `.converge/` directory, never in `packages/`.

## Step 2: Evidence Commands Run

```sh
# Find .converge/ references in framework (framework convention itself — expected)
grep -rn "\.converge/" packages/core/src/ packages/cli/src/ | grep -v node_modules | head -20

# Find examples/ references in framework
grep -rn "examples/" packages/core/src/ packages/cli/src/ | head -10

# Find hardcoded GitHub org/repo references
grep -rn "myanlabs\|github\.com" packages/core/src/ packages/cli/src/ | head -20

# Find project-specific skill/path names
grep -rn "\.stitch\|stitch-" packages/core/src/ packages/cli/src/ | grep -v node_modules | grep -v "\.test\." | grep -v README | head -25

# Find stitch in actual code (non-comment)
grep -rn "stitch" packages/core/src/ packages/cli/src/ | grep -v node_modules | grep -v "\.test\." | grep -v "^.*:\s*\*" | grep -v README | head -20
```

## Step 3: Findings

### Finding 1 (HIGH): Hardcoded GitHub repository URLs in CLI

**File:** `packages/cli/src/commands-add.ts`

**Line 615:**
```ts
const url = `https://api.github.com/repos/myanlabs/converge/contents/examples/${exampleName}/.converge`;
```

**Line 628:**
```ts
`git clone --depth 1 --filter=blob:none --sparse https://github.com/myanlabs/converge.git "${tmpClone}"`,
```

**Gap:** The `downloadExampleFromGitHub()` function hardcodes the specific GitHub organization (`myanlabs`) and repository name (`converge`). This violates the Framework vs Project model because the framework should not know the specific repository hosting its examples. The repository URL should be configurable, not baked into framework code.

**Evidence:** `commands-add.ts` lines 615 and 628 both contain the string `myanlabs/converge` as a literal in executable code paths. These are not JSDoc comments — they are actual code that constructs URLs for downloading examples.

### Finding 2 (MEDIUM): Project-specific skill names and paths in JSDoc examples

**Files:** 
- `packages/core/src/client/converge-client.ts:13,18` — `.stitch/screens.json`, `stitch-generate`
- `packages/core/src/config/task-definition.ts` — 20+ occurrences of `.stitch/` paths and `stitch-*` skill names in JSDoc

**Gap:** While these are in documentation/comments rather than executable code, they still embed project-specific domain concepts into framework source. The JSDoc examples use `stitch` as their demonstration project, but `stitch` is a specific project that lives in `examples/`. The framework's client API documentation should use generic placeholder names.

**Example (converge-client.ts:13,18):**
```ts
 * const screens = JSON.parse(client.readFile('.stitch/screens.json'));
 * for (const screen of screens) {
 *   client.spawn({
 *     id: `screen-${screen.id}`,
 *     title: screen.title,
 *     skills: ['stitch-generate'],
 *   });
 * }
```

### Finding 3 (LOW): Stitch references in test fixtures and health check templates

**Files:**
- `packages/core/src/navigator/repair/health-checks.ts:195,338` — test fixture strings with `.stitch/` paths
- `packages/core/src/navigator/repair/strategies/AUTO_HEAL_GUIDE.md` — guide with `.stitch/` paths

**Gap:** Test fixtures and internal documentation in the framework embed project-specific example paths. While lower severity, they set a precedent for mixing project concepts into framework internals.

## Step 4: Proposed Correction for Finding 1

**Best finding:** `commands-add.ts:615,628` — hardcoded `myanlabs/converge` in GitHub URL construction.

### Test to write
`tests/cli/commands-add-repo-config.test.ts` — test that the `downloadExampleFromGitHub` function uses a configurable base URL, not a hardcoded org/repo.

### Code change
Extract the repository URL into a configuration parameter. Add a `repoUrl` parameter to `downloadExampleFromGitHub()` or read from an environment variable:

```ts
async function downloadExampleFromGitHub(
  exampleName: string,
  destDir: string,
  opts?: { repoUrl?: string }
): Promise<void> {
  const baseUrl = opts?.repoUrl ?? "https://github.com/myanlabs/converge";
  // ... use baseUrl instead of hardcoded string
}
```

### Why this prevents future violations
Once the repo URL is parameterized, new projects using converge can host their own example catalog without forking the CLI. The framework stays generic — it knows how to download examples, but not where from. If someone adds another `myanlabs/converge` reference in the future, the test will catch it.
