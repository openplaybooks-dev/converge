---
id: 020-simulate
title: Tick 1 — simulate
description: "Spawn one task per persona. Each spawned task is one persona × one tick: read prior timeline + own bio, decide ONE action, append to timeline.jsonl.\n"
dependencies:
  - 010-setup
inputs:
  - runs/run-2026-04-25T01-45/personas.json
  - runs/run-2026-04-25T01-45/graph.json
  - runs/run-2026-04-25T01-45/timeline.jsonl
outputs:
  - runs/run-2026-04-25T01-45/timeline.jsonl
checks:
  - id: timeline-grew
    description: At least one persona acted this tick (timeline.jsonl has rows with tick=1)
    cmd: "python3 -c \"import json,sys; lines=[json.loads(l) for l in open('runs/run-2026-04-25T01-45/timeline.jsonl') if l.strip()]; this_tick=[l for l in lines if l.get('tick')==1]; sys.exit(0 if len(this_tick)>=1 else 1)\"\n"
seeds:
  - type: nodejs
    path: ./wbs/wbs.js
vars:
  tick: 1
  tickNum: 1
  runId: run-2026-04-25T01-45
  scenario: misinfo
  populationSize: 10
  steps: 3
  recommender: hot-score
  seedPosts: 1
  seed: 42
  epochTemplateDir: /Users/minh/Documents/converge/examples/social-sim/.converge/playbooks/social-sim/wbs/templates/epoch
  taskId: 020-simulate
---

# Tick 1 — Simulate

WBS spawns **10** persona tasks (one per persona). Each
spawned task runs one persona for tick 1.

This task itself does not write to timeline.jsonl directly — its children do.
