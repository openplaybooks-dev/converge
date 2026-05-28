---
id: 01-create-greeting
title: Create the greeting JSON file
group: setup
outputs:
  - output/greeting.json
checks:
  - id: greeting-exists
    cmd: test -f output/greeting.json
    description: output/greeting.json exists
  - id: valid-json
    cmd: node -e "JSON.parse(require('fs').readFileSync('output/greeting.json','utf8'))"
    description: file is valid JSON
  - id: has-required-fields
    cmd: node -e "const d=JSON.parse(require('fs').readFileSync('output/greeting.json','utf8'));process.exit(d.name&&d.language&&d.timestamp?0:1)"
    description: JSON contains `name`, `language`, and `timestamp` fields
---

Create the `output/` directory if it doesn't exist, then write `output/greeting.json` with the following shape:

```json
{
  "name": "<a name to greet, e.g. \"World\" or \"Converge\">",
  "language": "<an ISO 639-1 code, e.g. \"en\" or \"vi\">",
  "timestamp": "<current ISO 8601 timestamp>"
}
```

All three fields are required for the checks to pass.
