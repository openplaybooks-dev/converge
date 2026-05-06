---
title: "Research a topic deeply"
description: "Layered, iterative deepening research playbooks. Anchored on deep-research, frontier-research, scientific-research."
sidebar:
  order: 3
---
## What this shape gets you

A one-shot LLM query gives you a paragraph. A research playbook gives you a folder of structured notes, citations, and a synthesized briefing — produced by running multiple passes that each see the previous pass's output. The key difference is iteration with memory: each pass aggregates findings, identifies gaps or promising threads, and triggers the next pass with that context baked in.

## The three example variants

### deep-research

Layered iterative deepening. Each layer aggregates and identifies promising threads for the next layer.

From the README: "Research is not a linear pipeline — it's iterative deepening. Layer 1 surveys the breadth of the problem space. Layer 2 focuses on promising areas. Layer 3 deeply investigates the most critical areas. Each layer's aggregation feeds into the next."

[Examples gallery → deep-research →](/docs/examples/)

### frontier-research

Focuses on emerging and cutting-edge content using parallel beam search and gradient-descent convergence.

From the README: "Each epoch = one gradient step. Within each epoch, N parallel 'beams' explore different research directions simultaneously. Top-K beams are selected, their insights merged, and the next epoch branches from the accumulated knowledge."

[Examples gallery → frontier-research →](/docs/examples/)

### scientific-research

Paper-citation-style research with stricter sourcing, Bayesian reasoning, and GRADE methodology.

From the README: "Autonomous scientific research pipeline with iterative evidence synthesis, Bayesian reasoning, GRADE methodology, meta-analysis, and academic paper generation."

[Examples gallery → scientific-research →](/examples/)

## The pattern, abstractly

Every research playbook follows the same underlying structure:

**A topic input file at the project root.** The playbook reads a question or research topic — typically passed as a `--var` at runtime — and that topic is the seed for everything that follows.

**Phases that each produce notes, signals, and a layer summary.** Each pass (layer, epoch, beam — depending on the variant) does real work: searches, gathers evidence, identifies promising threads, and produces a structured aggregation artifact. These aggregation artifacts are what feed into the next pass.

**A final synthesis phase that reads everything.** The last phase in every variant is a synthesis step that reads all prior outputs and produces a final report. In deep-research this is the Final Report phase. In frontier-research it's the gradient-step + accumulated state. In scientific-research it's the paper-draft phase.

**Use of `depends_on:` to chain layers.** Passes are explicitly ordered so that Layer N cannot run until Layer N-1's aggregation artifact exists. The `depends_on` declaration in each task's TASK.md enforces this — it's not a soft suggestion, it's a hard dependency that the runner respects before scheduling any dependent task.

The playbook YAML also controls run behavior: `mode: loop` tells the runner to keep spawning epochs or layers until a convergence condition is met, rather than executing a fixed linear plan.

## Tweaking it for your topic

- **Replace the topic input file with yours.** Most research playbooks accept a `--question` var at runtime. Change the seed question to match your research topic.
- **Adjust the number of layers.** More layers = deeper, slower, costlier. Deep-research defaults to 3 layers; you can reduce to 1 or 2 for shallow scans or increase for a dissertation-level output.
- **Adjust the synthesis phase's prompt.** If you want a briefing memo instead of a long-form report, edit the final phase's prompt to specify the output shape. The synthesis is just a prompt against the accumulated artifacts — change the prompt, change the output.

## Cost and time signals

Research playbooks are the most expensive shape. Set realistic expectations:

- Iteration count and provider model matter enormously. Early layers can use cheaper models (link to [/guides/switch-providers](/guides/switch-providers) for guidance on model selection per layer).
- Add a budget check or `maxIterations` cap in `playbook.yml#run` to prevent runaway loops. Deep-research defaults to `maxIterations: 30`. Frontier-research and scientific-research both have convergence thresholds that stop the loop when delta falls below a threshold.
- See [/reference/playbook-yml](/reference/playbook-yml) for the full run configuration reference.

## Where to go next

- [Examples gallery → research](/examples/) — see all research examples.
- [Switch providers](/guides/switch-providers) — control cost per layer.
- [Read the journal](/guides/read-the-journal) — research playbooks produce a lot of journal events; this is how you read them.
