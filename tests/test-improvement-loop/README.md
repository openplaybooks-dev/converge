# improvement-loop-test

A simplified test of the improvement-loop concept.

## Flow

1. `01-improve-loop` (converger) runs 10 waves sequentially
2. Each wave: `iteration` (spawner) runs `propose → implement`
   - `propose`: writes `rfc.md` for the wave
   - `implement`: reads `rfc.md`, writes `implemented.txt` + `score.txt`
3. After wave 10: `compare` step evaluates all scores and writes `winners.json`

## Artifacts produced

```
improve-test/
├── journal.md          # one entry per wave + winner
├── winners.json        # { best_wave, best_score, total_waves }
├── wave-001/
│   ├── rfc.md
│   ├── implemented.txt
│   └── score.txt
├── wave-002/
└── ...
```

## Seed

`improve-test/` directory is created on first run. Each wave's `implement` step
writes a score (wave number in this simplified test) so `compare` has something to evaluate.