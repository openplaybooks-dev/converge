# Task Journal: 02-cast/002-voice-casting

## Current attempt — `attempts/01/`

| File | Purpose |
|------|---------|
| `NEEDS.md` | Needs spec (inputs, outputs, checks defined) |
| `NEEDS.result.md` | Input evaluation (files found, blocked/ready) |
| `TASK.md` | Task instructions for the AI |
| `CHECK.md` | Check spec (ids, commands) |
| `CHECK.result.md` | Check outcomes after execution (pass/fail, output state) |
| `LEARN.md` | Failure analysis from previous attempt (attempt 2+) |
| `data/needs.json` | Machine-readable needs (inputs, outputs, blocked state) |
| `data/check.json` | Machine-readable check definitions |
| `data/facts.json` | Facts collected during execution |

## How to run / resume

```bash
pnpm converge run --step   # run next pending task
pnpm converge run          # run all remaining tasks
```

## Verify checks manually

```bash
  test -s voices.json
  node -e "JSON.parse(require('fs').readFileSync('voices.json','utf8'))"
  node -e "const c=require('./characters.json');const v=require('./voices.json');const ids=new Set(v.map(x=>x.id));for(const x of c){if(x.voice_spec_id&&!ids.has(x.voice_spec_id)){process.exit(1)}}"
```