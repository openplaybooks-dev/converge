# Task: 03-ia

# IA manifest

Single source of truth for the docs sidebar. The landing-page playbook
(Starlight `/docs` route) reads this file directly. Don't duplicate IA data
elsewhere.

## File: `docs/_ia.json`

```json
{
  "$schema": "./_ia.schema.json",
  "siteTitle": "Converge",
  "groups": [
    {
      "label": "Getting Started",
      "slug": "getting-started",
      "pages": [
        { "kind": "page", "slug": "getting-started/why-converge",            "title": "Why Converge" },
        { "kind": "page", "slug": "getting-started/install",                 "title": "Install" },
        { "kind": "page", "slug": "getting-started/your-first-playbook",     "title": "Your first playbook" },
        { "kind": "page", "slug": "getting-started/from-problem-to-playbook","title": "From your problem to a playbook" },
        { "kind": "page", "slug": "getting-started/next-steps",              "title": "Next steps" }
      ]
    },
    {
      "label": "Examples",
      "slug": "examples",
      "pages": [
        { "kind": "page", "slug": "examples/index",   "title": "Examples gallery" },
        { "kind": "glob", "glob": "examples/learning/*",        "label": "Learning",        "sort": "alpha" },
        { "kind": "glob", "glob": "examples/software/*",        "label": "Building software","sort": "alpha" },
        { "kind": "glob", "glob": "examples/research/*",        "label": "Research",         "sort": "alpha" },
        { "kind": "glob", "glob": "examples/creative/*",        "label": "Creative + simulation", "sort": "alpha" },
        { "kind": "glob", "glob": "examples/security/*",        "label": "Security",         "sort": "alpha" },
        { "kind": "glob", "glob": "examples/agent-protocol/*",  "label": "Agent protocol",   "sort": "alpha" }
      ]
    },
    {
      "label": "Guides",
      "slug": "guides",
      "pages": [
        { "kind": "page", "slug": "guides/articulate-your-goal",        "title": "Articulating a goal (non-technical)" },
        { "kind": "page", "slug": "guides/generate-something-repeatedly","title": "Generate something repeatedly" },
        { "kind": "page", "slug": "guides/research-a-topic-deeply",     "title": "Research a topic deeply" },
        { "kind": "page", "slug": "guides/build-a-software-project",    "title": "Build a software project" },
        { "kind": "page", "slug": "guides/switch-providers",            "title": "Switch providers" },
        { "kind": "page", "slug": "guides/read-the-journal",            "title": "Read the journal (LEARN.md & events)" },
        { "kind": "page", "slug": "guides/customize-an-example",        "title": "Customize an example" }
      ]
    },
    {
      "label": "Troubleshooting",
      "slug": "troubleshooting",
      "pages": [
        { "kind": "page", "slug": "troubleshooting/index",             "title": "Troubleshooting index" },
        { "kind": "glob", "glob": "troubleshooting/*",                 "label": "Symptoms",       "sort": "numeric" }
      ]
    },
    {
      "label": "Reference",
      "slug": "reference",
      "pages": [
        { "kind": "glob", "glob": "reference/cli/*",       "label": "CLI",        "sort": "alpha" },
        { "kind": "page", "slug": "reference/playbook-yml","title": "playbook.yml" },
        { "kind": "page", "slug": "reference/task-md",     "title": "TASK.md" },
        { "kind": "page", "slug": "reference/project-yml", "title": "project.yml" },
        { "kind": "page", "slug": "reference/core-api",    "title": "@converge/core" }
      ]
    },
    {
      "label": "Concepts",
      "slug": "concepts",
      "pages": [
        { "kind": "page", "slug": "concepts/gap-driven-model",   "title": "Gap-driven model" },
        { "kind": "page", "slug": "concepts/filesystem-as-plan", "title": "Filesystem-as-plan" },
        { "kind": "page", "slug": "concepts/self-correction",    "title": "Self-correction" }
      ]
    }
  ],
  "footer": {
    "links": [
      { "label": "GitHub",   "href": "https://github.com/myanlabs/converge" },
      { "label": "Examples", "href": "https://github.com/myanlabs/converge/tree/main/examples" }
    ]
  }
}
```

## `kind` semantics

- `kind: "page"` — single doc page at `slug`. Sidebar shows its `title`.
- `kind: "glob"` — directory of pages (e.g. CLI commands, examples by
  category, troubleshooting symptoms). Starlight's autogenerate consumes
  the glob; sidebar label uses `label`. Children sorted by `sort` (`alpha`
  or `numeric`).

## Process

1. Read `docs/_sources.json`, `docs/_cli-commands.json`, and
   `docs/_examples.json` from `02-source-scan`.
2. Write `docs/_ia.json` exactly as above. The six-group structure is the
   contract; only the page lists change as the framework grows.
3. If a future framework change adds (say) a "Plugins" guide, add it to the
   Guides group; downstream phases pick it up automatically.

## Why six groups (not four)

The previous IA had four groups (Getting Started, Guides, Reference,
Concepts) and stuffed everything else under Guides. Two new top-level
sections were added:

- **Examples** — surface the 21 example playbooks. They're the fastest
  path from "I have a problem" to "I have a working playbook" and were
  invisible under the old IA.
- **Troubleshooting** — broken out from Guides because it has its own
  symptom-indexed entry pattern (people land here in distress, not from
  reading order). Owns its own glob of per-symptom pages.

## Banned

- Adding a seventh top-level group without removing one. Six is the
  contract — extra cognitive load on first-time readers is the cost of
  every additional group.
- Putting CLI commands as individual `page` entries. The `glob` entry handles
  N commands without N IA edits.
- Putting per-example pages as individual `page` entries. Same reason —
  use the per-category globs.
- Putting internal docs (`_internal/*`) in the sidebar. They're archived,
  not navigable.