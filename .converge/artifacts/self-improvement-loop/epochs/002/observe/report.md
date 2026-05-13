# Audit: Framework vs Project (§3.5)

**Epoch:** 2
**Mental model:** Framework vs Project (model index 3)
**Source:** CLAUDE.md §3.5, AGENTS.md §3.5

## 1. What the rule REQUIRES

Framework code (`packages/`) must be generic — no project-specific paths, skill names, asset names, repo names, or domain concepts. Project-specific behavior goes in `.converge/` (skills, playbooks, scripts), never in `packages/`.

## 2. Method

**Read:** CLAUDE.md §3.5 and AGENTS.md §3.5 — same text in both.

**Commands run:**

1. `grep -rn '\.converge/' packages/core/src/ packages/cli/src/ | head -20`
   → 20 matches in core, 22 in CLI. Most are legitimate framework conventions (`convergeDir` on context, journal paths, artifacts layout).

2. `grep -rn 'examples/' packages/core/src/ packages/cli/src/ | head -10`
   → 10 matches. Most are documentation comments referencing example paths. **Exception:** `commands-add.ts:615,628,632` — hardcoded GitHub repo URL in executable code.

**Files audited:**
- `packages/cli/src/commands-add.ts` — example download, catalog loading
- `packages/cli/src/commands-compile.ts` — playbook path discovery
- `packages/cli/src/commands-reset.ts` — journal reset paths
- `packages/cli/src/commands-seed.ts` — seed discovery globs
- `packages/core/src/executor/spawn-runner.ts` — skill path construction
- `packages/core/src/executor/skill-resolver.ts` — skill path resolution
- `packages/core/src/context/types.ts` — `convergeDir` definition
- `packages/core/src/artifacts/index.ts` — `ARTIFACTS_ROOT` constant
- `packages/core/src/journal/deps-map.ts` — DEPS.md path

## 3. Findings

### Finding 1 (HIGH): Hardcoded GitHub org/repo in CLI

`packages/cli/src/commands-add.ts` — function `downloadExampleFromGitHub()` (lines 611–644):

- **Line 615:** `https://api.github.com/repos/myanlabs/converge/contents/examples/${exampleName}/.converge`
- **Line 628:** `https://github.com/myanlabs/converge.git`
- **Line 632:** `examples/${exampleName}/.converge`

The repo owner `myanlabs` and repo name `converge` are hardcoded in framework CLI code. Per model §3.5, project-specific identifiers must not leak into `packages/`. A fork or mirror of the repo would need source code edits to point to the correct upstream.

**Correction:** Make the examples registry URL configurable via `project.yaml` (`examples.registry.url`) or a `--registry` CLI flag. The directory structure convention (`examples/<name>/.converge`) is fine for the framework to define, but **where** the examples live is project-specific.

**Test:** `tests/cli/examples-registry-config.test.ts` — custom registry URL is used for download; default falls back to documented default, not hardcoded org/repo.

### Finding 2 (MEDIUM): Duplicated skill-path construction in spawn-runner

`packages/core/src/executor/spawn-runner.ts:985`:

```
const skillPath = `.converge/skills/${skills[i]}/SKILL.md`;
```

The spawn runner constructs the skill path by string template when a dedicated `skill-resolver.ts` module already exists for this purpose. The resolver handles legacy vs framework vs global conventions. Duplicating path construction here breaks the single-responsibility pattern and means path logic changes require edits in two places.

**Correction:** Replace the inline path construction with a call to the skill resolver: `resolveSkillPath(skills[i])`.

**Test:** `tests/core/skill-path-resolution.test.ts` — skill path resolution is centralized; spawn-runner delegates.

## 4. Commands used

```sh
cd D:/converge
grep -rn "\.converge/" packages/core/src/ packages/cli/src/ | head -20
grep -rn "examples/" packages/core/src/ packages/cli/src/ | head -10
```
