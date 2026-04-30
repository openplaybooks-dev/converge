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
git clone https://github.com/myanlabs/converge.git
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

To expose the built CLI as a `converge` command on your `$PATH`, link the `@converge/core` package globally:

```bash
pnpm build
pnpm --filter @converge/core link --global
converge --help
```

Run `pnpm --filter @converge/core unlink --global` to remove the link.

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
- Releases are published to npm under the `@converge` scope.
- Changelog entries should accompany version bumps.

## Getting Help

- Open an [issue](https://github.com/myanlabs/converge/issues) for bugs or feature requests.
- Use issue discussions for questions about architecture or approach.
