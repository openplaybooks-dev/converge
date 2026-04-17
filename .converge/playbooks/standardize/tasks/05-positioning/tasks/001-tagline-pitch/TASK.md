---
title: Create Brand Messaging Document
outputs:
  - docs/brand-messaging.md
checks:
  - id: messaging-exists
    cmd: test -f docs/brand-messaging.md
    description: Brand messaging document exists
  - id: messaging-has-tagline
    cmd: "grep -qi 'tagline\\|one-liner' docs/brand-messaging.md"
    description: Document includes tagline
---

Create the canonical brand messaging document for Converge.

**Reference**: Read `docs/converge-gtm.md` — sections 1 (Product Positioning),
2 (Name & Branding), and 11 (Differentiation Messaging).

**Document structure** (`docs/brand-messaging.md`):

1. **Tagline**: "Define done. Converge gets there."
2. **One-liner** (for README, social bios):
   Gap-driven convergence framework for AI agent orchestration.
3. **Elevator pitch** (30 seconds):
   - Problem: existing frameworks make you define HOW
   - Solution: Converge lets you define WHAT "done" looks like
   - Differentiator: gap-driven convergence, not graph execution
4. **Positioning statement** (formal, from GTM doc)
5. **Key messages** (3-5 bullet points for different audiences):
   - For solo entrepreneurs
   - For small teams
   - For engineering leaders
6. **Brand voice guidelines**:
   - Tone: professional, precise, confident (not hype)
   - Avoid: "revolutionary", "game-changing", "AI-powered" (overused)
   - Prefer: specific, measurable claims backed by architecture
7. **Boilerplate** (for press, about pages):
   - Short (1 sentence)
   - Medium (1 paragraph)
   - Long (3 paragraphs)
