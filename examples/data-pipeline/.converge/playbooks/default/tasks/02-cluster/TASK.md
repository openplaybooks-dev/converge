---
id: 02-cluster
title: Semantically cluster and dedupe articles
depends_on:
  - 01-ingest
inputs:
  - data/source/articles.json
  - persona.md
outputs:
  - data/clusters.json
checks:
  - id: clusters-json-exists
    cmd: test -f data/clusters.json
    description: Clusters file exists
  - id: at-least-two-clusters
    cmd: "node -e \"const c=JSON.parse(require('fs').readFileSync('data/clusters.json'));process.exit((c.clusters||[]).length>=2?0:1)\""
    description: At least 2 clusters produced
  - id: every-cluster-has-articles
    cmd: "node -e \"const c=JSON.parse(require('fs').readFileSync('data/clusters.json'));process.exit(c.clusters.every(cl=>Array.isArray(cl.article_ids)&&cl.article_ids.length>=1)?0:1)\""
    description: Every cluster has at least one article_id
  - id: no-article-in-two-clusters
    cmd: "node -e \"const c=JSON.parse(require('fs').readFileSync('data/clusters.json'));const seen=new Set();for(const cl of c.clusters){for(const id of cl.article_ids){if(seen.has(id))process.exit(1);seen.add(id)}}process.exit(0)\""
    description: No article appears in more than one cluster
  - id: every-cluster-has-rationale
    cmd: "node -e \"const c=JSON.parse(require('fs').readFileSync('data/clusters.json'));process.exit(c.clusters.every(cl=>typeof cl.rationale==='string'&&cl.rationale.trim().length>=20)?0:1)\""
    description: Every cluster has a non-trivial rationale string
---

# Cluster

Group the articles in `data/source/articles.json` by *meaning*, not by string match. This is the step that earns the agent its keep — a script could only dedupe by title equality.

## Read the inputs

1. `data/source/articles.json` — the normalized articles.
2. `persona.md` — extract the "Interests" and "Avoid" lists. You will use these to (a) drop articles matching the "Avoid" list, (b) rank cluster salience.

## Cluster

Produce 3–6 clusters where each cluster groups articles that report on the same underlying event, release, paper, or theme. Examples of when articles belong together:

- Two outlets covering the same model release.
- Multiple opinion pieces responding to the same incident.
- A paper plus journalistic coverage of that paper.

For each cluster, decide:

- **`headline`** — one short sentence capturing the through-line (your wording, not a copy-paste from any source).
- **`topic`** — one of: `model-release`, `research`, `policy`, `infra`, `product`, `safety`, `tools`, `incident`, `other`.
- **`salience`** — integer 1–10. Boost for "Interests" matches in `persona.md`; lower for tangential items.
- **`article_ids`** — list of article ids from `articles.json`. Each id may appear in at most one cluster.
- **`rationale`** — 1–3 sentences explaining *why* these articles belong together. This field is the agent-reasoning surface; a generic "they share a topic" is not acceptable.

## Drop

Articles that match the persona's "Avoid" list, are pure hype with no substance, or are duplicates of clearly-superior coverage in another cluster go in `dropped`:

```json
{ "article_id": "...", "reason": "matched 'Avoid: cryptocurrency'" }
```

`reason` is mandatory and must be specific (not just `"dropped"`).

## Write

Write `data/clusters.json`:

```json
{
  "clustered_at": "<ISO 8601>",
  "clusters": [
    {
      "id": "<short-kebab-slug>",
      "headline": "...",
      "topic": "...",
      "salience": 8,
      "article_ids": ["abc123", "def456"],
      "rationale": "..."
    }
  ],
  "dropped": [
    { "article_id": "...", "reason": "..." }
  ]
}
```

Sort `clusters` by `salience` descending.

## Self-check before exiting

Run all five frontmatter checks. The hardest is `no-article-in-two-clusters` — if it fails, you have a duplicate article_id; fix the assignment before writing.
