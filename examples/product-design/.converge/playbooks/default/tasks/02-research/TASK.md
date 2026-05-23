---
id: 02-research
title: Market & User Research
description: Conduct market analysis, identify user personas, and analyze competitive landscape
blocking: true
depends_on:
  - 01-intake
inputs:
  - docs/product/PRODUCT_BRIEF.md
  - docs/product/SCOPE.md
outputs:
  - docs/product/research/RESEARCH_REPORT.md
  - docs/product/research/user-personas.md
  - docs/product/research/competitive-analysis.md
checks:
  - id: report-exists
    cmd: test -f docs/product/research/RESEARCH_REPORT.md
    description: Research report exists
  - id: personas-count
    cmd: python3 -c "
content = open('docs/product/research/user-personas.md').read()
import re
personas = re.findall(r'^## Persona\s', content, re.MULTILINE)
assert len(personas) >= 2, f'Expected ≥2 personas, found {len(personas)}'
print(f'Found {len(personas)} personas')
"
    description: At least 2 user personas documented
  - id: competitive-count
    cmd: python3 -c "
content = open('docs/product/research/competitive-analysis.md').read()
import re
competitors = re.findall(r'^### ', content, re.MULTILINE)
assert len(competitors) >= 3, f'Expected ≥3 competitors, found {len(competitors)}'
print(f'Found {len(competitors)} competitors')
"
    description: At least 3 competitors analyzed
  - id: research-cites-sources
    cmd: grep -q "## Sources" docs/product/research/RESEARCH_REPORT.md
    description: Research cites sources
skills:
  - research-synthesis
---

# Market & User Research

Conduct comprehensive research to inform product design decisions. Use the `research-synthesis` skill for methodology.

## Inputs

Read `docs/product/PRODUCT_BRIEF.md` and `docs/product/SCOPE.md` to understand the product concept, scope, and constraints.

## Tasks

1. **Identify user personas** (≥2):
   - Name, role, demographics
   - Goals: What they want to accomplish
   - Pain points: Current frustrations and workarounds
   - Behaviors: How they interact with similar products
   - Technical proficiency: Comfort level with tools
   - Quote: Representative statement capturing their mindset

2. **Analyze competitive landscape** (≥3):
   - Direct competitors (same problem, same audience)
   - Indirect competitors (same problem, different approach)
   - For each: strengths, weaknesses, pricing, market position
   - Identify gaps and differentiation opportunities

3. **Research user needs**:
   - What jobs are users trying to accomplish?
   - What are their current workarounds?
   - What delights them in similar products?
   - What frustrates them most?

4. **Write RESEARCH_REPORT.md**:
   - `## Executive Summary` (2-3 paragraphs)
   - `## User Personas` (link to user-personas.md)
   - `## Market Analysis` (size, trends, dynamics)
   - `## Competitive Landscape` (link to competitive-analysis.md)
   - `## Key Insights` (research-backed findings)
   - `## Recommendations` (actionable, prioritized)
   - `## Sources` (every claim cited)

5. **Write user-personas.md**: One `## Persona` section per persona
6. **Write competitive-analysis.md**: One `### Competitor` section per competitor

## Output

Three research documents that will inform epic and feature decomposition with evidence-backed decisions.
