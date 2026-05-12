---
description: >
  Extract stitch-to-flutter-baby-watch-v2 into
  ../myanlabs/examples/stitch-to-flutter-baby-watch-v2.
  Feature-complete Flutter BLE child safety app.
inputs:
  - examples/stitch-to-flutter-baby-watch-v2/
outputs:
  - ../myanlabs/examples/stitch-to-flutter-baby-watch-v2/
checks:
  - id: extracted
    cmd: test -d ../myanlabs/examples/stitch-to-flutter-baby-watch-v2
  - id: has-readme
    cmd: test -s ../myanlabs/examples/stitch-to-flutter-baby-watch-v2/README.md
  - id: has-license
    cmd: test -s ../myanlabs/examples/stitch-to-flutter-baby-watch-v2/LICENSE
  - id: has-gitignore
    cmd: test -s ../myanlabs/examples/stitch-to-flutter-baby-watch-v2/.gitignore
  - id: has-pubspec
    cmd: test -s ../myanlabs/examples/stitch-to-flutter-baby-watch-v2/pubspec.yaml
depends_on: []
---

Copy `examples/stitch-to-flutter-baby-watch-v2/` into
`../myanlabs/examples/stitch-to-flutter-baby-watch-v2/`.

```bash
mkdir -p ../myanlabs/examples/stitch-to-flutter-baby-watch-v2
rsync -a --delete \
  --exclude '.git/' \
  --exclude '.converge/journal/' \
  --exclude '.converge/artifacts/' \
  --exclude '.dart_tool/' \
  --exclude 'build/' \
  examples/stitch-to-flutter-baby-watch-v2/ ../myanlabs/examples/stitch-to-flutter-baby-watch-v2/
```

Preserve `.stitch/`, platform folders, docs, scripts, and tests. Add a LICENSE
copied from the converge root if missing.
