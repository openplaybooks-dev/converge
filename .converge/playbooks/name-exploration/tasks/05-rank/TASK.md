---
id: 05-rank
title: Boardroom Naming Recommendation
description: Produce the final agency-style naming report with shortlist, strategic rationale, risks, and next steps.
inputs:
  - artifacts/name-exploration/evaluated-candidates.json
  - artifacts/name-exploration/narrative-tested-candidates.json
  - artifacts/name-exploration/collision-summary.md
  - artifacts/name-exploration/critique-report.md
  - artifacts/name-exploration/identity.md
  - artifacts/name-exploration/creative-brief.md
outputs:
  - artifacts/name-exploration/ranked-report.md
checks:
  - id: report-exists
    cmd: test -s artifacts/name-exploration/ranked-report.md
    description: Report exists
  - id: has-boardroom-shortlist
    cmd: grep -q "## Boardroom Shortlist" artifacts/name-exploration/ranked-report.md
    description: Has boardroom shortlist section
  - id: has-recommendations
    cmd: grep -q "## Recommendations" artifacts/name-exploration/ranked-report.md
    description: Has recommendations section
  - id: has-risk-register
    cmd: grep -q "## Risk Register" artifacts/name-exploration/ranked-report.md
    description: Has risk register section
---

# Rank: Boardroom Naming Recommendation

Read `evaluated-candidates.json`, `narrative-tested-candidates.json`, `collision-summary.md`, `critique-report.md`, `identity.md`, and `creative-brief.md`. Write `artifacts/name-exploration/ranked-report.md`.

## Required report structure

### Executive Summary

- One paragraph naming the strategic recommendation.
- Statistics: candidates generated, npm available, scored.
- The one-line case for the recommended name.

### Boardroom Shortlist

Top 7-10 names. For each:

- Name
- Pronunciation
- Score
- npm package/scope availability
- Strategic rationale
- Brand story
- Main risk
- Suggested package/scope/CLI usage

### Ranked Candidates

Top 30 available names in a table.

### Territory Analysis

Which creative territories produced the strongest names and why.

### Risk Register

Discuss:

- npm availability
- trademark/domain checks still required
- spelling/pronunciation risk
- collision with existing dev/AI tools
- enterprise seriousness risk
- community reception risk

### Why Not Converge?

Explain honestly whether the current name should be retained or replaced. If replacing it, explain what the new name must beat.

### Names We Killed

List strong-looking names rejected by critique or narrative testing and why.

### Recommendations

Give a decisive recommendation plus two alternatives:

1. Primary recommendation.
2. Conservative/dev-tool alternative.
3. More distinctive/brand-led alternative.
4. Next steps: trademark search, domain search, GitHub org/social handles, community poll, publish reservation.

### Appendix

Compact table of all scored candidates.

## Tone

Write like a senior naming partner presenting to founders. Be direct, selective, and honest. Do not pretend every name is good. The point is to help the team choose proudly.
