---
id: research-contradictions
title: Contradiction Resolution
---

# Contradiction Resolution

Systematically identify and resolve conflicting evidence using a structured taxonomy of resolution strategies.

## Detection

Scan evidence-grades.json for:
- Claims that directly oppose each other
- Claims with conflicting effect directions for the same outcome
- Hypotheses with mixed support (some evidence supporting, some refuting)

## Resolution Strategies (apply in order)

### 1. Weight of Evidence
Compare GRADE ratings and effect sizes between conflicting claims. If one side has substantially stronger evidence (higher grade AND larger effect), adopt it. Document the evidence asymmetry.

### 2. Scope Refinement
Both claims may be valid under different conditions. Restate with narrower scope. Example: "X causes Y" vs "X doesn't cause Y" becomes "X causes Y under condition Z but not under condition W".

### 3. Methodological Reconciliation
Different methodologies may explain the conflict. Document:
- What methods each side used
- Which methodology is more appropriate for the question
- Whether methodological differences fully explain the discrepancy

### 4. Unresolved
If no strategy resolves the conflict, flag it with:
- Specific questions for the next epoch's literature search
- Suggested methodology to resolve it
- Impact assessment (how much does this affect the overall conclusion?)

## Quality Criteria

- All contradictions are identified (no silent conflicts)
- Resolution strategy is documented for each
- Unresolved contradictions have specific next-step questions
- Confidence in each resolution is rated
