---
id: 03-script
title: Write the persona-voiced podcast script
depends_on:
  - 02-cluster
inputs:
  - persona.md
  - data/clusters.json
  - data/source/articles.json
checks:
  - id: script-exists
    cmd: bash -c 'test -f "$(ls -t episodes/*/script.md 2>/dev/null | head -1)"'
    description: Newest episode script.md exists
  - id: episode-json-exists
    cmd: bash -c 'test -f "$(ls -t episodes/*/episode.json 2>/dev/null | head -1)"'
    description: Newest episode episode.json exists
  - id: word-count-in-band
    cmd: "bash -c 'p=$(ls -td episodes/*/ 2>/dev/null | head -1); test -n \"$p\" && node -e \"const e=JSON.parse(require(\\\"fs\\\").readFileSync(\\\"${p}episode.json\\\"));process.exit(e.length_words>=900&&e.length_words<=1200?0:1)\"'"
    description: episode.json length_words in 900-1200 band
  - id: host-name-in-script
    cmd: bash -c 'p=$(ls -td episodes/*/ 2>/dev/null | head -1); test -n "$p" && grep -q -F "Alex Chen" "${p}script.md"'
    description: Host name appears in script.md (matches persona.md)
---

# Script

Write today's podcast episode. The previous task did the analysis; your job is to produce a script that sounds like the persona is genuinely reading from the day's news.

## Read the inputs

1. `persona.md` — host name, voice, target length, opening style, citation rules.
2. `data/clusters.json` — sorted by salience. Use the top 3–5 clusters.
3. `data/source/articles.json` — the source of truth for citation URLs. Look up an article by `id` to get its `url` and `source`.

## Pick the episode directory

Use today's date (`date -u +%F`) as the slug. If `episodes/<date>/` already exists, append `-1`, `-2`, … until you find a free name. `mkdir -p episodes/<slug>`.

## Write `script.md`

Structure (in this order, no skipped sections):

1. **Intro** — opens with the persona's "Opening style" from persona.md. State the host name from persona.md (e.g. "I'm Alex Chen") at least once in the intro. State today's date. Tease the cluster headlines.
2. **One segment per top cluster** (3–5 segments). Each segment:
   - Starts with a `## <Cluster headline>` heading.
   - 2–3 paragraphs of narration in the persona's voice. Lead with the news, then "why it matters," then (where warranted) one skeptical note.
   - At least one inline citation per segment, formatted as `[Source: <publication>](<url>)`. The URL must be exactly one of the URLs in `articles.json` for an article that belongs to this cluster. No invented URLs.
3. **Outro** — short sign-off in the persona's voice. Mention 1–2 themes to watch for tomorrow.

Aim for the word count band in persona.md (900–1200 words).

## Write `episode.json`

```json
{
  "title": "<one-line episode title you choose>",
  "date": "<YYYY-MM-DD>",
  "host": "<host name from persona.md>",
  "length_words": <integer word count of script.md, excluding citation URLs>,
  "clusters_used": ["<cluster id>", "..."],
  "sources_cited": <integer count of distinct (http URLs cited in script.md>
}
```

## Self-check before exiting

- `wc -w` on script.md (minus URLs) should land in the band.
- Every cluster_id in `clusters_used` must appear in `data/clusters.json`.
- Every URL in script.md must appear in `data/source/articles.json`.
