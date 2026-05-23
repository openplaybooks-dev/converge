---
id: feature-analysis-{{epicId}}
title: Feature Analysis — {{epicTitle}}
description: Identify features, write META.md with design reasoning, and determine views for epic {{epicId}}
blocking: true
passthrough: true
vars:
  epicId:
  epicTitle:
  epicDescription:
  priority:
  targetPersonas:
inputs:
  - docs/product/research/RESEARCH_REPORT.md
  - docs/product/research/user-personas.md
outputs:
  - docs/product/features/{{epicId}}/catalog.json
  - docs/product/features/{{epicId}}/FEATURES.md
  - docs/product/features/{{epicId}}/*/FEATURE.md
  - docs/product/features/{{epicId}}/*/META.md
  - docs/product/features/{{epicId}}/*/views.json
checks:
  - id: epic-catalog-exists
    cmd: test -f docs/product/features/{{epicId}}/catalog.json
    description: Epic feature catalog exists
  - id: catalog-valid
    cmd: python3 -c "import json; data = json.load(open('docs/product/features/{{epicId}}/catalog.json')); assert 'features' in data; assert len(data['features']) >= 1"
    description: catalog.json is valid with ≥1 feature
  - id: all-features-have-meta
    cmd: bash -c 'for f in docs/product/features/{{epicId}}/*/META.md; do test -f "$f" || { echo "Missing META.md for $f"; exit 1; }; done'
    description: Every feature has META.md with design reasoning
  - id: all-features-have-views
    cmd: bash -c 'for f in docs/product/features/{{epicId}}/*/views.json; do test -f "$f" || { echo "Missing views.json for $f"; exit 1; }; done'
    description: Every feature has views defined
  - id: feature-docs-exist
    cmd: bash -c 'for f in docs/product/features/{{epicId}}/*/FEATURE.md; do test -f "$f" || exit 1; done'
    description: Every feature has FEATURE.md
skills:
  - feature-prioritization
  - view-identification
---

# Feature Analysis — {{epicTitle}}

Identify 3-7 features for epic {{epicId}}, prioritize them using MoSCoW method, write META.md with design reasoning, and determine views for each feature.

## Inputs

- Research report for market context
- User personas for audience understanding
- Epic description for scope boundaries

## Tasks

1. **Identify features** for this epic:
   - What capabilities does this epic need?
   - How do features map to user goals from research?
   - What are the dependencies between features?
   - What would competitors do for this capability?

2. **Write META.md for each feature** — this is the "why" document:
   ```markdown
   # META — {{featureId}}

   ## Design Rationale
   ### Why this feature?
   - User need: [from research]
   - Market gap: [from competitive analysis]
   - Decision: [what we're building and why]

   ### Why these views?
   - User journey: [how the user flows through]
   - Trade-offs considered: [alternatives rejected]
   - Final choice: [why this set of views]

   ## MVP Scope
   ### In this MVP
   - [Feature A]: [what it does]
   - [Feature B]: [what it does]

   ### Deferred (v2+)
   - [Feature C]: [why deferred]
   - [Feature D]: [why deferred]

   ## Assumptions & Risks
   - Assumption: [what we're assuming]
   - Risk: [what could go wrong]
   - Mitigation: [how we'll handle it]

   ## Traceability
   - Epic: {{epicId}} — {{epicTitle}}
   - Research: docs/product/research/RESEARCH_REPORT.md § [section]
   - Persona: [which persona drives this]
   ```

3. **Prioritize features** (MoSCoW + RICE):
   - Must Have: Critical for epic success
   - Should Have: Important but not critical for v1
   - Could Have: Nice to have if time allows
   - Won't Have: Explicitly excluded for now

4. **Identify views per feature**:
   - What UI screens are needed for each feature capability?
   - What interactions occur on each view?
   - What data is displayed/collected?

5. **Write docs/product/features/{{epicId}}/catalog.json**:
   ```json
   {
     "epic_id": "{{epicId}}",
     "features": [
       {
         "id": "feature-id",
         "title": "Feature Name",
         "description": "What this feature does",
         "priority": "must",
         "mvp_scope": "Features A, B included; C, D deferred",
         "user_stories": ["As a persona, I want to..."],
         "dependencies": [],
         "views": ["view-1", "view-2"]
       }
     ]
   }
   ```

6. **Write docs/product/features/{{epicId}}/FEATURES.md**: Summary of all features

7. **Write docs/product/features/{{epicId}}/<feature-id>/FEATURE.md**: Detailed feature spec

8. **Write docs/product/features/{{epicId}}/<feature-id>/views.json** with embedded sections, tabs, and modals sub-catalogs:
   ```json
   {
     "feature_id": "<feature-id>",
     "views": [
       {
         "id": "view-id",
         "title": "View Name",
         "description": "What this view shows",
         "target_persona": "primary-user",
         "priority": "must",
         "sections": [
           {
             "id": "section-id",
             "title": "Section Name",
             "purpose": "What user accomplishes here",
             "layout": "single-column | two-column | card-grid | horizontal-form | sidebar-content | dashboard",
             "components": ["button", "card", "input"],
             "data_fields": ["field1", "field2"],
             "states": ["default", "empty", "loading", "error"]
           }
         ],
         "tabs": [
           { "id": "tab-id", "label": "Tab Label", "content_type": "list | grid | detail", "sort_or_filter": "name asc" }
         ],
         "modals": [
           { "id": "modal-id", "trigger": "Click button X", "type": "centered-dialog | side-drawer | fullscreen | confirmation", "content": "What the modal contains" }
         ],
         "interactions": [
           {"action": "User can X", "response": "System does Y"}
         ],
         "data_requirements": ["Needs Z data"]
       }
     ]
   }
   ```

9. **Do NOT call aggregate-catalog.sh**. Each feature-analysis writes its own self-contained `catalog.json` and `views.json` with sections/tabs/modals. Downstream tasks discover children by walking the file tree, not by reading a master catalog.

## Output

Complete feature catalog with META.md reasoning docs and views for this epic. Every feature has documented rationale for why it exists and why it's designed this way. Every view has its sections, tabs, and modals defined inline in `views.json`.
