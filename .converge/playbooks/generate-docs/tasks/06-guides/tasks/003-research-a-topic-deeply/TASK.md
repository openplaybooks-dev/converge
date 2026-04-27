---
id: 003-research-a-topic-deeply
title: Write docs/guides/research-a-topic-deeply.md
inputs:
  - examples/deep-research/README.md
  - examples/deep-research/.converge/playbooks/deep-research/playbook.yml
  - examples/frontier-research/README.md
  - examples/scientific-research/README.md
outputs:
  - docs/guides/research-a-topic-deeply.md
checks:
  - id: page-exists
    cmd: "test -f docs/guides/research-a-topic-deeply.md"
    description: page exists
  - id: page-frontmatter
    cmd: "head -10 docs/guides/research-a-topic-deeply.md | grep -q '^title:' && head -10 docs/guides/research-a-topic-deeply.md | grep -q '^sources:'"
    description: title + sources frontmatter
  - id: anchored-on-research-examples
    cmd: "grep -qE 'deep-research|frontier-research|scientific-research' docs/guides/research-a-topic-deeply.md"
    description: page anchors on a real research example
  - id: explains-layered-or-iterative
    cmd: "grep -qiE 'layer|iterat|deepen|round|pass' docs/guides/research-a-topic-deeply.md"
    description: explains layered / iterative deepening
  - id: word-count-ok
    cmd: "test -f docs/guides/research-a-topic-deeply.md && wc -w docs/guides/research-a-topic-deeply.md | awk '{exit ($1>=700&&$1<=1500?0:1)}'"
    description: 700-1500 words
---

# Write `docs/guides/research-a-topic-deeply.md`

Multi-pass research playbooks. Each pass aggregates findings, identifies
gaps or promising threads, and triggers the next pass. The output is a
synthesized briefing that's deeper than a one-shot LLM query.

## Required frontmatter

```yaml
---
title: "Research a topic deeply"
description: "Layered, iterative deepening research playbooks. Anchored on deep-research, frontier-research, scientific-research."
sources:
  - examples/deep-research/README.md
  - examples/deep-research/.converge/playbooks/deep-research/playbook.yml
  - examples/frontier-research/README.md
  - examples/scientific-research/README.md
sidebar:
  order: 3
---
```

## Required structure

1. **What this shape gets you** (1 paragraph). A one-shot LLM query
   gives you a paragraph; a research playbook gives you a folder of
   structured notes, citations, and a synthesized report — produced by
   running multiple passes that each see the previous pass's output.

2. **The three example variants.**
   - **`deep-research`** — layered iterative deepening. Each layer
     aggregates and identifies promising threads for the next layer.
   - **`frontier-research`** — focuses on emerging / cutting-edge
     content. (Adjust to whatever the README actually says.)
   - **`scientific-research`** — paper-citation-style research with
     stricter sourcing. (Adjust to whatever the README actually says.)

   For each, link to the gallery page and quote one sentence from the
   README.

3. **The pattern, abstractly** (2-3 paragraphs). Read
   `examples/deep-research/.converge/playbooks/deep-research/playbook.yml` and
   describe what's actually there:
   - A topic input file at the project root.
   - Phases that each produce notes / signals / a layer summary.
   - A final synthesis phase that reads everything.
   - Use of `depends_on:` to chain layers.

4. **Tweaking it for your topic.** Concrete:
   - Replace the topic input file with yours.
   - Adjust the number of layers (more = deeper, slower, costlier).
   - Adjust the synthesis phase's prompt if you want a specific output
     shape (briefing memo vs slide-ready bullets vs a long-form report).

5. **Cost / time signals.** Research playbooks are the most expensive
   shape. Set realistic expectations:
   - Iteration count and provider matter — link to
     [/guides/switch-providers](/guides/switch-providers) for cheaper
     models for early layers.
   - Add a budget check or `maxIterations` cap in `playbook.yml#run`.
     Link to `/reference/playbook-yml`.

6. **Where to go next.**
   - [Examples gallery → research](/examples/) — see all research examples.
   - [Switch providers](/guides/switch-providers) — control cost per
     layer.
   - [Read the journal](/guides/read-the-journal) — research playbooks
     produce a lot of journal events; this is how you read them.

## Read first

- `examples/deep-research/README.md` and the playbook — the canonical
  layered example. Quote 1-2 lines.
- `examples/frontier-research/README.md` and `examples/scientific-research/README.md`
  for the variant descriptions.

## Banned

- Promising specific output quality — depends entirely on the source
  data, the model, and the prompt.
- Inventing a fourth research example.
- A long preamble about "the future of research". The reader picked
  this page; they want to ship a research playbook.
