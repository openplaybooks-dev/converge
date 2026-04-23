---
id: frontier-spawn-beams
title: Beam Spawning
---

# Beam Spawning

Design N parallel research beams targeting promising frontier edges.

## Process

1. Read ranked frontier edges from frontier analysis
2. Design N beams, distributing across top-ranked edges
3. For each beam, define:
   - **Direction**: Which frontier edge to explore
   - **Approach**: A unique research methodology (not shared across beams)
   - **Hypothesis**: A specific, testable prediction
   - **Exploration strategy**: Step-by-step plan for the exploration
4. Ensure diversity in both direction AND methodology:
   - Multiple beams may target the same edge if using different approaches
   - At least one beam should target a lower-ranked but novel edge
5. Assess dead-end risk for each beam

## Key Principle

Beams have NO fixed methodology. Each beam defines its own approach. Possible approaches include:
- Literature synthesis and meta-analysis
- First-principles reasoning from axioms
- Analogical reasoning from related domains
- Adversarial analysis (trying to disprove claims)
- Computational/formal modeling
- Historical case study analysis
- Thought experiments and counterfactuals

## Outputs

- `beams.json` — N beam definitions with direction, approach, hypothesis, and strategy

## Quality Criteria

- Exactly N beams produced (matching beamWidth input)
- Each beam has a unique approach (no two beams use the same methodology)
- Hypotheses are specific and testable
- Exploration strategies are concrete enough to execute
- Mix of high-confidence and speculative beams
