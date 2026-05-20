---
id: 000-bootstrap
title: Social simulation — bootstrap
mode: spawner
spawn:
  min_children: 1
vars:
  scenario: "${scenario}"
  populationSize: "${populationSize}"
  steps: "${steps}"
  recommender: "${recommender}"
  seedPosts: "${seedPosts}"
  rngSeed: "${rngSeed}"
  runId: "${runId}"
---
<!-- MIGRATION (RFC 0021/0022): The legacy `converge spawn template`
     calls below should be replaced with a JSONL manifest writer:

       cat > "$CONVERGE_TASK_DIR/spawn.plan.jsonl" <<'EOF'
       {"id":"child-1","template":".../TASK.md","vars":{"k":"v"}}
       EOF

     The framework calls `converge apply` after the body when
     `mode: spawner` is declared (apply: auto, default).
     See docs/rfcs/0021-declarative-spawn-apply.md. -->


# Bootstrap

Wave-1 entry point. Decide the run id, create per-run directories, then emit one `converge spawn template` line per simulation tick. Each line spawns an `epoch` task; the template's own `depends_on: ['{{prevTick}}']` field chains tick-N to the previous tick. Later waves emit no commands and return `done: true`.

## Step 1 — Decide the run id

You have Bash access. Run this snippet to capture the values you'll inline below:

```bash
if [ -f .converge/.run-id ]; then
  RUNID="$(cat .converge/.run-id)"
else
  RUNID="run-$(date -u +%Y-%m-%dT%H-%M)"
fi
mkdir -p .converge "runs/${RUNID}" \
  "vault/runs/${RUNID}/posts" \
  "vault/runs/${RUNID}/feeds" \
  "vault/runs/${RUNID}/personas" \
  "vault/runs/${RUNID}/actions" \
  "vault/runs/${RUNID}/ticks" \
  vault/reports
echo "$RUNID" > .converge/.run-id

cat <<EOF
RUNID=$RUNID
STEPS=${CONVERGE_VAR_STEPS:-3}
SCENARIO=${CONVERGE_VAR_SCENARIO:-misinfo}
POP=${CONVERGE_VAR_POPULATIONSIZE:-10}
REC=${CONVERGE_VAR_RECOMMENDER:-hot-score}
SP=${CONVERGE_VAR_SEEDPOSTS:-1}
SD=${CONVERGE_VAR_RNGSEED:-42}
EOF
```

## Step 2 — Emit the tick chain

Emit one `converge spawn template` line per tick N from 1 to STEPS. Replace `<RUNID>`, `<STEPS>`, `<SCENARIO>`, `<POP>`, `<REC>`, `<SP>`, `<SD>` with the values printed above. The `prevTick` var chains ticks: tick 1's prevTick is the bootstrap id `000-bootstrap`; tick N (N>1) has prevTick = `tick-(N-1)`.

For example, if STEPS=3, RUNID=run-2026-05-17T18-15, SCENARIO=misinfo, POP=10, REC=hot-score, SP=1, SD=42, emit exactly these three lines:

```
converge spawn template --path .converge/playbooks/social-sim/templates/epoch/TASK.md --id tick-1 --var tickNum=1 --var tick=tick-01 --var prevTick=000-bootstrap --var runId=run-2026-05-17T18-15 --var scenario=misinfo --var populationSize=10 --var steps=3 --var recommender=hot-score --var seedPosts=1 --var rngSeed=42
converge spawn template --path .converge/playbooks/social-sim/templates/epoch/TASK.md --id tick-2 --var tickNum=2 --var tick=tick-02 --var prevTick=tick-1 --var runId=run-2026-05-17T18-15 --var scenario=misinfo --var populationSize=10 --var steps=3 --var recommender=hot-score --var seedPosts=1 --var rngSeed=42
converge spawn template --path .converge/playbooks/social-sim/templates/epoch/TASK.md --id tick-3 --var tickNum=3 --var tick=tick-03 --var prevTick=tick-2 --var runId=run-2026-05-17T18-15 --var scenario=misinfo --var populationSize=10 --var steps=3 --var recommender=hot-score --var seedPosts=1 --var rngSeed=42
```

On later waves (wave > 1), emit no commands and return `done: true`.
