---
id: 001-clone-mc
title: Clone Mission Control at pinned SHA into packages/studio
outputs:
  - packages/studio/UPSTREAM_SHA
  - packages/studio/package.json
checks:
  - id: studio-dir-populated
    description: packages/studio/ has src/app and package.json
    cmd: "test -d packages/studio/src/app && test -f packages/studio/package.json"
  - id: upstream-sha-pinned
    description: UPSTREAM_SHA matches the pin
    cmd: "grep -q '^a020d1b7d045e0e09616663ffb39963f432a3f4c' packages/studio/UPSTREAM_SHA"
  - id: dot-git-removed
    description: .git directory removed
    cmd: "test ! -d packages/studio/.git"
---

Clone `https://github.com/builderz-labs/mission-control` at commit `a020d1b7d045e0e09616663ffb39963f432a3f4c` into `packages/studio/`.

```bash
mkdir -p /tmp/mc-fork && rm -rf /tmp/mc-fork/mission-control
cd /tmp/mc-fork
git clone https://github.com/builderz-labs/mission-control
cd mission-control
git checkout a020d1b7d045e0e09616663ffb39963f432a3f4c
echo "a020d1b7d045e0e09616663ffb39963f432a3f4c" > UPSTREAM_SHA
rm -rf .git
mkdir -p /Users/minh/Documents/converge/packages/studio
cp -R . /Users/minh/Documents/converge/packages/studio/
```
