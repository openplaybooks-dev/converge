---
id: simulate-tick-{{tickNum}}
title: "Tick {{tick}} — simulate"
description: >-
  Spawn one task per persona. Each spawned task is one persona × one
  tick: read prior timeline + own bio, decide ONE action, write the
  post/feed/action artifacts.
mode: spawner
spawn:
  min_children: 1
depends_on:
  - "{{prevPhase}}"
vars:
  tickNum: "{{tickNum}}"
  tick: "{{tick}}"
  prevPhase: "{{prevPhase}}"
  runId: "{{runId}}"
  scenario: "{{scenario}}"
  populationSize: "{{populationSize}}"
  steps: "{{steps}}"
  recommender: "{{recommender}}"
  seedPosts: "{{seedPosts}}"
  rngSeed: "{{rngSeed}}"
---
<!-- MIGRATION (RFC 0021/0022): The legacy `converge spawn template`
     calls below should be replaced with a JSONL manifest writer:

       cat > "$CONVERGE_TASK_DIR/spawn.plan.jsonl" <<'EOF'
       {"id":"child-1","template":".../TASK.md","vars":{"k":"v"}}
       EOF

     The framework calls `converge apply` after the body when
     `mode: spawner` is declared (apply: auto, default).
     See docs/rfcs/0021-declarative-spawn-apply.md. -->


# Tick {{tick}} — Simulate

Read this run's `personas.json` and emit one `converge spawn template` line per persona. Tick = {{tickNum}}; runId = `{{runId}}`.

## Step 1 — Read the persona catalog

You have Bash + Read access. Read `runs/{{runId}}/personas.json` and emit the persona id + handle + bio for each entry:

```bash
jq -c '.[] | {id, handle, bio}' runs/{{runId}}/personas.json
```

## Step 2 — Emit one spawn line per persona

For each persona, emit exactly one `converge spawn template` line. Replace `<PID>`, `<HANDLE>`, `<BIO>` with the values from the persona record. Bios may contain spaces, quotes, or special characters — wrap each `--var` value in double quotes and escape inner double quotes with `\\\"`.

Example for personaId=p001, handle=@truthseeker_88, bio="Retired journalist who fact-checks viral claims":

```
converge spawn template --path .converge/playbooks/social-sim/templates/persona-tick/TASK.md --id t{{tickNum}}-p001 --var personaId=p001 --var personaHandle="@truthseeker_88" --var personaBio="Retired journalist who fact-checks viral claims" --var tickNum={{tickNum}} --var tick={{tick}} --var runId={{runId}} --var scenario={{scenario}} --var populationSize={{populationSize}} --var steps={{steps}} --var recommender={{recommender}} --var rngSeed={{rngSeed}}
```

Emit `{{populationSize}}` such lines — one per persona in `personas.json`. Persona-tick siblings have no inter-sibling dependencies (they run in parallel).

After emitting all spawn lines, return `done: true` with `reasoning: "spawned $N persona-tick children for tick {{tickNum}}"`.
