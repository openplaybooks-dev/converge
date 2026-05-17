---
id: 04-validate
title: Validate the episode against quality gates
depends_on:
  - 03-script
inputs:
  - persona.md
  - data/clusters.json
checks:
  - id: validated-exists
    cmd: bash -c 'test -f "$(ls -t episodes/*/validated.json 2>/dev/null | head -1)"'
    description: Newest episode validated.json exists
  - id: valid-true
    cmd: bash -c 'p=$(ls -t episodes/*/validated.json 2>/dev/null | head -1); test -n "$p" && node -e "const v=JSON.parse(require(\"fs\").readFileSync(\"$p\"));process.exit(v.valid===true?0:1)"'
    description: validated.json reports valid:true
---

# Validate

Run the quality gates on the most recent episode and write a report.

## Find the target

`EPISODE_DIR=$(ls -td episodes/*/ | head -1)` — the newest episode directory. All paths below are relative to it.

## Run the gates

Each gate is a deterministic shell check you must run and record. Do not skip any.

1. **`persona-name-present`** — the host name from `persona.md` appears in `script.md`. Use `grep -q -F "<host name>" "$EPISODE_DIR/script.md"`.
2. **`word-count-in-band`** — running `wc -w "$EPISODE_DIR/script.md"` (minus URLs) yields a count in the band from `persona.md` (default 900–1200). The `episode.json.length_words` value should match this count within ±20.
3. **`sources-cited-matches`** — the number of distinct `(https?://…)` URLs in `script.md` equals `episode.json.sources_cited`.
4. **`urls-resolve-to-articles`** — every URL in `script.md` appears in `data/source/articles.json`. (Use `node` to load both and intersect.)
5. **`clusters-used-exist`** — every entry in `episode.json.clusters_used` matches a `cluster.id` in `data/clusters.json`.
6. **`every-cluster-segment-cited`** — for each cluster in `episode.json.clusters_used`, at least one of that cluster's `article_ids` (looked up via `clusters.json` → `articles.json`) has its URL cited in `script.md`.

## Write the report

Write `$EPISODE_DIR/validated.json`:

```json
{
  "validated_at": "<ISO 8601>",
  "valid": true,
  "checks": [
    { "name": "persona-name-present",      "pass": true,  "detail": "found 'Alex Chen' at line 3" },
    { "name": "word-count-in-band",        "pass": true,  "detail": "1023 words (band 900-1200)" },
    { "name": "sources-cited-matches",     "pass": true,  "detail": "5 urls in script == sources_cited" },
    { "name": "urls-resolve-to-articles",  "pass": true,  "detail": "5/5 urls present in articles.json" },
    { "name": "clusters-used-exist",       "pass": true,  "detail": "4/4 cluster ids found" },
    { "name": "every-cluster-segment-cited","pass": true, "detail": "4/4 clusters have at least one cited url" }
  ]
}
```

Set `valid` to `false` and `pass: false` on any gate that fails, with `detail` describing the failure. Then return — the framework's checks will catch `valid !== true` and the convergence loop will retry upstream tasks.

## Self-check before exiting

`node -e "const v=JSON.parse(require('fs').readFileSync(process.env.EPISODE_VALIDATED));process.exit(v.valid===true?0:1)"` where `EPISODE_VALIDATED` is the path you just wrote. If this exits non-zero, your gates caught a real problem — surface it; do not weaken a gate to pass.
