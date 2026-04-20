---
id: "{{taskId}}"
title: "Architecture analysis — epoch {{epoch}}"
checks:
  - id: report-written
    cmd: "test -f {{artifactsDir}}/architecture/report.md"
    description: "Architecture analysis report exists"
---

# Architecture analysis

Think strategically about whether the project architecture is right for a top-tier agent orchestration framework.

## What to analyze

1. **Package boundaries** — the core package has many directories in `src/`. What should be separate packages? What's in core that doesn't belong there?
2. **Responsibility clarity** — are modules doing one thing well, or are responsibilities blurred? Is code in the right place?
3. **API shape** — what would a user of this framework expect the API to look like? How does the current API compare?
4. **Framework patterns** — top frameworks have small cores and composable pieces. How does converge compare? What would make it more composable?
5. **Biggest opportunity** — identify the single biggest architectural improvement that would have the most impact

## Output

Write `{{artifactsDir}}/architecture/report.md`:

```markdown
# Architecture Analysis

## Current State
Brief description of the current architecture.

## Package Boundaries
What should be split out of core? What packages make sense?

## Responsibility Issues
Modules with unclear or overlapping responsibilities.

## API Shape
How the current API compares to what users would expect.

## Composability
How well the framework supports composable, modular usage.

## Top Recommendation
The single biggest architectural improvement to make, with rationale.
```

Think like a framework author competing for adoption. What architectural changes would make converge the obvious choice?
