# Needs: epoch-002/010-setup

## Description

Ensure persona cohort, follow graph, and seed posts exist. Idempotent: only generates on tick 1; later ticks just verify the files are present.


## Expected Outputs

- `runs/run-2026-04-25T01-45/personas.json`
- `runs/run-2026-04-25T01-45/graph.json`
- `runs/run-2026-04-25T01-45/timeline.jsonl`
- `vault/runs/run-2026-04-25T01-45/overview.md`
- `vault/runs/run-2026-04-25T01-45/personas/p001.md`

## Checks

- **personas-present**: Persona cohort exists
- **personas-count**: Persona count matches populationSize
- **graph-present**: Follow graph exists
- **graph-valid**: graph.json has a `follows` map
- **timeline-file-exists**: timeline.jsonl exists (touched if missing)
- **vault-overview**: Obsidian vault overview note exists
- **vault-persona-notes**: One persona vault note per persona
