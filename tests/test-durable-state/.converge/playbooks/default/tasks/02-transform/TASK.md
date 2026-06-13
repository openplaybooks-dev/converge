---
id: 02-transform
title: Transform — emit a record
passthrough: true
outputs:
  - output/transform.json
checks:
  - id: transform-json
    cmd: test -s output/transform.json
---

# Transform

```bash
mkdir -p output
printf '{"n":3}' > output/transform.json
echo "[transform] n=3"
```
