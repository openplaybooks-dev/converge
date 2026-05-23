---
name: feature-prioritization
description: Methodology for identifying, prioritizing (MoSCoW + RICE), and scoping features within each epic
---

# Feature Prioritization Skill

## Methodology

### 1. Feature Identification

Start with the epic's user goals. Brainstorm capabilities needed. Review competitors for inspiration.

**Feature types**:
- **User-facing**: Direct interaction (forms, dashboards, content)
- **System-level**: Behind-the-scenes (notifications, sync, processing)
- **Integration**: Connects to external systems
- **Administrative**: Management and configuration

### 2. MoSCoW Prioritization

- **Must Have**: Critical for epic success
- **Should Have**: Important but not critical for v1
- **Could Have**: Nice to have if time allows
- **Won't Have**: Explicitly excluded

### 3. RICE Scoring (tie-breaking)

RICE = (Reach × Impact × Confidence) / Effort

### 4. View Identification

For each feature, identify the UI screens needed. Use patterns:
- List/Grid views for browsing
- Detail views for single items
- Form views for data input
- Dashboard views for summaries

### 5. Output

**catalog.json** per epic, **FEATURE.md** per feature, **views.json** per feature, **META.md** with rationale.
