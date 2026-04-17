# Skill API - Flexible Layer Architecture

**Purpose:** Define skill structure with flexible, progressive disclosure layers.

**Philosophy:** Skills choose their own layer structure. No forced convention.

---

## Core Concept: Layered Skills

**Layer = Purpose-driven content bucket**

Skills can have any combination of:
- `instructions/` - Step-by-step guides
- `playbooks/` - Action-oriented how-tos
- `api/` - API reference documentation
- `preferences/` - Configuration and settings
- `data/` - Data files, schemas, constants
- `examples/` - Real-world usage examples
- `templates/` - File templates
- `scripts/` - Executable scripts

**Goal:** Load only what's needed in chain of thought.

---

## Minimal Skill Structure

### Required Files

```
skill-name/
└── SKILL.md         # Entry point (required)
```

**SKILL.md format:**
```yaml
---
name: skill-name
description: Brief description
version: 1.0.0
category: design | data | generation | system | testing | deployment
tags: [tag1, tag2, tag3]
---

# Skill Name

## What This Does
[Bullet points of capabilities]

## Usage
[How to invoke and use]

## Outputs
[What files are created]
```

**That's it.** Minimal skill = SKILL.md only.

---

## Progressive Disclosure Patterns

### Pattern 1: Entry + Layers

**Principle:** SKILL.md points to layers

```
skill-name/
├── SKILL.md              # ~100 lines, navigation map
├── layer1/               # Load when doing X
├── layer2/               # Load when need Y
└── layer3/               # Load for Z details
```

**SKILL.md structure:**
```markdown
# Skill Name

## Quick Start
[Essential info, ~50 lines]

## Progressive Loading
- Need to do X? → Load layer1/file.md
- Need to do Y? → Load layer2/file.md
- Need Z details? → Load layer3/file.md
```

---

### Pattern 2: converge-control Style (Playbooks + Preferences)

**Best for:** Action-oriented skills with API reference

```
skill-name/
├── SKILL.md              # Entry point (~100 lines)
├── README.md             # Layer architecture
├── playbooks/            # Action guides (doing)
│   ├── action1.md
│   ├── action2.md
│   └── examples/
│       └── pattern1.md
└── preferences/          # API reference (details)
    └── api.md
```

**When to use:**
- Skill has both "how to do" and "API reference" content
- Want separation between action and reference
- Need progressive complexity

