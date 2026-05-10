# PLAN: Name Exploration — Creative Agency Naming Sprint

## Goal

Find a real product name the team can be proud of: distinctive, ownable, pronounceable, npm-publishable, and grounded in Converge's product truth.

This is not a random-name-generator playbook. It is structured like a premium naming agency engagement:

1. **Taste first** — calibrate against excellent developer brands and define what premium feels like.
2. **Strategy and white-space** — define product truth, audience, competitive crowding, opportunity territories, and rejection rules.
3. **Diverge hard** — generate hundreds of raw names across independent creative territories, with at least 75 raw ideas per territory.
4. **Critique ruthlessly** — kill weak names, identify winning spaces, and write a second-round brief.
5. **Go deeper** — generate a second round from the strongest, strangest usable spaces.
6. **Converge rigorously** — validate npm, assess collision risk, score with penalties, stress-test narrative fit, and shortlist.
7. **Recommend decisively** — present a boardroom-ready naming case.

## Creative Standard

A good candidate should feel like it could sit beside names such as Vite, Stripe, Linear, Prisma, Temporal, Dagster, Vercel, Svelte, Bun, or Raycast: simple, ownable, emotionally crisp, and technically credible.

Avoid:

- generic AI names: AgentFlow, AutoTask, LangSomething, CrewSomething
- literal plumbing names: DagRunner, TaskForge, CheckFlow
- random SaaS mush: Avelo, Eluno, Imara unless it has a real strategic reason
- copied prompt examples
- names that require a paragraph to justify

## Pipeline

| Phase | Purpose |
|---|---|
| `00-taste-calibration` | Analyze premium developer names and build taste principles. |
| `00-competitive-map` | Map crowded naming zones and creative white space. |
| `01-research` | Build a brand brief: product truth, positioning, audience, name criteria, forbidden zones. |
| `02-generate/tasks/*` | Ten independent creative directors each explore one territory. |
| `02-generate` | Merge, dedupe, normalize, and remove obvious weak names. |
| `02b-creative-critique` | Senior naming-partner kill pass with survivor and rejection pools. |
| `02c-second-round-generation` | Deeper generation from strongest territories and unexpected spaces. |
| `02d-final-merge` | Merge survivors and second-round names into final pool. |
| `03-validate` | npm/package/scope availability and syntax validation. |
| `03b-market-collision-check` | Qualitative ownability, domain/GitHub/trademark risk notes. |
| `04-evaluate` | Stricter agency scorecard with penalties and score spread. |
| `04b-narrative-test` | Stress-test top names in real product copy and CLI usage. |
| `05-rank` | Boardroom report with shortlist, tradeoffs, killed names, and recommendation. |

## Strategy Territories

1. Semantic field: converge/diverge/check/run/proof/plan/join/finish.
2. Craft metaphors: weaving, joinery, metalwork, navigation, music, architecture.
3. Classical roots: short modern derivatives, not dusty academic compounds.
4. npm/dev-tool pattern study: learn naming patterns, then create original names.
5. Competitive AI whitespace: avoid crowded language/agent/crew/chain names.
6. Phonetic aesthetics: sound-first names, but examples are forbidden.
7. Brand blending: controlled coinage from product truths.
8. Abstract evocative: real words with emotional charge.
9. Myth/narrative: story-rich but modern and spellable.
10. Science/nature: networks, alignment, branching, execution, verification.

## Output Contract

Every final candidate must include:

```json
{
  "name": "...",
  "rationale": "...",
  "category": "...",
  "strategy_source": "...",
  "territory": "...",
  "pronunciation": "...",
  "why_creative": "...",
  "risk": "..."
}
```

Each strategy also writes a raw idea file with at least 75 raw ideas. The second round writes at least 120 additional raw ideas. Final selected candidates are 12-20 per strategy.
