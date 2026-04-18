---
id: 004-changelog-process
title: Document changelog and release process
dependencies:
  - 003-npm-config
outputs:
  - docs/releasing.md
checks:
  - id: releasing-doc-exists
    description: Releasing documentation exists
    cmd: test -f docs/releasing.md
---

Document the release and changelog process.

**Create** `docs/releasing.md` with:

1. **Versioning** — semver policy, what constitutes major/minor/patch
2. **Changelog maintenance** — how to update CHANGELOG.md
   - Keep a Changelog format
   - Update with each PR (not just at release time)
   - Categories: Added, Changed, Deprecated, Removed, Fixed, Security
3. **Release checklist**:
   - All tests pass
   - CHANGELOG.md updated
   - Version bumped in package.json
   - Build succeeds
   - npm publish from CI (not local)
4. **Pre-release versions** — alpha, beta, rc naming
5. **Monorepo considerations** — independent vs synchronized versioning