**Layer loading:**
1. SKILL.md - Quick reference
2. playbooks/*.md - How to do specific action
3. preferences/*.md - Complete API when needed
4. playbooks/examples/*.md - Real patterns

---

### Pattern 3: Instruction-Based

**Best for:** Sequential, step-by-step processes

```
skill-name/
├── SKILL.md              # Entry point
└── instructions/         # Ordered guides
    ├── 01-setup.md
    ├── 02-configure.md
    ├── 03-execute.md
    └── 04-verify.md
```

**When to use:**
- Clear sequential workflow
- Each step builds on previous
- Learning-oriented content

**Layer loading:**
1. SKILL.md - Overview
2. instructions/01-*.md - Step 1
3. instructions/02-*.md - Step 2 (only when step 1 done)
4. etc.

---

### Pattern 4: API-Focused

**Best for:** Library wrappers, SDK documentation

```
skill-name/
├── SKILL.md              # Entry point
├── api/                  # API docs
│   ├── overview.md
│   ├── endpoints.md
│   ├── types.md
│   └── errors.md
└── examples/             # Usage examples
    ├── quickstart.md
    └── advanced.md
```

**When to use:**
- Documenting API or library
- Reference-heavy content
- Need complete method/type listing

**Layer loading:**
1. SKILL.md - High-level overview
2. api/overview.md - API structure
3. api/endpoints.md - Specific endpoint (load on demand)
4. examples/*.md - Real usage when needed

---

### Pattern 5: Script-Based

**Best for:** Automation, deployment, tooling

```
skill-name/
├── SKILL.md              # Entry point
├── scripts/              # Executable scripts
│   ├── setup.sh
│   ├── deploy.sh
│   └── rollback.sh
└── templates/            # File templates
    ├── config.yaml.tmpl
    └── docker.tmpl
```

**When to use:**
- Primarily script execution
- Template-driven generation
- Automation workflows

**Layer loading:**
1. SKILL.md - What scripts do, how to use
2. scripts/*.sh - Execute specific script
3. templates/*.tmpl - Reference template when customizing

---

### Pattern 6: Data-Driven

**Best for:** Configuration, schemas, constants

```
skill-name/
├── SKILL.md              # Entry point
├── data/                 # Data files
│   ├── schema.json
│   ├── defaults.yaml
│   └── constants.ts
└── playbooks/
    └── customize.md      # How to customize data
```

**When to use:**
- Heavy data/config files
- Schema-driven generation
- Reference data needed

**Layer loading:**
1. SKILL.md - Overview
2. data/schema.json - Schema structure
3. playbooks/customize.md - How to customize
4. data/defaults.yaml - Default values

---

### Pattern 7: Mixed (Full-Featured)

**Best for:** Complex skills with multiple concerns

```
skill-name/
├── SKILL.md              # Entry point (~100 lines)
├── README.md             # Architecture guide
├── playbooks/            # Action guides
│   ├── setup.md
│   ├── deploy.md
│   └── examples/
├── api/                  # API reference
│   └── reference.md
├── preferences/          # Config reference
│   └── settings.md
├── data/                 # Data files
│   └── schema.json
├── templates/            # Templates
│   └── config.tmpl
└── scripts/              # Scripts
    └── init.sh
```

**When to use:**
- Large, complex skills
- Multiple use cases
- Need all layer types

**Layer loading:** Depends on task - load only relevant layers

---

## Layer Naming Conventions

**Common layer names:**

| Layer | Purpose | Examples |
|-------|---------|----------|
| `instructions/` | Sequential steps | 01-setup.md, 02-execute.md |
| `playbooks/` | Action-oriented how-tos | debug.md, deploy.md |
| `api/` | API reference | endpoints.md, types.md |
| `preferences/` | Config/settings | settings.md, options.md |
| `data/` | Data files | schema.json, constants.ts |
| `examples/` | Real-world patterns | quickstart.md, advanced.md |
| `templates/` | File templates | config.tmpl, code.tmpl |
| `scripts/` | Executable scripts | setup.sh, deploy.sh |
| `guides/` | General guides | getting-started.md |
| `reference/` | Complete reference | full-api.md |

**No rules - use what fits your skill.**

---

## SKILL.md Frontmatter

**Required fields:**
```yaml
---
name: skill-name              # Kebab-case identifier
description: Brief purpose    # One-line description
version: 1.0.0                # Semantic version
category: design              # Skill category
tags: [tag1, tag2]            # Search tags
---
```

**Optional fields:**
```yaml
---
dependencies: [other-skill]   # Required skills
next-skills: [follow-up]      # Suggested next skills
layers:                       # Document your layers
  - playbooks: "Action guides"
  - api: "API reference"
---
```

---

## SKILL.md Content Template

```markdown
---
name: my-skill
description: Does something useful
version: 1.0.0
category: generation
tags: [code, generation]
---

# My Skill

**Philosophy:** [One-line guiding principle]

---

## Quick Start

[Essential usage in ~50 lines]

---

## What This Does

✅ Capability 1
✅ Capability 2
✅ Capability 3

---

## Outputs

- `output/file1.txt` - Description
- `output/file2.json` - Description

---

## Progressive Loading

**For X:** Load `playbooks/do-x.md`
**For Y:** Load `api/y-reference.md`
**Need example:** Load `examples/pattern.md`

---

## Summary

[Brief recap, point to README for architecture]
```

---

## Layer Content Guidelines

### Playbooks (Action-Oriented)

**Structure:**
```markdown
# How to Do X

## Quick Steps
1. Step 1
2. Step 2
3. Step 3

## Detailed Guide
[Full walkthrough]

## Common Issues
[Troubleshooting]

## Examples
[Real usage]
```

**Tone:** Imperative ("Do this", "Run that")

---

### API/Preferences (Reference)

**Structure:**
```markdown
# API Reference

## Overview
[What this API does]

## Methods

### method1(args)
**Purpose:** ...
**Parameters:** ...
**Returns:** ...
**Example:** ...

### method2(args)
...
```

**Tone:** Descriptive ("This method does...", "Returns...")

---

### Examples

**Structure:**
```markdown
# Pattern: X

## Context
[When to use this]

## Implementation
[Code/steps]

## Explanation
[Why it works]

## Variations
[Alternatives]
```

**Tone:** Explanatory ("This pattern...", "Here's how...")

---

### Instructions (Sequential)

**Structure:**
```markdown
# Step N: Title

## Goal
[What this step achieves]

## Prerequisites
[What must be done first]

## Actions
1. Do this
2. Do that

## Verification
[How to check success]

## Next
→ Continue to step N+1
```

**Tone:** Guided ("You will...", "Next, do...")

---

## Progressive Disclosure Rules

### 1. Entry Point First

SKILL.md always loaded first. Keep it ~100 lines.

### 2. Point to Layers

SKILL.md has navigation map: "Need X? → Load layer/file.md"

### 3. Load on Demand

Load next layer only when current layer points to it.

### 4. Chain of Thought Driven

AI decides layer loading based on task needs.

### 5. No Premature Loading

Don't load API reference if action guide is enough.

---

## Anti-Patterns

### ❌ Monolithic SKILL.md

```markdown
# Skill (2000 lines)

## Everything in one file
...
```

**Problem:** Defeats progressive disclosure

**Fix:** Extract layers

---

### ❌ Unclear Layer Purpose

```
skill/
├── stuff/
├── things/
└── misc/
```

**Problem:** Can't tell what to load when

**Fix:** Use clear layer names (playbooks, api, etc.)

---

### ❌ Forced Navigation Path

```markdown
# SKILL.md

You MUST read layers in this order:
1. layer1.md
2. layer2.md
3. layer3.md
```

**Problem:** AI can't load on demand

**Fix:** Make layers independent, point to relevant layer for task

---

### ❌ Duplicate Content

```
playbooks/deploy.md:  [deployment steps]
api/deploy.md:        [same deployment steps]
```

**Problem:** Wastes context, confusing

**Fix:** One source of truth per topic

---

## Examples: Real Skills

### Example 1: ux-design (Instruction-Based)

```
ux-design/
├── SKILL.md              # Entry, ~100 lines
└── instructions/
    ├── 01-understand.md  # Analyze requirements
    ├── 02-vibe.md        # Define brand vibe
    ├── 03-flows.md       # Map user flows
    └── 04-screens.md     # List screens
```

**Loading:**
1. SKILL.md - Overview
2. Follow instructions/* sequentially

---

### Example 2: stitch-generate (API-Focused)

```
stitch-generate/
├── SKILL.md              # Entry
├── api/
│   ├── cli.md            # CLI reference
│   └── options.md        # All options
└── examples/
    ├── basic.md
    └── advanced.md
```

**Loading:**
1. SKILL.md - Quick usage
2. api/cli.md - If need full CLI reference
3. examples/*.md - If need pattern

---

### Example 3: deploy-cloudflare (Script-Based)

```
deploy-cloudflare/
├── SKILL.md              # Entry
├── scripts/
│   ├── deploy.sh
│   ├── rollback.sh
│   └── verify.sh
└── templates/
    └── wrangler.toml.tmpl
```

**Loading:**
1. SKILL.md - What scripts do
2. Execute scripts/*.sh
3. templates/*.tmpl - If customizing

---

## Skill Categories

| Category | Purpose | Example Layers |
|----------|---------|----------------|
| `design` | UI/UX design | instructions, examples |
| `data` | Data modeling | data, api, playbooks |
| `generation` | Code generation | templates, api, examples |
| `system` | System/meta | playbooks, preferences |
| `testing` | Testing/QA | playbooks, scripts |
| `deployment` | Deploy/ops | scripts, templates, playbooks |

---

## Version Evolution

### v1.0.0 - Minimal
```
skill/
└── SKILL.md
```

### v1.1.0 - Add Examples
```
skill/
├── SKILL.md
└── examples/
    └── basic.md
```

### v2.0.0 - Full Layers
```
skill/
├── SKILL.md
├── playbooks/
├── api/
└── examples/
```

**Evolve as needed. Start minimal.**

---

## Creating New Skill Checklist

- [ ] Create SKILL.md with frontmatter
- [ ] Define skill purpose (~3 bullet points)
- [ ] List outputs clearly
- [ ] Choose layer structure
- [ ] Create layers (if needed)
- [ ] Add navigation map in SKILL.md
- [ ] Test progressive loading
- [ ] Document architecture in README (if complex)

---

## Summary

**Flexible layers:** Skills choose structure that fits
**Progressive disclosure:** Load only what's needed
**Chain of thought:** AI-driven layer loading
**No forced convention:** Adapt to skill's nature

**Common structures:**
- Minimal: SKILL.md only
- Sequential: instructions/
- Action-oriented: playbooks/ + preferences/
- API-focused: api/ + examples/
- Script-based: scripts/ + templates/
- Mixed: All of the above

**Start minimal, evolve as needed.**

---

## See Also

- `../SKILL.md` - This skill's entry point
- `../README.md` - This skill's layer architecture
- `../playbooks/` - Action-oriented guides
- `/skill-name/SKILL.md` - Any skill's entry point
