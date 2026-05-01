---
id: 02-green
title: Green — implement manifest writer and reader
description: |
  Implement packages/core/src/manifest/{schema,writer,reader,index}.ts
  until all 01-red tests pass. Refactor while green.

dependencies:
  - 01-red

inputs:
  - "packages/core/tests/unit/manifest/writer.test.ts"
  - "packages/core/tests/unit/manifest/reader.test.ts"

outputs:
  - "packages/core/src/manifest/schema.ts"
  - "packages/core/src/manifest/writer.ts"
  - "packages/core/src/manifest/reader.ts"
  - "packages/core/src/manifest/index.ts"

checks:
  - id: typecheck
    cmd: cd packages/core && pnpm typecheck 2>&1 | (! grep 'src/manifest')
    description: Module typechecks.
  - id: tests-pass
    cmd: cd packages/core && pnpm test -- tests/unit/manifest
    description: All 01-red tests now pass.
  - id: atomic-write
    cmd: cd packages/core && pnpm test -- tests/unit/manifest -t 'atomic'
    description: The atomic-write test specifically passes.
tags:
  - tdd
  - green
---

# Green — implement until tests pass

`schema.ts` — types only. `Manifest`, `Node` (discriminated union on
`state`), `RunResults`, `RunResult` with `output_hashes`. Export
`MANIFEST_VERSION`.

`writer.ts` — `writeManifest(targetDir, manifest)`. Algorithm: write to
`target/.manifest.json.tmp`, fsync, rename to `target/manifest.json`.
Same shape for `writeRunResults`.

`reader.ts` — return null on ENOENT; parse and validate version; throw
typed `ManifestVersionError` on mismatch.

`index.ts` — public re-exports.

Refactor while green. Do not touch the test files.
