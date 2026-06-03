---
id: manager-report
title: Manager report
depends_on: []
outputs:
  - docs/findings.json
handoff:
  artifact: docs/review.html
  format: html
  generate: |
    Generate docs/review.html — a single, self-contained HTML report that
    presents the findings in docs/findings.json for a human reviewer.
    Summarise the status, surface any risks, and make it readable as a
    standalone page (inline styles, no external assets). This report is the
    artifact the reviewer approves or rejects.
stub:
  cmd: |
    root="$(cd ../../../../.. && pwd)"
    mkdir -p "$root/docs"
    printf '{"status":"ok","risks":["none"]}' > "$root/docs/findings.json"
    printf '<!doctype html><meta charset="utf-8"><title>Manager report</title><h1>Manager report</h1><p>Status: ok</p>' > "$root/docs/review.html"
---

Write `docs/findings.json` capturing the result of the manager's analysis as
JSON: a `status` field and a `risks` array. This is the task's main work — the
human-review report is generated separately via the handoff block.
