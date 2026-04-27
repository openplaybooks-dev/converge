---
title: Phase 06 — Package wiring and CLI integration
blocking: true
---

Finalize the package so users can run `converge studio` from any converge project.

Four leaf tasks:

1. **001-package-and-next-config** — finalize `package.json` deps + scripts; write `next.config.mjs` with `transpilePackages`, `outputFileTracingRoot`, `serverExternalPackages`, and the `next-intl/plugin` wrapper. Verify dev server boots and `/` returns 200.
2. **002-cli-studio-command** — add `packages/cli/src/commands-studio.ts`, register `converge studio [--dev] [--port N]` in `main.ts`, add `@converge/studio` to `optionalDependencies` of `@converge/cli`.
3. **003-e2e-verify** — run the verification scenarios end-to-end against the existing repo: list playbooks, edit a task, view a real journal session, trigger a no-op run.
4. **004-route-validation** — codify the Next.js routing rules (no static segments after a catch-all) and verify all primary routes return 200.
