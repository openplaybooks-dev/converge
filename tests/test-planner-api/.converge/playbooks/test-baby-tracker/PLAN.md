---
kind: container
children:
  - id: 01-requirements
    kind: executable
    title: Capture requirements
  - id: 02-architecture
    kind: container
    title: Design the architecture
  - id: 03-implementation
    kind: seed
    title: Generate implementation
---

# Goal

Build a baby tracker app with sleep and feed logs.

# Decision

Decompose into one requirements pass, an architecture container, and a
seed-driven implementation phase that fans out per feature.
