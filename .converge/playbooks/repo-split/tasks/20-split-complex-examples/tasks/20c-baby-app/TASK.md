---
description: >
  Extract baby-app into ../myanlabs/examples/baby-app.
  Flutter novel-reader mobile app with Riverpod and GoRouter.
inputs:
  - examples/baby-app/
outputs:
  - ../myanlabs/examples/baby-app/
checks:
  - id: extracted
    cmd: test -d ../myanlabs/examples/baby-app
  - id: has-readme
    cmd: test -s ../myanlabs/examples/baby-app/README.md
  - id: has-license
    cmd: test -s ../myanlabs/examples/baby-app/LICENSE
  - id: has-gitignore
    cmd: test -s ../myanlabs/examples/baby-app/.gitignore
  - id: has-pubspec
    cmd: test -s ../myanlabs/examples/baby-app/pubspec.yaml
depends_on: []
---

Copy `examples/baby-app/` into `../myanlabs/examples/baby-app/`.

```bash
mkdir -p ../myanlabs/examples/baby-app
rsync -a --delete \
  --exclude '.git/' \
  --exclude '.converge/journal/' \
  --exclude '.converge/artifacts/' \
  --exclude '.dart_tool/' \
  --exclude 'build/' \
  examples/baby-app/ ../myanlabs/examples/baby-app/
```

Add a LICENSE copied from the converge root if missing. Ensure `.gitignore`
excludes Flutter generated directories such as `.dart_tool/` and `build/`.
