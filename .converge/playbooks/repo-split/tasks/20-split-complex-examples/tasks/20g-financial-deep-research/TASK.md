---
description: >
  Extract financial-deep-research into
  ../myanlabs/examples/financial-deep-research.
  Python-based professional equity research project.
inputs:
  - examples/financial-deep-research/
outputs:
  - ../myanlabs/examples/financial-deep-research/
checks:
  - id: extracted
    cmd: test -d ../myanlabs/examples/financial-deep-research
  - id: has-readme
    cmd: test -s ../myanlabs/examples/financial-deep-research/README.md
  - id: has-license
    cmd: test -s ../myanlabs/examples/financial-deep-research/LICENSE
  - id: has-gitignore
    cmd: test -s ../myanlabs/examples/financial-deep-research/.gitignore
  - id: has-requirements
    cmd: test -s ../myanlabs/examples/financial-deep-research/requirements.txt
depends_on: []
---

Copy `examples/financial-deep-research/` into
`../myanlabs/examples/financial-deep-research/`.

```bash
mkdir -p ../myanlabs/examples/financial-deep-research
rsync -a --delete \
  --exclude '.git/' \
  --exclude '.converge/journal/' \
  --exclude '.converge/artifacts/' \
  --exclude '__pycache__/' \
  --exclude '*.pyc' \
  --exclude 'data/' \
  --exclude 'reports/' \
  --exclude 'analysis/' \
  examples/financial-deep-research/ ../myanlabs/examples/financial-deep-research/
```

Add `requirements.txt` if missing and keep it minimal. Ensure `.gitignore`
excludes generated data, reports, Python caches, secrets, and runtime state.
