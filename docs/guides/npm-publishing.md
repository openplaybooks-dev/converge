---
title: "Publish Packages To npm"
description: "Release Converge workspace packages with pnpm, tarball checks, and post-publish verification."
sidebar:
  order: 6
---

# Publish Packages To npm

This repo is a pnpm workspace with multiple public packages. The **canonical CLI package is `@converge/cli`**. The **programmatic library is `@converge/core`**.

Use this guide when you want to cut a new npm release without guessing which packages should publish or which commands are safe in a workspace.

## Package contract

- `@converge/cli`: global install target for the `converge` command
- `@converge/core`: programmatic runtime and library exports
- Provider/helper packages: publishable support packages used by the CLI and library
- Hold back evaluation packages unless you are intentionally validating them for public release

## First release set

Publish these packages together when cutting the main Converge release:

- `@converge/cli`
- `@converge/core`
- `@converge/claudefn`
- `@converge/codexfn`
- `@converge/acpfn`
- `@converge/openfn`
- `@converge/kimifn`
- `@converge/qwenfn`
- `@converge/geminifn`
- `@converge/deepcodefn`
- `@converge/project-root`
- `@converge/agentfn`
- `codets`

Do not include these in the default release flow until they have an explicit public-release pass:

- `@converge/provider-benchmark`
- `@converge/swebench`
- `@converge/tbench`

## Preflight

Run prerelease checks from the repo root:

```bash
pnpm build
pnpm typecheck
pnpm test:all
```

Then check the exact tarballs that npm will see:

```bash
for pkg in \
  packages/cli \
  packages/core \
  packages/claudefn \
  packages/codexfn \
  packages/acpfn \
  packages/openfn \
  packages/kimifn \
  packages/qwenfn \
  packages/geminifn \
  packages/deepcodefn \
  packages/project-root \
  packages/agentfn \
  packages/codets
do
  (cd "$pkg" && npm pack --dry-run)
done
```

Before publishing, confirm:

- `@converge/cli` tarball contains `dist/index.js`
- `@converge/core` tarball contains `dist/*.js` and matching `dist/*.d.ts`
- no package export points at `src/` unless `src/` is intentionally shipped
- READMEs use `npm install -g @converge/cli` for CLI installation

## Versioning

Bump versions intentionally before publishing. For the main release set, keep dependent workspace packages aligned unless you have a reason not to.

Use one of these approaches:

- `pnpm --filter <package> version <new-version>` for targeted bumps
- edit `package.json` versions directly in one focused change

After bumping, rerun the preflight commands.

## Publish

Use `pnpm publish`, not raw `npm publish`, so workspace dependency ranges are rewritten correctly during publish.

Publish from each package directory with explicit access and no git checks if you are publishing from a prepared release commit:

```bash
(cd packages/project-root && pnpm publish --access public)
(cd packages/claudefn && pnpm publish --access public)
(cd packages/codexfn && pnpm publish --access public)
(cd packages/acpfn && pnpm publish --access public)
(cd packages/openfn && pnpm publish --access public)
(cd packages/kimifn && pnpm publish --access public)
(cd packages/qwenfn && pnpm publish --access public)
(cd packages/geminifn && pnpm publish --access public)
(cd packages/deepcodefn && pnpm publish --access public)
(cd packages/agentfn && pnpm publish --access public)
(cd packages/core && pnpm publish --access public)
(cd packages/cli && pnpm publish --access public)
(cd packages/codets && pnpm publish --access public)
```

Publish lower-level dependencies before dependents. `@converge/cli` should be near the end because it depends on the rest of the runtime stack.

## Post-publish verification

Verify the published artifacts in a clean temp directory:

```bash
mkdir -p /tmp/converge-publish-check
cd /tmp/converge-publish-check
npm init -y
npm install -g @converge/cli@<version>
converge --help
```

Then verify the library package:

```bash
mkdir -p /tmp/converge-core-check
cd /tmp/converge-core-check
npm init -y
npm install @converge/core@<version>
node -e "import('@converge/core').then(() => console.log('core ok'))"
```

Also check:

- npm package pages exist for every published package
- install snippets in the root README and package READMEs still match the released contract
- no missing file errors occur for the CLI binary or exported declaration files

## Roll forward, not backward

If a bad package is published:

- deprecate the broken version if needed
- fix the package
- publish a new patch version

Do not rely on unpublish as the normal recovery path.
