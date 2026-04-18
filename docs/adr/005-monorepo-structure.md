# ADR-005: Monorepo with Separate Packages

**Status**: Accepted
**Date**: 2026-04-18

## Context

Converge supports multiple AI providers (Claude, Kimi, Qwen, Gemini, OpenAI) through a unified interface. The core framework, the unified agent interface, and individual provider implementations could be structured as a single package, separate repos, or a monorepo with workspace packages.

## Decision

The project uses a pnpm monorepo with separate packages: `@converge/core` (framework), `@converge/agentfn` (unified agent interface), and individual provider packages (`@converge/claudefn`, `@converge/kimifn`, `@converge/qwenfn`, `@converge/geminifn`, `@converge/openfn`, `@converge/acpfn`). Internal dependencies use `workspace:*` protocol. A utility package (`@converge/codets`) provides TypeScript codegen support.

## Consequences

- **Easier**: Users install only the providers they need. Bundlers can tree-shake unused providers. Clear dependency graph prevents circular dependencies. Independent versioning allows releasing provider updates without core changes. Third parties can publish compatible provider packages.
- **Harder**: Workspace configuration and cross-package builds add tooling complexity. Testing across package boundaries requires careful setup. Publishing requires coordinating versions across packages.
