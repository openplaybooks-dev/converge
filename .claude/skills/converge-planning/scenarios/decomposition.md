# Decomposition — Worked Example

## When to use this scenario

**Trigger phrases:**
- "decompose into modules" / "break down an artifact"
- "write templates for components"
- "spawn per component"
- "dynamic task spawning from structure"

**What it covers:** Meta-pattern: `decompose → write templates → spawn per component`. All other scenarios specialize this pattern.

---

Every playbook is fundamentally this: take a complex artifact, decompose it into smaller modules, write templates for those modules, spawn them dynamically. The other scenarios are specializations of this pattern.

## The thinking sequence applied

1. **What does it contain?** A complex artifact to decompose
2. **Decompose** — identify modules, write their structure to components.json
3. **Template authoring** — write templates for each module type
4. **Spawn** — spawn one task per component dynamically

---

## The decomposition loop

```
complex artifact
  ↓ decompose
components.json (list of module specs)
  ↓ author templates per type
templates/<type>/TASK.md
  ↓ spawn
component-001 component-002 ... component-N
```

**Core pattern:**
1. **Decompose** — read the artifact, identify its structure, write components.json
2. **Author templates** — for each module type, write the template
3. **Spawn** — spawn one task per component, following the structure
4. **Converge** — gather results into the final artifact

---

## playbook.yml

**No `tasks:` entry.** One bootstrap task does all the work.

```yaml
name: decomposition
description: >-
  Decompose a complex artifact into modules, write templates, spawn dynamically.
  Generic pattern: identify structure → write templates → spawn per component.

run:
  mode: oneoff
```

---

## tasks/ structure

```
tasks/
└── decompose/
    └── TASK.md                      ← single bootstrap task
```

---

## Phase details

### Decompose task (bootstrap)

```yaml
tasks/decompose/TASK.md:
  ---
  id: decompose
  title: Decompose artifact into components
  ---
  # 1. Read the source artifact
  # 2. Identify module structure
  # 3. Write components.json
  # 4. Write templates/ per module type
  # 5. Spawn one task per component
```

### Step 1-2: Decompose

The bootstrap reads the complex artifact and identifies module types:

```bash
# Example: decompose a Figma file into design tokens
FIGMA_URL=$(cat inputs/figma-url.txt)
COMPONENTS=$(figma-cli export --url "$FIGMA_DOTA" --format json)

# Write components manifest
cat > output/components.json <<EOF
{
  "components": [
    { "id": "token-color-primary", "type": "token", "path": "tokens/color.json" },
    { "id": "component-button", "type": "component", "path": "components/Button.tsx" },
    { "id": "screen-home", "type": "screen", "path": "screens/Home.tsx" }
  ]
}
EOF
```

### Step 3: Author templates

The bootstrap writes templates for each module type it discovered:

```bash
# Write template for each module type found in components.json
for TYPE in $(jq -r '.[].type' output/components.json | sort -u); do
  mkdir -p "templates/$TYPE"
  write_template_for_type "$TYPE" > "templates/$TYPE/TASK.md"
done
```

### Step 4: Spawn per component

```bash
for ROW in $(jq -c '.components[]' output/components.json); do
  ID=$(echo "$ROW" | jq -r '.id')
  TYPE=$(echo "$ROW" | jq -r '.type')
  PATH=$(echo "$ROW" | jq -r '.path')
  converge spawn "component-$ID" "$TYPE" \
    --var id="$ID" \
    --var path="$PATH" \
    --var type="$TYPE"
done
```

---

## Components file

The decomposition output is a structured manifest:

```json
{
  "components": [
    { "id": "screen-home", "type": "screen", "path": "screens/Home.tsx" },
    { "id": "screen-settings", "type": "screen", "path": "screens/Settings.tsx" },
    { "id": "component-button", "type": "component", "path": "components/Button.tsx" },
    { "id": "token-color", "type": "token", "path": "tokens/color.json" }
  ]
}
```

---

## Template authoring per domain

### Design system (decompose Figma → tokens + primitives + components)

```
Type: token     → templates/token/TASK.md
Type: primitive → templates/primitive/TASK.md
Type: component → templates/component/TASK.md
```

### Software (decompose spec → screens + components + API surface)

```
Type: screen     → templates/screen/TASK.md
Type: component  → templates/component/TASK.md
Type: endpoint   → templates/endpoint/TASK.md
```

### Presentation (decompose outline → slides)

```
Type: slide     → templates/slide/TASK.md
Type: fragment   → templates/fragment/TASK.md
```

---

## Key insight: every scenario is this pattern

The other scenarios in `scenarios/` are specializations:

| Scenario | What gets decomposed | Component types |
|---|---|---|
| software-development | SPEC.md | screen, component, route, provider |
| design-system | Figma / design brief | token, primitive, component |
| exploration | Research question | catalog-entry, hypothesis |
| optimization | Solution space | candidate |
| business-automation | Workflow spec | intake-item, rule, report-item |
| pipeline | Data source | extract-batch, transform-item |

The pattern is identical: decompose → write templates → spawn per component.

---

## Structural summary

| Element | Pattern |
|---|---|
| Entry point | Single bootstrap task |
| Decomposition output | `components.json` (structured manifest) |
| Template authoring | Bootstrap writes templates per type on the fly |
| Spawn | One task per component, type-matched to template |
| Domain-specific logic | Lives in decomposition task body |
| Templates | Written dynamically, spawned dynamically |
