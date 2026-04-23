---
id: frontier-explore-beam
title: Beam Exploration
---

# Beam Exploration

Execute a single research beam following its defined methodology.

## Process

1. Read the beam definition (direction, approach, hypothesis, strategy)
2. Execute the exploration strategy step by step
3. For each insight discovered:
   - State the claim clearly
   - Document supporting evidence
   - Assess confidence (0-1) based on evidence quality
   - Assess novelty (0-1) relative to known territory
   - Note connections to other potential insights
4. Test the beam's hypothesis against gathered evidence
5. Record dead ends — approaches that were tried but failed
6. Note unexpected findings that don't fit the original hypothesis
7. Suggest follow-up directions for future beams

## Key Principle

Each beam uses its OWN methodology. Do not impose a standard research framework. If the beam says "use adversarial analysis," reason adversarially. If it says "use analogical reasoning," find analogies. Follow the beam's defined approach.

## Outputs

- `beam-{id}.json` — exploration results with insights, dead ends, and follow-ups

## Quality Criteria

- At least 2 insights per beam (even dead-end beams should yield negative results)
- Each insight has evidence and confidence assessment
- Hypothesis outcome is explicitly stated (supported/refuted/modified/inconclusive)
- Dead ends explain WHY the approach failed (not just that it failed)
- Unexpected findings are captured (not filtered to fit the hypothesis)
