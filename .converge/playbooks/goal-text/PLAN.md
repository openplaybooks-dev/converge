---
kind: leaf
---

# Goal

Restated: the supplied intent is the literal string `"goal text"`. The
`playbook.yml` description is the same placeholder. No domain, no
artifacts, no success criteria, no inputs are described. There is no
real goal to plan against.

# Decision

**Leaf.** Decomposition requires knowing the *shape* of the work
(application? document? dataset? video? CLI?), and none of that is
present in the scope packet. Inventing children — "scaffold", "build",
"test" — would violate the "do not invent" rule and produce a plan
that is structurally plausible but semantically empty. The plan
contract also requires every executable child to declare real
`outputs:` and deterministic `checks:`; both would be fabricated here.

The correct response is to mark this node a leaf and surface the
missing information in `# Open questions`, so the user can re-run
planning with a concrete intent. A real layer cannot be authored from
a placeholder.

(Note: a leaf at the playbook root is unusual — normally the root is
a container. This is a deliberate signal that the intent is too thin
to plan, not a claim that a single atomic task can satisfy it.)

# Open questions

- **What is the actual goal?** `"goal text"` reads as a placeholder
  left in by mistake or used to smoke-test the planner. What outcome
  should this playbook produce when it finishes?
- **What domain / artifact type?** Web app, CLI tool, data pipeline,
  static site, video, research report, document — the decomposition
  shape (container vs. wbs, executable types, check vocabulary) depends
  entirely on this.
- **What concrete deliverables / outputs?** Which files, directories,
  deployments, or reports must exist when the playbook is done? Without
  this, no executable child's `outputs:` or `checks:` can be authored
  honestly.
- **Are there existing inputs to consume?** A spec, a dataset, a repo
  to extend, an upstream manifest? `inputs:` for the first child layer
  depends on what already exists in the project.
- **Success criteria for the root?** What "done" looks like at the
  playbook level — needed both for top-level framing and to derive
  per-leaf checks downstream.

Once a real intent is supplied (e.g.
`converge plan -p "build a static site listing my GitHub repos"`),
this node should be re-planned and will almost certainly become a
`container` with 3-7 concrete children.
