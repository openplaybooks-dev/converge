---
id: 03-task-hashes
title: Content-hash primitives for tasks
description: |
  Five hash functions per spec §7.3: hashTaskFrontmatter, hashTaskBody,
  hashTaskChecks, hashInputs, hashUpstream. Plus hashPlaybook (rename of
  the existing whole-directory hash in packages/core/src/playbook/hash.ts).

dependencies:
  - 02-manifest-rw

inputs:
  - "docs/design/cli-redesign.md"
  - "packages/core/src/playbook/hash.ts"

outputs:
  - "packages/core/src/hash/task.ts"
  - "packages/core/src/hash/index.ts"
  - "packages/core/tests/unit/hash/task.test.ts"

checks:
  - id: typecheck
    cmd: cd packages/core && pnpm typecheck
    description: Hash module typechecks.
  - id: tests-green
    cmd: cd packages/core && pnpm test -- tests/unit/hash
    description: Task-hash tests pass.
  - id: api-shape
    cmd: |
      node -e "const m=require('./packages/core/dist/hash/index.js');
      for(const fn of ['hashTaskFrontmatter','hashTaskBody','hashTaskChecks','hashInputs','hashUpstream']){
        if(typeof m[fn]!=='function'){console.error('missing',fn);process.exit(1)}}"
    description: All five hash functions exported.
  - id: existing-hash-still-works
    cmd: cd packages/core && pnpm test -- tests/unit/playbook
    description: The existing playbook-hash tests still pass (no regression).

tags:
  - foundations
  - hash
---

# Content-hash primitives

Two TDD subtasks: red, green.

The five functions correspond to the five hash fields per node in the
manifest (spec §7.3 table). Each is a pure function — no I/O except
hashInputs which reads files in declared order.

`hashInputs` skips files larger than 50 MB by default and emits a
warning line per skipped file. The threshold is a constant (no flag in
this slice; that's a follow-up per spec §13.3).

References: `docs/design/cli-redesign.md` §7.3, §7.4.
