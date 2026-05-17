---
id: "{{taskId}}"
title: "Initial Gather"
skill: research-layer-aggregate
vars:
  questionDir:
depends_on:
  - 001-initial-search
checks:
  - id: sources-written
    cmd: "test -f {{questionDir}}/output/1-initial/sources.json"
    description: "sources.json exists"
---

# Initial Gather

Read `{{questionDir}}/question.md` and the previous step's output at `{{questionDir}}/output/1-initial/search.md`.

Expand the source list. Write `{{questionDir}}/output/1-initial/sources.json` — a JSON array where each entry has:

```json
{
  "id": "SRC-001",
  "title": "...",
  "authors": ["..."],
  "year": 2023,
  "venue": "...",
  "type": "paper|book|article",
  "url_or_doi": "https://arxiv.org/abs/... or https://doi.org/...",
  "relevance": "1-2 sentences on why this source matters for the question"
}
```

Aim for 12-20 real sources. Use only sources you genuinely know about — no fabricated citations.

**URL requirement**: every entry must have a real, working `url_or_doi`. Prefer arXiv (`https://arxiv.org/abs/<id>`) or DOI (`https://doi.org/<doi>`) for papers; publisher URL for books; canonical post URL otherwise. If you don't know a real URL for a source, **omit that source entirely** — never invent URLs or use placeholders.

Use the `Write` tool to create the file.
