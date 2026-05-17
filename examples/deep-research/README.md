# Deep Research

Multi-question research pipeline. One folder per question, one shared playbook, isolated outputs. Drop a `question.md`, run the playbook, get a sourced final report.

## Quick start

```bash
cd examples/deep-research
export ANTHROPIC_API_KEY=sk-...     # MiniMax key — see .env.example at repo root
scripts/run.sh icl-limits
```

`scripts/run.sh <slug>` reads `questions/<slug>/question.md` and writes artifacts to `questions/<slug>/output/`. The shipped `questions/icl-limits/output/` is a real prior run you can browse without executing anything.

## Add a new question

```bash
cp -r questions/_template questions/my-question
$EDITOR questions/my-question/question.md
scripts/run.sh my-question
```

## How it works

Wave-1 `000-bootstrap` spawns a flat 6-task linear chain, threading `questionDir` to every leaf via `--var`. Each task reads `<questionDir>/question.md` plus prior artifacts and writes its own under `<questionDir>/output/`. The `checks:` block in each TASK.md gates the chain — no advance until the artifact exists.

```
000-bootstrap
  └─▶ initial-search          ← broad survey, 8–15 sources, knowledge gaps
        └─▶ initial-gather    ← cataloged sources with clickable URLs
              └─▶ scope-identification  ← 3–5 prioritized sub-topics
                    └─▶ initial-aggregation  ← Phase-1 synthesis
                          └─▶ deep-research      ← per-sub-topic analysis
                                └─▶ final-report ← report with clickable refs
```

Three mechanics worth knowing:

- **`questionDir` threading.** `scripts/run.sh` exports `CONVERGE_VAR_QUESTIONDIR`; bootstrap's `vars:` block reads it; bootstrap passes it through `--var "questionDir=..."` to each spawn; leaf TASK.md files reference `{{questionDir}}/...` paths, rendered at spawn time.
- **Skill-driven leaves.** Phases 1–2 declare `skill: research-layer-aggregate`; the final report uses `skill: research-final-report`. Skill definitions live under `.converge/skills/`.
- **Real citations only.** Every TASK.md insists on real, working URLs (arXiv, DOI, publisher pages). Models are told to omit sources they can't link to rather than invent placeholders.

## Provider

Bundled `.converge/project.yml` routes the `claude` CLI through MiniMax's Anthropic-compatible endpoint (`MiniMax-M2.7`) by default. Override `ANTHROPIC_BASE_URL` / `ANTHROPIC_MODEL` in your shell to point at Anthropic direct, DeepSeek, or any other Anthropic-compatible endpoint. See [Switching providers](../../docs/guides/switch-providers.md).

## Artifacts

Per question, under `questions/<slug>/output/`:

```
1-initial/
  search.md          # broad survey
  sources.json       # cataloged sources with clickable URLs
  scope.json         # prioritized sub-topics
  summary.json       # Phase-1 synthesis
2-research/
  deep-research.md   # per-sub-topic deep analysis
3-report/
  final-report.md    # the deliverable (~20–25 KB, clickable references)
  summary.json       # report metadata
```

## Layout

```
examples/deep-research/
├── README.md
├── scripts/
│   ├── run.sh        # scripts/run.sh <slug>
│   └── clean.sh      # scripts/clean.sh <slug> [--hard]
├── questions/
│   ├── icl-limits/   # real prior run, committed
│   └── _template/    # placeholder to copy
└── .converge/
    ├── project.yml
    ├── skills/{research-final-report,research-layer-aggregate,web-search}/
    └── playbooks/deep-research/
        ├── playbook.yml
        ├── tasks/000-bootstrap/TASK.md
        └── templates/
            ├── 001-initial/tasks/{001..004}-*/TASK.md
            ├── 002-research-x/tasks/deep-research/TASK.md
            └── 003-report/tasks/001-final-report/TASK.md
```
