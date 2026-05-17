---
id: "{{taskId}}"
title: "Epoch {{epoch}}"
vars:
  epoch:
  question:
  domain:
  targetScore:
---

# Epoch {{epoch}}

Run the full research pipeline: literature → hypothesize → experiment → statistical analysis → evidence synthesis → contradiction resolution → paper draft → convergence check.

**Research question**: {{question}}
**Domain**: {{domain}}

The 8 phase subtasks are auto-discovered from this template's `tasks/` directory and run sequentially via their `depends_on` chain.
