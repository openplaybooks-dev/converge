---
id: "{{taskId}}"
title: "Tick {{tick}} — simulate"
description: >
  Spawn one task per persona. Each spawned task is one persona × one tick:
  read prior timeline + own bio, decide ONE action, append to timeline.jsonl.
dependencies:
  - 010-setup
inputs:
  - "runs/{{runId}}/personas.json"
  - "runs/{{runId}}/graph.json"
  - "runs/{{runId}}/timeline.jsonl"
outputs:
  - "runs/{{runId}}/timeline.jsonl"
seeds:
  - type: nodejs
    path: ./wb./seed.js
checks:
  - id: timeline-grew
    cmd: >
      python3 -c "import json,sys;
      lines=[json.loads(l) for l in open('runs/{{runId}}/timeline.jsonl') if l.strip()];
      this_tick=[l for l in lines if l.get('tick')=={{tickNum}}];
      sys.exit(0 if len(this_tick)>=1 else 1)"
    description: "At least one persona acted this tick (timeline.jsonl has rows with tick={{tickNum}})"
---

# Tick {{tick}} — Simulate

Seed spawns **{{populationSize}}** persona tasks (one per persona). Each
spawned task runs one persona for tick {{tick}}.

This task itself does not write to timeline.jsonl directly — its children do.
