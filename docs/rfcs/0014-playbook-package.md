# RFC 0014: Playbook-as-versioned-package

**Status**: Draft
**Backwards-compatible**: Mostly (adds package metadata; manual playbooks unaffected)
**Estimate**: 2-3 weeks

## Problem

Examples are hand-maintained copies. A bug fix in `examples/flutter-app/.converge/playbooks/default/tasks/03-build-screens/TASK.md` doesn't propagate to anyone who copied it. Users diverge silently. No way to "upgrade my baby-app playbook to the latest fixes".

## Proposal

Treat each playbook as a semver-tagged package.

### Manifest

`.converge/playbooks/<name>/playbook.yml` already has `name:`. Add:

```yaml
name: default
version: 1.2.0
description: ...
ancestor:
  source: github.com/openplaybooks/baby-app
  version: 1.1.0
  diverged: false       # set to true once user customizes
```

### CLI

```
converge add --from-playbook openplaybooks/baby-app@1.2.0
converge playbook upgrade --to 1.3.0      # 3-way merge against ancestor
converge playbook diff --against 1.3.0    # show what would change
```

### Distribution

- v1: GitHub repos as the package registry. `openplaybooks/baby-app` resolves to `github.com/openplaybooks/baby-app` releases.
- v2 (later): a proper registry like npm.

### Upgrade algorithm

Three-way merge:
- Base: ancestor version.
- Ours: user's current playbook.
- Theirs: target upstream version.

Conflicts get marked with merge markers; user resolves and runs `converge playbook upgrade --continue`.

## Code-level design

- New module: `packages/core/src/playbook-package/`.
- Versions tracked in a `.converge/playbooks/<name>/.package-state` file (json).
- Fetcher: clones to a temp dir, copies into place.
- Differ: per-file (TASK.md, SKILL.md, scripts/).

## Implementation steps

1. Define the manifest schema additions.
2. Implement `converge add --from-playbook <ref>` — basic fetch+install.
3. Implement diff.
4. Implement upgrade (with merge).
5. Documentation: how to publish an upstream playbook.

## Test plan

1. `add --from-playbook baby-app@1.0.0` → playbook installed, version recorded.
2. Modify user playbook, `playbook upgrade --to 1.1.0` → 3-way merge succeeds for non-conflicting changes.
3. Conflicting change → markers inserted; `--continue` after manual resolution.
4. `playbook diff` → produces a unified diff.

## Out of scope

- Authentication for private playbooks (v1 is public-only).
- A central registry (v1 uses GitHub).
- Dependency graphs between playbooks (a playbook depending on another playbook).
