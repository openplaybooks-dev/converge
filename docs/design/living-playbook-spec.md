# Living Playbook — Specification

## 1. The Feeling

This is a handbook. A structured, thoughtful reference that shows work organized into sections and tasks — like an employee onboarding guide, a field manual, a craftsman's notebook.

The reader opens it and immediately understands the structure: what work exists, how it's organized, what each piece does, and where things stand. It's not a dashboard. It's not a timeline. It's a document that you can read, explore, and understand at your own pace.

**Paper.** Every surface feels like paper. Warm, off-white, with weight. Sections float with soft shadows — leaves of paper resting on paper. The depth is gentle.

**Readability above everything.** Prose paragraphs, human-readable labels. The eye flows down the page like reading a well-typeset book. Generous line height, measured line length, quiet margins.

**Shimmer, not flash.** Active work carries a soft shimmer. Completion arrives as a gentle highlight that fades. Nothing demands attention.

**Color is informative, not decorative.** Status communicated through considered color: warm accent for active, muted for done, soft red for errors. Think ink, not pixels.

**Clean.** Minimize visual noise. Let the design system guide what containers, surfaces, and separators are appropriate — but always lean toward less. White space is a powerful organizing tool. Prefer breathing room over dense packing.

**Breathing room.** Generous margins, generous spacing between elements. Nothing crowds. The page breathes.

**Seamless.** No jarring transitions. Everything belongs on one continuous surface.

**Craft it like a masterpiece.** Use every tool: inline SVG, custom icons, decorative glyphs, progress indicators, micro-interactions, multiple view modes, spring physics. Every pixel intentional.

---

## 2. Data Model

### Playbook

| Field | Type | Description |
|---|---|---|
| `name` | string | Title |
| `description` | string | What this playbook does |
| `tasks` | Task[] | Root-level tasks (the tree) |

### Task (recursive, up to 5 levels deep)

Every task is a node in a composable tree. Tasks nest inside other tasks freely.

| Field | Type | Description |
|---|---|---|
| `id` | string | Unique identifier |
| `title` | string | Human-readable name |
| `description` | string | Brief explanation of what this task does |
| `body` | markdown | Full instructions — methodology, steps, constraints. Can be long. |
| `mode` | enum | `task`, `spawner`, `gateway` |
| `inputs` | string[] | What this task reads (file paths or artifact names) |
| `outputs` | string[] | What this task produces |
| `checks` | Check[] | Verification criteria |
| `children` | Task[] | Nested child tasks (recursive) |
| `depends_on` | string[] | Task IDs that must complete first |
| `status` | enum | Runtime: `pending`, `running`, `pass`, `failed`, `blocked` |
| `duration_ms` | number | How long this task took |
| `attempts` | number | How many times tried |

### Task Modes

| Mode | Role | Description |
|---|---|---|
| `task` | Worker | Does actual work. Runs its body, produces outputs, checks pass/fail. |
| `spawner` | Factory | Creates child tasks at runtime. Discovers what work is needed and generates it. |
| `gateway` | Container | Structural grouping — like a chapter heading or section cover. Organizes children. |

### Check

| Field | Type | Description |
|---|---|---|
| `id` | string | Unique within task |
| `description` | string | Human-readable label |
| `passed` | boolean? | `true` = passed, `false` = failed, `null` = pending |

---

## 3. Structure & Nesting

Tasks compose recursively up to 5 levels:

```
Level 0: Gateway (section/chapter)
  Level 1: Spawner or Gateway (subsection)
    Level 2: Task or Gateway (task group)
      Level 3: Task (individual task)
        Level 4: Task (subtask)
```

Each level should be visually distinct but part of the same surface. Deeper levels get progressively less visual weight — smaller type, tighter spacing, less elevation — but remain fully readable.

**Gateway tasks** are structural. They don't do work themselves — they organize their children into meaningful groups. Think of them as chapter headings in the handbook.

**Spawner tasks** are dynamic. They represent work that discovers its own scope at runtime — "for each item in the catalog, generate a task." Their children appear as they're created.

**Task-mode tasks** are the work units. They have a body (instructions), produce outputs, and pass or fail their checks.

---

## 4. What Each Task Shows

Every task in the handbook displays:

- **Title** — always visible, the primary identifier
- **Description** — brief, always visible at shallow depths
- **Mode indicator** — subtle badge or icon showing task/spawner/gateway
- **Status** — visual state: pending, running, pass, failed, blocked
- **Inputs/Outputs** — what it reads and produces (human-readable names)
- **Checks** — verification results as pass/fail with descriptions
- **Children** — nested tasks rendered inside
- **Body** — the full markdown instructions, accessible on interaction (click, expand, panel, modal — design decides how)

---

## 5. Content Rules

- Show human-readable descriptions, not file paths or shell commands
- Task bodies are markdown rendered with good typography
- Status is visual (color, icon), not just text
- Nesting is clear through indentation, containment, or progressive disclosure
- The handbook should feel complete even at a glance — scannable structure with drill-down depth

---

## 6. Example Data

```
Playbook: "AI News Data Pipeline"

├── 01-ingest (task)
│   title: "Ingest AI-news from RSS feeds"
│   description: "Fetch and normalize articles from configured RSS sources"
│   inputs: [feeds.json]
│   outputs: [feeds-snapshot.xml, articles.json]
│   checks: [RSS snapshot exists, Normalized JSON exists, ≥10 articles]
│   status: pass, duration: 439ms
│
├── 02-cluster (task)
│   title: "Semantically cluster and dedupe articles"
│   description: "Group related articles, remove duplicates, assign rationale"
│   inputs: [articles.json]
│   outputs: [clusters.json]
│   checks: [Clusters file exists, ≥2 clusters, No overlapping articles]
│   status: pass, duration: 573ms
│   depends_on: [01-ingest]
│
├── 03-script (task)
│   title: "Write the persona-voiced podcast script"
│   description: "Generate a 900-1200 word podcast episode from clustered articles"
│   inputs: [clusters.json, persona.md]
│   outputs: [script.md, episode.json]
│   checks: [Script exists, Episode JSON exists, Word count in range]
│   status: pass, duration: 56s
│   depends_on: [02-cluster]
│
└── 04-validate (task)
    title: "Validate the episode against quality gates"
    description: "Run quality checks on the generated episode"
    inputs: [script.md, episode.json]
    outputs: [validated.json]
    checks: [Validated JSON exists, Reports valid:true]
    status: pass, duration: 47s
    depends_on: [03-script]
```

This is real data from an actual Converge run. The concept should visualize this exact pipeline.

For demonstrating nesting, add a gateway wrapper:

```
Playbook: "AI News Data Pipeline"

├── preparation (gateway)
│   ├── 01-ingest (task)
│   └── 02-cluster (task)
│
└── production (gateway)
    ├── 03-script (task)
    └── 04-validate (task)
```
