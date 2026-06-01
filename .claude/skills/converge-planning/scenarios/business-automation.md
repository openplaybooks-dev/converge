# Business Automation Playbook — Worked Example

## When to use this scenario

**Trigger phrases:**
- "automate a business workflow" / "workflow automation"
- "process intake items through business rules"
- "generate reports from data"
- "send notifications based on rule evaluation"

**What it covers:** Static pipeline: intake → rules → report → notification. Known steps, no dynamic spawning.

---

## The thinking sequence applied

1. **What does it contain?** Intake, Rules, Report, Notification
2. **Composition?** Intake → Rules → Report → Notification (via inputs:)
3. **Static vs. dynamic?** All known at plan time → static skeleton (tasks/ only, no templates/)
4. **Modes?** All leaves — no spawner needed

---

## playbook.yml

No `tasks:` entry needed. The loader discovers tasks from the `tasks/` directory at compile time.

```yaml
name: business-automation
description: >-
  Automate a business workflow.
  BOM: intake → rules → report → notification.

goals:
  - id: report-exists
    cmd: test -s output/${CONVERGE_PARTITION_KEY}/report.pdf
  - id: notification-sent
    cmd: test -s data/${CONVERGE_PARTITION_KEY}/notifications.json
```

---

## tasks/ structure + TASK.md content

```
tasks/
├── Intake/TASK.md       ← task, no inputs
├── Rules/TASK.md        ← inputs: Intake output
├── Report/TASK.md       ← inputs: Rules output
└── Notification/TASK.md  ← inputs: Report output
```

**tasks/Intake/TASK.md:**
```yaml
---
id: Intake
title: Intake processing
inputs: []
outputs:
  - data/${CONVERGE_PARTITION_KEY}/intake.json
checks:
  - id: has-items
    cmd: jq -e '.items | length > 0' data/${CONVERGE_PARTITION_KEY}/intake.json
---
```

**tasks/Rules/TASK.md:**
```yaml
---
id: Rules
title: Business rules engine
inputs:
  - data/${CONVERGE_PARTITION_KEY}/intake.json
outputs:
  - data/${CONVERGE_PARTITION_KEY}/decisions.json
checks:
  - id: decisions-valid
    cmd: jq empty data/${CONVERGE_PARTITION_KEY}/decisions.json
---
```

**tasks/Report/TASK.md:**
```yaml
---
id: Report
title: Output report
inputs:
  - data/${CONVERGE_PARTITION_KEY}/decisions.json
outputs:
  - output/${CONVERGE_PARTITION_KEY}/report.pdf
checks:
  - id: report-exists
    cmd: test -s output/${CONVERGE_PARTITION_KEY}/report.pdf
---
```

**tasks/Notification/TASK.md:**
```yaml
---
id: Notification
title: Notification dispatch
inputs:
  - output/${CONVERGE_PARTITION_KEY}/report.pdf
outputs:
  - data/${CONVERGE_PARTITION_KEY}/notifications.json
checks:
  - id: notification-sent
    cmd: test -s data/${CONVERGE_PARTITION_KEY}/notifications.json
---
```

## Key insight

No workflow verbs in task names ("Intake", "Rules", "Report", "Notification" — nouns, the data artifacts, not the process of doing them). No `depends_on:` needed. No stages.

The pipeline is a composition chain — each artifact reads the previous one's output. Not a sequence of process steps.
