---
id: 03-load
title: Load — emit a record
passthrough: true
outputs:
  - output/load.json
checks:
  - id: load-json
    cmd: test -s output/load.json
---

# Load

```bash
mkdir -p output
printf '{"n":5}' > output/load.json
echo "[load] n=5"
```
