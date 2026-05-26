---
id: 05-finalize
title: Verify all concept outputs in partition directory
depends_on:
  - 04-enhance
checks:
  - id: concept-exists
    cmd: test -s "concepts/${CONVERGE_PARTITION_KEY}/concept.html"
    description: concept.html in partition directory
  - id: mockup-exists
    cmd: test -s "concepts/${CONVERGE_PARTITION_KEY}/mockup.html"
    description: mockup.html in partition directory
  - id: spec-exists
    cmd: test -s "concepts/${CONVERGE_PARTITION_KEY}/design-spec.md"
    description: design-spec.md in partition directory
  - id: design-system-exists
    cmd: test -s "concepts/${CONVERGE_PARTITION_KEY}/design-system.md"
    description: design-system.md in partition directory
---

# Finalize

All outputs are already written to `concepts/$CONVERGE_PARTITION_KEY/` by previous tasks. Verify that all four deliverables exist and are non-empty:

1. `concepts/$CONVERGE_PARTITION_KEY/concept.html` — static HTML concept
2. `concepts/$CONVERGE_PARTITION_KEY/mockup.html` — interactive mockup
3. `concepts/$CONVERGE_PARTITION_KEY/design-spec.md` — creative brief
4. `concepts/$CONVERGE_PARTITION_KEY/design-system.md` — brand design system

No copy step is needed — partitioning ensures each design system writes directly to its own output directory.
