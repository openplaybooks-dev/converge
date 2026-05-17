---
title: "Examples gallery"
description: "Documented examples plus pointers into the shipped playbooks under examples/."
sidebar:
  order: 0
---
This gallery documents a representative subset of the shipped playbooks and points back to the source tree under `examples/`. Pick the closest match and inspect the actual playbook files there.

## Learning

Beginner-friendly, single-concept playbooks for exploring the framework.

- [Hello World](learning/hello-world): Simplest possible Converge playbook. Creates a file and verifies it exists.
  Use this if: "I want a minimal working playbook to read end-to-end."
- [Data Pipeline](learning/data-pipeline): Sequential pipeline with task dependencies: fetch → transform → validate.
  Use this if: "I want to understand task dependencies and I/O patterns."

## Building software

Apps, games, and asset pipelines driven by task graphs and dynamic child work. The current repo ships additional software examples under `examples/` even where this docs gallery does not yet have a dedicated page for each one.

## Research

Multi-pass deep research with iterative deepening and beam search.

- [Deep Research](research/deep-research): Layered deep research with iterative deepening: each layer aggregates findings and triggers deeper investigation.
  Use this if: "I want a thorough briefing on a topic."
- [Frontier Research](research/frontier-research): Beam-search frontier research exploring unknown solution spaces using parallel beams and multi-dimensional scoring.
  Use this if: "I want to explore open-ended questions with multiple research directions."

## Creative + simulation

Creative output, simulation, and optimization.

- [Cinematic Video Production](creative/cinematic-video-production): End-to-end AI film director. Input an `idea.md`, get a `clips/` folder with consistent cinematic shots.
  Use this if: "I want to generate a short film from a script."
- [Evolutionary Optimization](creative/evolutionary-optimization): Evolves LLM training configurations through iterative generation, evaluation, selection, and crossover.
  Use this if: "I want to optimize a training recipe or hyperparameters."
- [Social Sim](creative/social-sim): Direct social simulation. Each loop epoch is one simulation tick, spawning three child tasks per tick.
  Use this if: "I want to simulate a social scenario."

## Security

Security testing playbooks.

- [Autonomous Pentest](security/autonomous-pentest): A **one-off, sequential, exhaustive** pentest sweep playbook. For every endpoint discovered, it walks every attack technique.
  Use this if: "I want to pentest a target."

## Agent protocol

SDK and protocol demos.

- ACP provider demo lives in [`examples/acp-demo/`](../../examples/acp-demo/): demonstrates how to use the ACP provider through the shared agent interface.
  Use this if: "I want to see how to wire up a custom agent provider."

> **Don't see your problem?** Read [From your problem to a playbook](../getting-started/from-problem-to-playbook): it walks through articulating what you want to build even if no example is a perfect match.
