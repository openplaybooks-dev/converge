# Converge Control Architecture

## Layer System

SKILL.md (entry point) → playbooks → preferences → examples

---

## File Structure

```
.converge/
├── converge.ts              # Config
├── epics/{epic}/tasks/{task}/TASK.md  # Task defs
└── journal/...             # State + logs
```

---

## Progressive Loading

**Start:** SKILL.md (80 lines)
**Then:** Load by scenario (see SKILL.md table)

Full docs: See STRUCTURE.md for complete architecture.

---

## Playbook vs Preference: The Distinction

### Playbooks (Layer 2)
**Purpose:** Action-oriented guides
**Format:** "How to X"
**Tone:** Imperative ("Run this", "Do that")
**Content:** Step-by-step workflows
**Examples:**
- `run.md` - How to run tasks
- `debug.md` - How to debug failures
- `plan.md` - How to plan structure

### Preferences (Layer 3)
**Purpose:** Complete API reference
**Format:** "X Reference"
**Tone:** Descriptive ("This command...", "Returns...")
**Content:** Complete command/API listings
**Examples:**
- `cli-reference.md` - All CLI commands, options, flags
- `task-api.md` - All TASK.md methods
- `skill-api.md` - All skill layer options

---

## Progressive Disclosure in Action

### Scenario 1: Run Tasks

**Chain of thought:**
1. Read Layer 1 (SKILL.md) - Basic commands
2. Need details? → Load Layer 2 `playbooks/run.md`
3. Need all CLI options? → Load Layer 3 `preferences/cli-reference.md`

**Context loaded:** 100-700 lines (as needed)

---

### Scenario 2: Debug Failed Task

**Chain of thought:**
1. Read Layer 1 (SKILL.md) - Quick troubleshooting
2. Points to Layer 2 → Load `playbooks/debug.md`
3. Follow systematic debugging steps
4. Done

**Context loaded:** ~580 lines (Layer 1 + debug playbook)

---

### Scenario 3: Create Task with WBS

**Chain of thought:**
1. Read Layer 1 (SKILL.md) - Basic task template
2. Need full API → Load Layer 3 `preferences/task-api.md`
3. Need example → Load Layer 4 `examples/screen-generation.md`

**Context loaded:** ~1400 lines (loaded progressively as needed)

---

## Usage Pattern

### 1. Always Start with Layer 1

```
Load: SKILL.md (~100 lines)
```

### 2. Identify What You Need

Layer 1 has "When to Load What" map.

### 3. Load Only Required Layers

Follow the chain:
- **Doing something?** → Playbook (Layer 2)
- **Need API details?** → Preference (Layer 3)
- **Need example?** → Examples (Layer 4)

### 4. Stay in Chain of Thought

Load next layer only when current layer points to it.

---

## Layer Selection Matrix

| Task | L1 | L2 Playbook | L3 Preference | L4 Example |
|------|----|-----------|--------------|-----------|
| Run tasks | ✓ | run.md | - | - |
| Debug failure | ✓ | debug.md | task-api.md* | data-modeling.md* |
| Setup project | ✓ | setup.md | - | - |
| Inspect TASK.md | ✓ | - | task-api.md | - |
| Need all CLI | ✓ | - | cli-reference.md | - |
| Configure project | → **`converge-planning` skill** | | |
| Fix dependency | ✓ | plan.md | - | dependency-chain.md* |
| Create tasks/plan | → **`converge-planning` skill** | | |

*Optional, load if need concrete example

---

## Skill Structure Flexibility

Skills can use **any layer structure** that fits their needs:

### Standard Structure (like this skill)
```
skill-name/
├── SKILL.md                # Entry point
├── README.md               # Architecture
├── playbooks/              # Action guides
├── preferences/            # API/config reference
├── examples/               # Real patterns
└── data/                   # Templates, schemas
```

### Alternative Structures

**Instruction-heavy:**
```
skill-name/
├── SKILL.md
└── instructions/           # Step-by-step guides
    ├── 01-setup.md
    ├── 02-execute.md
    └── 03-verify.md
```

**API-focused:**
```
skill-name/
├── SKILL.md
├── api/                    # API reference
│   ├── endpoints.md
│   └── types.md
└── examples/               # Usage examples
```

**Script-based:**
```
skill-name/
├── SKILL.md
├── scripts/                # Executable scripts
│   ├── setup.sh
│   └── deploy.sh
└── templates/              # File templates
```

**Mixed:**
```
skill-name/
├── SKILL.md
├── playbooks/              # How to do tasks
├── api/                    # API reference
├── preferences/            # Configuration
├── data/                   # Data files
├── examples/               # Examples
├── templates/              # Templates
└── scripts/                # Scripts
```

**See:** `preferences/skill-api.md` for complete layer options

---

## Benefits

### 1. Context Efficiency
- Layer 1 only: ~100 lines (vs 2000+ in monolithic)
- Progressive loading: Only what's needed
- 80% of tasks use <300 lines

### 2. Cognitive Clarity
- Playbooks = doing (action)
- Preferences = reference (API)
- Examples = patterns (real-world)
- Clear distinction
- No overwhelming docs dumps

### 3. Maintainability
- Update layers independently
- Add playbooks without restructuring
- Clear separation of concerns

### 4. Flexibility
- Skills choose their own layer structure
- No forced convention
- Adapt to skill's nature

---

## Context Usage Comparison

| Approach | Quick Task | Medium Task | Complex Task |
|----------|-----------|-------------|--------------|
| Monolithic | 2000 lines | 2000 lines | 2000 lines |
| Modular (v2.0) | 700 lines | 1200 lines | 1800 lines |
| **Layered (v2.1)** | **100 lines** | **400 lines** | **1400 lines** |

**v2.1 Savings:** 85-95% for simple tasks, 70-80% for complex tasks

---

## Design Principles

### 1. Progressive Disclosure
Load complexity only as needed in chain of thought.

### 2. Action-Oriented Playbooks
"How to run tasks" not "CLI reference"

### 3. Reference-Based Preferences
Complete API when you need all details.

### 4. Example-Driven Learning
Real patterns over abstract concepts.

### 5. Flexible Structure
Skills adapt layers to their needs.

---

## File Inventory

**Layer 1: Entry**
- SKILL.md (~100 lines)
- README.md (this file)
- STRUCTURE.md (version history)

**Layer 2: Playbooks** (4 files)
- playbooks/setup.md - Initialize converge for any project
- playbooks/debug.md - Debugging failed tasks
- playbooks/plan.md - Planning epics & tasks
- playbooks/run.md - Running tasks

**Layer 3: Preferences** (3 files)
- preferences/cli-reference.md - All CLI commands + PROJECT.md config
- preferences/task-api.md - TASK.md format reference (for reading/debugging)
- preferences/wbs-reference.md - WBS script contract (ctx API, spawn shape)
- preferences/skill-api.md - Skill structure layers

**Layer 4: Examples** (3 files)
- examples/screen-generation.md - WBS pattern
- examples/data-modeling.md - Retry pattern with LEARN.md
- examples/dependency-chain.md - Cross-epic dependencies

---

## Summary

**Architecture:** Layered progressive disclosure
**Load pattern:** Chain of thought driven
**Context savings:** 85-95% for simple tasks
**Structure:** Flexible, skill-defined layers

**Playbooks:** Action-oriented (how to do)
**Preferences:** Reference-oriented (complete API)
**Examples:** Pattern-oriented (real implementations)

**Start:** SKILL.md → Load layers as needed → Stay efficient
