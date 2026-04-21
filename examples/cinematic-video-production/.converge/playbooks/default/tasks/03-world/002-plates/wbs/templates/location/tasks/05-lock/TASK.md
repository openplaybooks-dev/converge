---
id: "{{prefix}}-05-lock"
title: "Lock Reference — {{locName}}"
description: Emit locations/{id}/ref.json.
dependencies:
  - "{{prefix}}-02-wide-plate"
  - "{{prefix}}-03-detail-plates"
  - "{{prefix}}-04-time-variants"
tags:
  - location
  - reference
  - lock
inputs:
  - "{{locDir}}/wide.png"
  - "{{locDir}}/details.json"
outputs:
  - "{{locDir}}/ref.json"
checks:
  - id: ref-json-exists
    cmd: test -s {{locDir}}/ref.json
    description: ref.json written
---

# Lock Reference — {{locName}}

Assemble `{{locDir}}/ref.json`:

```json
{
  "id": "{{locId}}",
  "name": "{{locName}}",
  "description": "{{locDescription}}",
  "images": {
    "wide": "{{locDir}}/wide.png",
    "details": {
      /* one entry per item in details.json:  "<detail.id>": "{{locDir}}/detail-<detail.id>.png" */
    },
    "variants": {
      /* one entry per time_variant:  "<tod>": "{{locDir}}/variant-<tod>.png" */
    }
  },
  "seeds": {
    "wide": "<contents of {{locDir}}/wide.seed.txt>"
    /* ... per detail and variant ... */
  }
}
```

## Rules

- Every image path must resolve to an existing file.
- Do not regenerate images here.
