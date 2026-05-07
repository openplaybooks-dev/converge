---
id: 01-setup
title: "Setup — create dirs and seed queue"
description: "Create artifact directories and write initial queue.json with seed items alpha and beta."
outputs:
  - .converge/artifacts/queue-pattern/pages/
  - .converge/artifacts/queue-pattern/queue.json
checks:
  - id: pages-dir-exists
    cmd: test -d .converge/artifacts/queue-pattern/pages
  - id: queue-exists
    cmd: test -f .converge/artifacts/queue-pattern/queue.json
  - id: queue-has-pending
    cmd: jq -e '.pending | length == 2' .converge/artifacts/queue-pattern/queue.json
    description: Queue has 2 pending items (alpha, beta)
---

# Setup

Create artifact directories and seed the initial queue.

```bash
mkdir -p .converge/artifacts/queue-pattern/pages
```

Write `.converge/artifacts/queue-pattern/queue.json`:
```json
{
  "pending": [
    { "id": "alpha", "depth": 0 },
    { "id": "beta", "depth": 0 }
  ],
  "processing": [],
  "done": [],
  "seen_ids": ["alpha", "beta"],
  "stats": { "total_discovered": 2, "total_processed": 0, "passes": 0 }
}
```
