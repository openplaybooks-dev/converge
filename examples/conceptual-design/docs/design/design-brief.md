# Design Brief

## 1. The Feeling — Reading a Book

You are designing a page from a beautiful, well-typeset reference book. Not a dashboard. Not a web app. A book — something you read top to bottom, at your own pace, with paper under your fingers.

### The Book Metaphor

The reader opens this and immediately feels calm. The structure is clear: chapters, sections, entries. Information flows down the page like prose, not across a grid like a dashboard. You scroll to read, not click to navigate.

### Surface — Paper on Paper

- **Background**: warm white (`#FAFAF8`), never pure white. The whole page is one warm surface.
- **Cards**: tasks and sections float as paper leaves resting on the page. Depth comes from **soft box-shadows only** (`0 1px 3px rgba(0,0,0,0.06)`) — never colored borders or hard outlines.
- **Airy padding**: generous space inside cards (24-32px). Rounded corners (8-12px). Nothing feels cramped.
- **Gaps between cards**: 16-24px of breathing room. Nothing touches its neighbor.
- **Separators**: when needed, use a 1px hairline in near-invisible warm gray (`#E8E5E0`). Never a solid border.

### Typography Is the Hierarchy

No icons needed to communicate structure. Font size, weight, and color do all the work:

- **Playbook title**: 28-32px, weight 600, near-black (`#1A1A1A`)
- **Gateway / chapter headings**: 20-24px, weight 600
- **Task titles**: 16-18px, weight 500
- **Descriptions**: 14px, weight 400, warm gray (`#6B6B6B`)
- **Body text**: 14-15px, weight 400, line-height 1.6-1.7, max-width 720px
- **Badges** (status, mode, duration): 10-12px, uppercase letter-spacing 0.5-1px, pill-shaped with subtle background tints

### Badges for Metadata

Status, task mode, and duration are shown as small **pill badges** — subtle, inline, never dominant:

- **Pass**: sage green background tint (`#E8F5E9`), dark green text
- **Running**: warm amber tint (`#FFF8E1`), dark amber text
- **Failed**: dusty rose tint (`#FFEBEE`), dark red text
- **Pending**: light gray tint (`#F5F5F5`), gray text
- **Task mode** (task / spawner / gateway): neutral tint, lowercase label

### Color — Ink on Paper

Think ink, not pixels. The palette is restrained:

- **Primary text**: near-black (`#1A1A1A`)
- **Secondary text**: warm gray (`#6B6B6B`)
- **Background**: warm white (`#FAFAF8`)
- **Card surface**: white (`#FFFFFF`) with shadow
- **Accent**: one warm color from the brand's design system, used sparingly — for links, active states, the occasional highlight. Never as a large block.
- Status colors are muted earth tones (see badges above), never saturated.

### Whitespace Is the Design

The page should be at least 40% whitespace. Content floats in generous space. Margins are wide. The eye rests between sections. Dense information packing is forbidden.

### Motion — Smooth and Lightweight

- All transitions: 200-300ms ease. No bouncy springs. No heavy animations.
- Hover: lifts a card by 1px shadow increase. Subtle.
- Expand/collapse: gentle height animation with opacity fade.
- Status change: background tint crossfade, nothing flashy.
- `prefers-reduced-motion`: respect it — disable all transitions.

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
