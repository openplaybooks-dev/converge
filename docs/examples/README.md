---
title: "Examples gallery"
description: "21 working playbooks across software, research, creative work, security, and protocol demos. Find the closest match to your problem and copy it."
sidebar:
  order: 0
---
Every example in this gallery is a real, runnable Converge playbook that lives under `examples/` in the source tree. Pick the one closest to your problem and copy it — they're designed to be edited.

## Learning

Beginner-friendly, single-concept playbooks for exploring the framework.

- [Hello World](learning/hello-world) — Simplest possible Converge playbook. Creates a file and verifies it exists.
  Use this if: "I want a minimal working playbook to read end-to-end."
- [Data Pipeline](learning/data-pipeline) — Sequential pipeline with task dependencies: fetch → transform → validate.
  Use this if: "I want to understand task dependencies and I/O patterns."

## Building software

Apps, games, and asset pipelines driven by WBS task trees.

- [Baby App](software/baby-app) — Demonstrates autonomous mobile app generation using the Harness V2 framework with Flutter and Dart.
  Use this if: "I want to generate a mobile app from a Stitch design."
- [Flutter App](software/flutter-app) — Demonstrates autonomous mobile app generation using the Harness V2 framework with Flutter and Dart.
  Use this if: "I want to generate a mobile app from a Stitch design."
- [Fullstack App](software/fullstack-app) — WBS-driven playbook that dynamically spawns component tasks.
  Use this if: "I want to see dynamic task spawning with WBS scripting."
- [Game Aiwolf](software/game-aiwolf) — A full Claude Code Game Studios setup with 39 coordinated subagents for Godot 4 game development.
  Use this if: "I want to build a game with a structured AI studio workflow."
- [Game Assets](software/game-assets) — Generates game sprites and assets using Gemini 2.5 Flash Image with sprite sheet templates.
  Use this if: "I want to assemble a game asset pipeline."
- [Stitch to Flutter](software/stitch-to-flutter) — Demonstrates autonomous mobile app generation using the Harness V2 framework with Flutter and Dart.
  Use this if: "I want to generate a mobile app from a Stitch design."
- [Stitch to Flutter Baby Watch](software/stitch-to-flutter-baby-watch) — Demonstrates autonomous mobile app generation using the Harness V2 framework with Flutter and Dart.
  Use this if: "I want to generate a mobile app from a Stitch design."
- [Stitch to Flutter Baby Watch (v2)](software/stitch-to-flutter-baby-watch-v2) — Second-generation version of the `stitch-to-flutter-baby-watch` example.
  Use this if: "I want to generate a mobile app from a Stitch design."

## Research

Multi-pass deep research with iterative deepening and beam search.

- [Deep Research](research/deep-research) — Layered deep research with iterative deepening — each layer aggregates findings and triggers deeper investigation.
  Use this if: "I want a thorough briefing on a topic."
- [Frontier Research](research/frontier-research) — Beam-search frontier research exploring unknown solution spaces using parallel beams and multi-dimensional scoring.
  Use this if: "I want to explore open-ended questions with multiple research directions."

## Creative + simulation

Creative output, simulation, and optimization.

- [Cinematic Video Production](creative/cinematic-video-production) — End-to-end AI film director. Input an `idea.md`, get a `clips/` folder with consistent cinematic shots.
  Use this if: "I want to generate a short film from a script."
- [Evolutionary Optimization](creative/evolutionary-optimization) — Evolves LLM training configurations through iterative generation, evaluation, selection, and crossover.
  Use this if: "I want to optimize a training recipe or hyperparameters."
- [Social Sim](creative/social-sim) — Direct social simulation. Each loop epoch is one simulation tick, spawning three child tasks per tick.
  Use this if: "I want to simulate a social scenario."

## Security

Security testing playbooks.

- [Autonomous Pentest](security/autonomous-pentest) — A **one-off, sequential, exhaustive** pentest sweep playbook. For every endpoint discovered, it walks every attack technique.
  Use this if: "I want to pentest a target."

## Agent protocol

SDK and protocol demos.

- [ACP (Agent SDK) Provider Demo](agent-protocol/acp-demo) — Demonstrates how to use the `@converge/scpfn` package via the `@converge/agentfn` unified interface.
  Use this if: "I want to see how to wire up a custom agent provider."

> **Don't see your problem?** Read [From your problem to a playbook](../getting-started/from-problem-to-playbook) — it walks through articulating a goal even if no example is a perfect match.
