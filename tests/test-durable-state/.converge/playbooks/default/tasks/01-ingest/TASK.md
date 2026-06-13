---
id: 01-ingest
title: Ingest — emit a small record
passthrough: true
outputs:
  - output/ingest.json
checks:
  - id: ingest-json
    cmd: test -s output/ingest.json
---

# Ingest

Emit a tiny JSON record. The flow reads this result (`{ n }`) and folds it into
durable state.

```bash
mkdir -p output
printf '{"n":2}' > output/ingest.json
echo "[ingest] n=2"
```
