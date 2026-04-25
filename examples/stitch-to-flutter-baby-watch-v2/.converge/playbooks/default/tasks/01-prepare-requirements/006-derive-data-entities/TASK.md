---
id: 006-derive-data-entities
title: Derive Data Entities from Reference HTML
description: Parse repeating/data-bearing elements in reference code.html files to produce a domain entity inventory that phase 05 can consume.
dependencies:
  - 005-derive-screens-json
tags:
  - requirements
  - data-model
inputs:
  - .stitch/screens.json
  - .stitch/references/**/code.html
outputs:
  - .stitch/data-entities.md
checks:
  - id: data-entities-exists
    cmd: test -f .stitch/data-entities.md
    description: data-entities.md exists
  - id: data-entities-has-entities
    cmd: grep -qE "^## " .stitch/data-entities.md
    description: data-entities.md has at least one entity section
  - id: data-entities-has-fields
    cmd: grep -qE "^- \`?[a-zA-Z_]+\`?:" .stitch/data-entities.md
    description: Entities have field lists
---

# Derive Data Entities from Reference HTML

Look at reference HTML and name the domain objects visible in the UI. Emit `.stitch/data-entities.md` so phase 05 (add-behavior) starts from evidence, not imagination.

## Inputs

- `.stitch/screens.json` — which screens exist and what they show
- `.stitch/references/**/code.html` — actual UI markup

## How to find entities

Signals that something is a data entity:

1. **Repeated structure in lists**. A `<ul>` / `<div class="list">` with N children sharing the same class tree is rendering a collection of entities. The child template shows the entity's visible fields.
2. **Detail cards** with multiple labelled fields. Key-value pairs with distinct labels indicate a single entity being displayed.
3. **Navigation into a subject**. Routes like `/beacon/:id` indicate a `Beacon` entity. Route segments are strong entity name hints.
4. **State badges**. Pills / status chips (`safe`, `weak`, `alert`, `connected`) suggest an enum field on some entity.
5. **Timestamps and time-relative text**. "2h ago", "Just now" suggest an event stream entity with a timestamp field.

## Process

For each reference `code.html`:

1. Identify lists, detail cards, and state badges.
2. Name the entity (singular, PascalCase — `Beacon`, `SafeZone`, `AlertEvent`, `Guardian`).
3. List fields observed in the markup, with a guess at type:
   - `String`, `int`, `double`, `bool`, `DateTime`, enum, or nested entity name.
4. Note which screen(s) the entity appears on.
5. Note whether the entity is a **collection root** (e.g., list screen) or **detail** (e.g., detail screen).

## Output: `.stitch/data-entities.md`

```markdown
# Data Entities

Derived from `.stitch/references/**/code.html` on <date>.

## Beacon

**Appears on:** `home-safe`, `home-alert`, `home-weak`, `beacon-detail`, `beacon-scanner`
**Role:** Domain root.

**Observed fields:**
- `id: String` — stable identifier
- `name: String` — user-given label ("Linh's backpack")
- `battery: int` — 0-100
- `signalStrength: SignalStrength` — enum: safe | weak | lost
- `lastSeenAt: DateTime`
- `rssi: int?` — signal strength in dBm when connected
- `assignedTo: Guardian?` — optional co-guardian

**Evidence:**
- `.stitch/references/babyguard_home_phase_2_safe_updated/code.html` — beacon strip shows name + signal pill + battery icon
- `.stitch/references/chi_ti_t_beacon_phase_2/code.html` — detail card shows all fields

## SafeZone
...

## AlertEvent
...
```

## Relationships

At the end, add a `## Relationships` section:
```
- Beacon 1—* AlertEvent
- Guardian *—* Beacon (many-to-many via `Beacon.assignedTo`)
- SafeZone 1—* Beacon (a beacon can be "in" a zone at a time)
```

## Success Criteria

- `.stitch/data-entities.md` exists
- At least 5 entities (Beacon, SafeZone, AlertEvent, Guardian, and one more domain-specific)
- Each entity has a field list, evidence (reference paths), and screens it appears on
- Relationships section present
