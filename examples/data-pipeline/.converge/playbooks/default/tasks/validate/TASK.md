---
id: validate
title: Validate transformed data
dependencies:
  - transform
inputs:
  - data/transformed.json
outputs:
  - data/validated.json
checks:
  - id: validated-exists
    cmd: test -f data/validated.json
    description: Validated data file exists
  - id: all-have-grades
    cmd: "node -e \"const d=JSON.parse(require('fs').readFileSync('data/validated.json'));process.exit(d.records.every(r=>r.grade)?0:1)\""
    description: All records have a grade field
---

Read `data/transformed.json`, verify every record has a valid `grade` field, and write the result to `data/validated.json` with `{ "valid": true, "records": [...] }`.
