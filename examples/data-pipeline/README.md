# Data Pipeline — AI Daily News → Personal Podcast

Ingest AI news from RSS feeds, semantically cluster across sources, write a persona-voiced podcast script, validate against quality bands. Showcases work an agent can do that a 20-line Python script can't fake: clustering on meaning, narrative writing in a voice, judging the result against subjective bands.

## Quick start

```bash
cd examples/data-pipeline
export ANTHROPIC_API_KEY=sk-...     # MiniMax key — see .env.example at repo root

scripts/run.sh           # snapshot mode (deterministic; uses committed RSS capture)
scripts/run.sh --live    # re-fetch feeds via WebFetch and overwrite the snapshot
```

The shipped `data/source/feeds-snapshot.xml` and `episodes/<date>/` are a real prior run you can inspect without executing anything.

## How it works

Four tasks chained by `depends_on`. Each declares its `inputs:`, `outputs:`, and `checks:` in the TASK.md frontmatter — the runner re-attempts a task until its checks exit `0`, then advances.

```
ingest    → data/source/articles.json
            parse RSS, normalize {title, link, source, ts, summary}
cluster   → data/clusters.json
            semantic dedup · group by topic · rank salience · emit rationale
script    → episodes/<date>/script.md · episode.json
            persona-voiced narration, intro→clusters→outro, cite sources
validate  → episodes/<date>/validated.json
            ≥N sources cited, length in target band, all clusters present
```

The agent earns its keep in `02-cluster` and `03-script`: cross-source dedup by meaning, persona-faithful narration, and citation discipline are not script-replicable. `01-ingest` delegates to `scripts/ingest.cjs` — the mechanical work (RSS parsing, HTML stripping, deterministic ids) is deliberately scripted so it stays fast and free. `04-validate` runs deterministic gates and emits an explicit report — the convergence target.

The playbook's `goals:` block declares the run done when the newest `episodes/*/validated.json` reports `valid:true`. If any check fails, the runner retries the task up to `maxTaskAttempts: 3`.

## Customize

Two files at the example root are the knobs:

- **`persona.md`** — host name, voice, target episode length, opening style, topics of interest, topics to avoid. The agent reads this as the source of truth for *who* the podcast is for.
- **`feeds.json`** — list of 3–5 RSS feed URLs and `max_articles_per_feed`. Stable defaults included (Hacker News, The Verge AI, MIT Tech Review AI, arXiv cs.AI).

Edit either; re-run `scripts/run.sh --live` to capture a fresh snapshot, then re-run plain `scripts/run.sh` for deterministic iteration on the same news.

## Provider

Bundled `.converge/project.yml` routes the `claude` CLI through MiniMax's Anthropic-compatible endpoint (`MiniMax-M2.7`) by default. Override `ANTHROPIC_BASE_URL` / `ANTHROPIC_MODEL` in your shell to point at Anthropic direct, DeepSeek, or any other Anthropic-compatible endpoint. See [Switching providers](../../docs/guides/switch-providers.md).

## Artifacts

```
data/source/
  feeds-snapshot.xml    # raw RSS bodies concatenated with <!-- feed: name --> separators
  articles.json         # normalized records: { id, title, url, source, published_at, raw_summary }
data/
  clusters.json         # { clusters: [{ id, headline, topic, salience, article_ids, rationale }], dropped: [...] }
episodes/<YYYY-MM-DD>/
  script.md             # the deliverable: persona-voiced podcast script with inline citations
  episode.json          # { title, date, host, length_words, clusters_used, sources_cited }
  validated.json        # { valid, checks: [{ name, pass, detail }] }
```

## Audio (optional)

The playbook produces `script.md`; audio generation is a separate post-run step. Two paths:

**MiniMax TTS HD (bundled).** `scripts/tts.sh` calls MiniMax's `speech-02-hd` voice on the newest episode and writes `episode.mp3` next to `script.md`. Uses the same `ANTHROPIC_API_KEY` (which is your MiniMax key) — no extra credentials.

```bash
scripts/tts.sh                                 # newest episode, default voice
scripts/tts.sh episodes/2026-05-17             # specific episode
VOICE_ID=presenter_male scripts/tts.sh         # override voice
```

The script auto-strips citations and markdown, chunks on paragraph boundaries (MiniMax caps ~5000 chars/call), and concatenates the MP3 frames. Default voice is `English_radiant_girl`; see [MiniMax voice catalog](https://platform.minimaxi.com/document/T2A%20V2) for alternatives. MP3s are gitignored — regenerate locally.

**Quick local preview (macOS).** No API key:

```bash
say -v Daniel -f episodes/<date>/script.md -o episode.aiff
```

**Other providers.** `script.md`'s `##` headings and citation-free prose are TTS-friendly for ElevenLabs / OpenAI TTS / Google Cloud TTS as well.

## Layout

```
examples/data-pipeline/
├── README.md
├── .gitignore
├── persona.md            # host profile — edit to taste
├── feeds.json            # RSS feed URLs
├── scripts/
│   ├── run.sh            # scripts/run.sh [--live]
│   ├── clean.sh          # scripts/clean.sh [--hard]
│   ├── ingest.cjs        # RSS parser called by 01-ingest (snapshot + live modes)
│   └── tts.sh            # optional: script.md → episode.mp3 via MiniMax TTS HD
├── data/
│   ├── source/
│   │   ├── feeds-snapshot.xml
│   │   └── articles.json
│   └── clusters.json
├── episodes/             # one folder per run, dated
│   └── <YYYY-MM-DD>/
│       ├── script.md
│       ├── episode.json
│       └── validated.json
└── .converge/
    ├── project.yml
    └── playbooks/default/
        ├── playbook.yml
        └── tasks/
            ├── 01-ingest/TASK.md
            ├── 02-cluster/TASK.md
            ├── 03-script/TASK.md
            └── 04-validate/TASK.md
```
