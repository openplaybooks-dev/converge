---
name: view-meta-writer
description: Methodology for writing META.md documents that capture design rationale, MVP scope, and trade-offs for each view
---

# View Meta Writer Skill

## When to Use This Skill

Use this skill when writing the META.md for a view — the "why" document that captures the reasoning behind every design decision.

## Purpose

META.md answers the questions that SPEC.md cannot:
- **Why this design** and not another?
- **What trade-offs** were considered and why was this one chosen?
- **What's in the MVP** vs what's deferred?
- **What assumptions** are we making and what risks do they carry?

This document is for:
- **Product managers** who need to approve or challenge design decisions
- **Engineers** who need to understand the "why" before implementing
- **Designers** who need context when reviewing or iterating
- **Future selves** who need to remember why a decision was made

## Required Structure

```markdown
# META — [View Title]

## Design Rationale

### Why this layout?
- **User need:** [specific finding from research or user stories]
- **Competitive precedent:** [how similar products handle this — cite examples]
- **Decision:** [what we chose and why, referencing alternatives rejected]

### Why these components?
- **From DESIGN.md:** [which component archetypes apply and why]
- **Alternatives considered:** [what other patterns we evaluated]
- **Final choice:** [why this set of components serves the user goal best]

### Why this interaction pattern?
- **User goal:** [what the user is trying to accomplish in this view]
- **Friction points:** [where users typically get stuck in similar flows]
- **Resolution:** [how our design addresses those friction points]

### Why this information hierarchy?
- **Primary content:** [what users need to see first and why]
- **Secondary content:** [what users can discover on their own]
- **Tertiary content:** [what's available on demand, not in primary view]

## MVP Scope

### In this MVP
- [Capability A]: [what it does, why it's essential for v1]
- [Capability B]: [what it does, why it's essential for v1]

### Deferred (v2+)
- [Capability C]: [why deferred, what's needed to implement later]
- [Capability D]: [why deferred, what's needed to implement later]

### Explicitly Out of Scope
- [What we're NOT building and the rationale for exclusion]

## Trade-offs

### Trade-off 1: [Name the decision]
- **Option A:** [description + pros + cons]
- **Option B:** [description + pros + cons]
- **Decision:** [what we chose + why the winner won]

### Trade-off 2: [Name the decision]
- [Same format]

## Assumptions & Risks

### Assumptions
- [Assumption 1]: [why we believe this is true, what would invalidate it]
- [Assumption 2]: [why we believe this is true, what would invalidate it]

### Risks
- [Risk 1]: [likelihood: Low/Med/High × impact: Low/Med/High]
  - **Mitigation:** [how we'll handle it if it materializes]
- [Risk 2]: [likelihood × impact]
  - **Mitigation:** [how we'll handle it]

## Traceability
- **Epic:** [epic-id]
- **Feature:** [feature-id]
- **View:** [view-id]
- **Persona:** [primary persona]
- **Feature rationale:** docs/product/features/[epic-id]/[feature-id]/META.md § [section]
- **Design system:** .design/system/DESIGN.md § [section]
- **SPEC.md:** .design/screens/[epic-id]/[feature-id]/[view-id]/SPEC.md
```

## Rules

1. **Every decision must have reasoning** — "because the design system says so" is not sufficient
2. **Trade-offs must be explicit** — show at least one alternative that was considered and rejected
3. **MVP scope must be honest** — clearly separate what's essential from what's nice-to-have
4. **Cite sources** — reference the research, feature docs, or design system that informed each decision
5. **Be specific** — "users need a dashboard" is bad; "operators need to see all active jobs at a glance to prioritize work" is good
6. **Domain-specific** — use realistic examples from the product's domain
7. **No speculation** — if we don't know, say "TBD" and flag it as an assumption

## Anti-Patterns

- **"We chose X because it's better"** — better for whom? Why?
- **"Users want Y"** — which users? How do we know?
- **"This is standard practice"** — standard for what context?
- **No alternatives considered** — every decision has trade-offs
- **Vague MVP scope** — "build the dashboard" is not a scope
- **No risk acknowledgment** — every design choice carries risk
- **Orphaned decisions** — every choice must trace back to research, feature docs, or design system
