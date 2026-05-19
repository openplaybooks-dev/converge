---
id: tick-{{tickNum}}
title: "Tick {{tick}}"
mode: spawner
spawn:
  min_children: 1
depends_on:
  - "{{prevTick}}"
vars:
  tickNum: "{{tickNum}}"
  tick: "{{tick}}"
  prevTick: "{{prevTick}}"
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


# Tick {{tick}} — Epoch

Spawn this tick's three phase children, chained via `--depends-on`. Emit exactly these three `converge spawn template` lines, substituting values from this task's frontmatter vars:

```
converge spawn template --path .converge/playbooks/social-sim/templates/010-setup/TASK.md --id setup-tick-{{tickNum}} --var tickNum={{tickNum}} --var tick={{tick}} --var runId={{runId}} --var scenario={{scenario}} --var populationSize={{populationSize}} --var steps={{steps}} --var recommender={{recommender}} --var seedPosts={{seedPosts}} --var rngSeed={{rngSeed}}
converge spawn template --path .converge/playbooks/social-sim/templates/020-simulate/TASK.md --id simulate-tick-{{tickNum}} --var tickNum={{tickNum}} --var tick={{tick}} --var runId={{runId}} --var scenario={{scenario}} --var populationSize={{populationSize}} --var steps={{steps}} --var recommender={{recommender}} --var seedPosts={{seedPosts}} --var rngSeed={{rngSeed}} --var prevPhase=setup-tick-{{tickNum}}
converge spawn template --path .converge/playbooks/social-sim/templates/030-analyze/TASK.md --id analyze-tick-{{tickNum}} --var tickNum={{tickNum}} --var tick={{tick}} --var runId={{runId}} --var scenario={{scenario}} --var populationSize={{populationSize}} --var steps={{steps}} --var recommender={{recommender}} --var seedPosts={{seedPosts}} --var rngSeed={{rngSeed}} --var prevPhase=simulate-tick-{{tickNum}}
```

The setup phase has no `prevPhase` — it depends only on this tick task itself (via the template's frontmatter `depends_on: [tick-{{tickNum}}]`). Simulate depends on setup; analyze depends on simulate.

On later waves emit no commands and return `done: true`.
