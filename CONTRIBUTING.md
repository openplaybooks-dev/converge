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

To expose the built CLI as a `converge` command on your `$PATH`, link the `@openplaybooks/converge-core` package globally:

```bash
pnpm build
pnpm --filter @openplaybooks/converge-core link --global
converge --help
```

Run `pnpm --filter @openplaybooks/converge-core unlink --global` to remove the link.

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

## Making Changes

1. **Branch naming**: Use descriptive branch names (e.g., `fix/convergence-loop-stall`, `feat/new-check-type`).
2. **Commit messages**: Write clear, concise commit messages that explain *why* the change was made.
3. **Pull requests**: Open a PR against `main`. Include a summary of what changed and why.

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
| `commit-lint.yml`   | pull_request             | Hard-blocks PR titles that don't match the convention in §5      |
| `secret-scan.yml`   | pull_request, push       | Pattern scan for tokens, tracked `.env` files, large blobs       |
| `publish.yml`       | tag `v*.*.*`             | Builds and publishes the allowlisted `@openplaybooks/*` packages to npm |

**Manual Converge playbooks** — opt-in, run from the Actions tab, members only:

| Workflow              | Playbook                                        | Output                                  |
| --------------------- | ----------------------------------------------- | --------------------------------------- |
| `pr-review.yml`       | `.converge/playbooks/ci-pr-review/`             | PR comment with a structured review     |
| `docs-drift.yml`      | `.converge/playbooks/ci-docs-drift/`            | PR comment listing drifted doc pages    |
| `release-notes.yml`   | `.converge/playbooks/ci-release-notes/`         | Optionally overwrites the release body  |

The Converge-powered workflows are themselves a contribution surface. The
bot reviewing your PR is a playbook in this repo — edit the prompt in
`tasks/01-*/TASK.md`, open a PR, and the next maintainer-triggered run will
use your version.

## Getting Help

- Open an [issue](https://github.com/openplaybooks-dev/converge/issues) for bugs or feature requests.
- Use issue discussions for questions about architecture or approach.
