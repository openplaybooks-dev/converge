---
id: 02-manifest-rw
title: Manifest reader, writer, and run_results schema
description: |
  Schema, atomic writer, and reader for target/manifest.json and
  target/run_results.json. Defines the Manifest, Node, and RunResults
  types from spec §6. Atomic write (temp file + rename); reader returns
  null if absent, throws on version mismatch.

dependencies:
  - 01-select-parser

inputs:
  - "docs/design/cli-redesign.md"
  - "packages/core/src/select/index.ts"

outputs:
  - "packages/core/src/manifest/schema.ts"
  - "packages/core/src/manifest/writer.ts"
  - "packages/core/src/manifest/reader.ts"
  - "packages/core/src/manifest/index.ts"
  - "packages/core/tests/unit/manifest/writer.test.ts"
  - "packages/core/tests/unit/manifest/reader.test.ts"

checks:
  - id: typecheck
    cmd: cd packages/core && pnpm typecheck
    description: Manifest module typechecks.
  - id: tests-green
    cmd: cd packages/core && pnpm test -- tests/unit/manifest
    description: Manifest unit tests pass.
  - id: api-shape
    cmd: |
      node -e "const m=require('./packages/core/dist/manifest/index.js');
      if(typeof m.writeManifest!=='function')process.exit(1);
      if(typeof m.readManifest!=='function')process.exit(1);
      if(typeof m.MANIFEST_VERSION==='undefined')process.exit(1);"
    description: writeManifest, readManifest, MANIFEST_VERSION exported.

tags:
  - foundations
  - manifest
---

# Manifest reader/writer

Two TDD subtasks: red writes failing tests for the schema + atomic IO,
green implements until tests pass.

The Manifest type's `state` field (`concrete | expected | frontier`) is
modeled as a TypeScript discriminated union — invalid states are a type
error, not a runtime error.

References: `docs/design/cli-redesign.md` §6.1 (manifest schema), §6.2
(run_results schema), §2 (the three node states).
