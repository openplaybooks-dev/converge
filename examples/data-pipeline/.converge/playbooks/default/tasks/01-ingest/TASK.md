---
id: 01-ingest
title: Ingest AI-news from RSS feeds
outputs:
  - data/source/feeds-snapshot.xml
  - data/source/articles.json
checks:
  - id: snapshot-exists
    cmd: test -f data/source/feeds-snapshot.xml
    description: RSS snapshot exists
  - id: articles-json-exists
    cmd: test -f data/source/articles.json
    description: Normalized articles JSON exists
  - id: enough-articles
    cmd: "node -e \"const a=JSON.parse(require('fs').readFileSync('data/source/articles.json'));process.exit((a.articles||[]).length>=10?0:1)\""
    description: At least 10 articles available for clustering
---

# Ingest

Run `scripts/ingest.cjs` to populate `data/source/feeds-snapshot.xml` and `data/source/articles.json`. The script reads `feeds.json` for the feed list and `INGEST_MODE` for snapshot-vs-live behavior.

## Step 1 — set mode

`scripts/run.sh` passes `--live` through as `CONVERGE_VAR_INGESTMODE=live`. Mirror that into `INGEST_MODE`:

```bash
INGEST_MODE="${CONVERGE_VAR_INGESTMODE:-snapshot}"
export INGEST_MODE
```

## Step 2 — run the ingester

```bash
node scripts/ingest.cjs
```

Behavior:

- **`INGEST_MODE=snapshot`** (default) — reads the committed `data/source/feeds-snapshot.xml`, parses every `<item>` / `<entry>`, writes `data/source/articles.json`. Fails if the snapshot is missing (with the message `run \`scripts/run.sh --live\` once to seed it`).
- **`INGEST_MODE=live`** — fetches every URL in `feeds.json` (15s timeout per feed), concatenates the bodies into `data/source/feeds-snapshot.xml` with `<!-- feed: <name> -->` markers, then parses as above. Feeds that error out are logged and skipped — as long as the surviving feeds yield ≥10 unique articles, the run succeeds.

The script handles HTML stripping, entity decoding, dedup by URL, and deterministic 12-char SHA-1 ids. Don't reimplement; just invoke it.

## Step 3 — self-check

Run the three frontmatter checks. If `enough-articles` fails, the live-mode feeds collectively returned <10 articles — re-run with a different `feeds.json` (more feeds, or higher `max_articles_per_feed`) rather than weakening the threshold.
