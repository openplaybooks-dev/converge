# Checks: epoch-001/010-setup

All checks must pass for this task to be considered complete.
Run each command from the project root. Fix failures and re-run.

## personas-present
**Description**: Persona cohort exists
**Command**: `test -f runs/run-001/personas.json`

## personas-count
**Description**: Persona count matches populationSize
**Command**: `python3 -c "import json,sys; d=json.load(open('runs/run-001/personas.json')); sys.exit(0 if isinstance(d,list) and len(d)==10 else 1)"
`

## graph-present
**Description**: Follow graph exists
**Command**: `test -f runs/run-001/graph.json`

## graph-valid
**Description**: graph.json has a `follows` map
**Command**: `python3 -c "import json,sys; d=json.load(open('runs/run-001/graph.json')); sys.exit(0 if 'follows' in d and isinstance(d['follows'],dict) else 1)"
`

## timeline-file-exists
**Description**: timeline.jsonl exists (touched if missing)
**Command**: `touch runs/run-001/timeline.jsonl && test -f runs/run-001/timeline.jsonl`

## vault-overview
**Description**: Obsidian vault overview note exists
**Command**: `test -f vault/runs/run-001/overview.md`

## vault-persona-notes
**Description**: One persona vault note per persona
**Command**: `test "$(ls vault/runs/run-001/personas/*.md 2>/dev/null | wc -l | tr -d ' ')" = "10"
`