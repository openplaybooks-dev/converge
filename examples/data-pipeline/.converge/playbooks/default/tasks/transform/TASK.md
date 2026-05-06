---
id: transform
title: Transform data
depends_on:
  - fetch-data
inputs:
  - data/raw.json
outputs:
  - data/transformed.json
checks:
  - id: transformed-exists
    cmd: test -f data/transformed.json
    description: Transformed data file exists
---

Read `data/raw.json` and create `data/transformed.json` that adds a `grade` field to each record:

- score >= 90 → "A"
- score >= 80 → "B"
- score >= 70 → "C"
- otherwise → "F"
