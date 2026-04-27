---
id: 06-guides
title: Phase 06 — Guides (problem-shaped how-to pages)
blocking: true
dependencies: [03-ia, 05-examples]
outputs:
  - docs/guides/articulate-your-goal.md
  - docs/guides/generate-something-repeatedly.md
  - docs/guides/research-a-topic-deeply.md
  - docs/guides/build-a-software-project.md
  - docs/guides/switch-providers.md
  - docs/guides/read-the-journal.md
  - docs/guides/customize-an-example.md
---

# Guides — problem-shaped, not feature-shaped

The previous Guides set ("writing a playbook", "tasks and WBS", "checks
and gaps") was feature-shaped — it documented the framework's surface.
The new set is problem-shaped — each page answers a question a real user
actually has.

Every guide:

- Opens with the problem in plain English ("You want to generate X
  every time Y happens.").
- Walks to a working playbook that solves the problem.
- Anchors to a specific example from the gallery as the canonical
  starting point.
- Links forward to the relevant Concept page (gap-driven model,
  filesystem-as-plan, self-correction) for the reader who wants the
  why.
- Links to a Reference page for the schema-level detail.

Seven leaves:

1. **001-articulate-your-goal** — the non-technical "I have a vague
   idea, how do I shape it" guide. Discovery questions, anti-patterns,
   when to break a goal into multiple playbooks.
2. **002-generate-something-repeatedly** — the most common shape:
   "I want N copies of an artifact" or "I want X each week / each time
   the source changes". Anchored on `data-pipeline`, `cinematic-video-production`.
3. **003-research-a-topic-deeply** — multi-pass research playbooks.
   Anchored on `deep-research`, `frontier-research`, `scientific-research`.
4. **004-build-a-software-project** — building runnable software.
   Anchored on `flutter-app`, `fullstack-app`, `stitch-to-flutter`.
5. **005-switch-providers** — kept from the old set (still problem-shaped).
   Claude / Gemini / Kimi / Qwen, custom base URLs, per-task overrides.
6. **006-read-the-journal** — debugger guide. Reading events, LEARN.md,
   checkpoints. Doesn't *fix* stuck runs (that's Troubleshooting); it
   teaches the reader to read what's there.
7. **007-customize-an-example** — operationalizes the gallery.
   "I copied an example, now what do I edit first?". Field-by-field walk
   of the most-tweaked files in a typical example.
