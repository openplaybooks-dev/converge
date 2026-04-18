---
id: fetch-data
title: Fetch raw data
outputs:
  - data/raw.json
checks:
  - id: raw-data-exists
    cmd: test -f data/raw.json
    description: Raw data file exists
---

Create `data/raw.json` with sample data:

```json
{
  "records": [
    { "id": 1, "name": "Alice", "score": 85 },
    { "id": 2, "name": "Bob", "score": 92 },
    { "id": 3, "name": "Charlie", "score": 78 }
  ]
}
```
