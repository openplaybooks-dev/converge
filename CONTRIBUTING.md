# Contributing to Converge

Thanks for your interest in contributing to Converge! This guide will help you get started.

## Code of Conduct

Please be respectful and constructive in all interactions. We expect contributors to act professionally and create a welcoming environment for everyone.

## Development Setup

### Prerequisites

- **Node.js** >= 20
- **pnpm** 10.29.3+ (specified via `packageManager` in `package.json`)

### Getting Started

```bash
# Clone the repository
git clone https://github.com/openplaybooks-dev/converge.git
cd converge

# Install dependencies
pnpm install

# Build all packages
pnpm build

# Run tests
pnpm test
```

### Using the CLI locally

From the repo root, run the CLI directly against source (no global install):

```bash
pnpm converge --help
pnpm converge init my-project
pnpm converge run
```

To expose the built CLI as a `converge` command on your `$PATH`, link the `@openplaybooks/converge` package globally:

```bash
pnpm build
pnpm --filter @openplaybooks/converge link --global
converge --help
```

Run `pnpm --filter @openplaybooks/converge unlink --global` to remove the link.

### Common tasks

```bash
pnpm test           # run all tests
pnpm typecheck      # type-check the monorepo
pnpm build          # rebuild after source changes
pnpm clean          # remove build artifacts
```

## Project Structure

Converge is a pnpm monorepo with the following packages:

```
packages/
├── core/        # Core framework — Unit class, convergence loop, CLI
├── agentfn/     # Agent function utilities
├── codets/      # Code generation utilities
├── claudefn/    # Claude AI provider
├── geminifn/    # Gemini AI provider
├── kimifn/      # Kimi AI provider
├── openfn/      # OpenAI provider
├── qwenfn/      # Qwen AI provider
└── acpfn/       # ACP provider
```

## How features ship

This repo runs an autonomous SDLC. Three playbooks at [`.converge/playbooks/`](./.converge/playbooks/) form the pipeline:

```
sources → rfc-ideation → human → rfc-shipping → code-audit → human → shipped
```

`rfc-ideation` surveys GitHub issues, [`docs/ideas/`](./docs/ideas/), the backlog, and code findings, then drafts an RFC under `docs/rfcs/NNNN-*.md` with `status: draft`. A maintainer flips `status: accepted`. `rfc-shipping` branches, implements the RFC's Implementation steps, runs its Test plan, and opens a PR. `code-audit` reviews the PR. A maintainer merges. See [`.converge/README.md`](./.converge/README.md) for the lifecycle, rejection paths, and the supervisor model.

**Which path is right for your change?**

| You have… | Do this | Why |
|---|---|---|
| An idea — too rough to design yet | Drop a file in [`docs/ideas/`](./docs/ideas/) | `rfc-ideation` picks it up and drafts the RFC for you |
| A bug or feature request | Open an [issue](https://github.com/openplaybooks-dev/converge/issues) | Ideation also reads open issues |
| A non-trivial change you want to drive | Draft your own `docs/rfcs/NNNN-*.md` with `status: draft` | A maintainer accepts it, `rfc-shipping` ships it |
| A small, mechanical fix | Open a PR directly | Skip the RFC overhead for typo-class changes |

## Making Changes

Mechanics that apply to every PR (whether `rfc-shipping` opened it or you did):

1. **Branch naming**: descriptive (`fix/convergence-loop-stall`, `feat/new-check-type`). `rfc-shipping` uses `rfc/NNNN-<slug>`.
2. **Commit messages**: follow the convention in [`CLAUDE.md` §5](./CLAUDE.md#5-commit-convention). `code-audit` will flag commits that don't.
3. **Pull requests**: open against `main`. `code-audit` posts an advisory review automatically; a maintainer merges.

## Testing

```bash
# Run all tests across the monorepo
pnpm test

# Run tests for a specific package
cd packages/core && pnpm test

# Type checking
pnpm typecheck
```

Maintain test coverage above 90%. Add tests for new functionality and bug fixes.

## Documentation

- Update relevant docs when changing behavior.
- Keep documentation concise and accurate.
- Code examples should be runnable.

## Release Process

- Converge uses [semantic versioning](https://semver.org/).
- Releases are published to npm under the `@openplaybooks` scope.
- Changelog entries should accompany version bumps.

## Continuous integration

Converge runs two tiers of CI on every pull request.

**Automatic gates** — deterministic, fast, and required for merge:

| Workflow            | Trigger                  | What it does                                                     |
| ------------------- | ------------------------ | ---------------------------------------------------------------- |
| `ci.yml`            | pull_request, push       | `pnpm install` then build / typecheck / test / format check      |
| `secret-scan.yml`   | pull_request, push       | Pattern scan for tokens, tracked `.env` files, large blobs       |
| `publish.yml`       | tag `v*.*.*`             | Builds and publishes the allowlisted `@openplaybooks/*` packages to npm |

**Converge auditor** — advisory, runs on every PR from this repo (forks skipped):

| Workflow              | Playbook                                | Output                                              |
| --------------------- | --------------------------------------- | --------------------------------------------------- |
| `code-audit.yml`       | `.converge/playbooks/code-audit/`        | One combined PR comment: commits + docs drift + code |

The Converge auditor is itself a contribution surface. The bot reviewing
your PR is a playbook in this repo — edit a prompt under
`.converge/playbooks/code-audit/tasks/<id>/TASK.md`, open a PR, and the
next run uses your version.

## Getting Help

- Open an [issue](https://github.com/openplaybooks-dev/converge/issues) for bugs or feature requests.
- Use issue discussions for questions about architecture or approach.
