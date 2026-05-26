# Conceptual Design

Generate interactive HTML design concepts for the Converge playbook UI. Each run picks a brand design system and produces a standalone concept + interactive mockup.

## What it does

A 5-task pipeline that turns a brand's design system into a working UI concept:

```
01-setup          → Fetch design system from VoltAgent/awesome-design-md
02-design-spec    → Design director writes a creative brief (design-director skill)
03-build-html     → HTML builder implements the brief as a concept (design-taste-frontend skill)
04-enhance        → Product engineer adds interactivity as a mockup (product-engineer skill)
05-finalize       → Copy outputs to concepts/{brand}/
```

## Output

Each run produces two HTML files in `concepts/{brand}/`:

- **`concept.html`** — The design concept: visual direction, layout, typography, color applied to the playbook data model
- **`mockup.html`** — The interactive mockup: concept + status toggles, expand/collapse, search, filters, running timers, hover effects

Plus supporting files:
- `design-spec.md` — The creative brief from the design director
- `design-system.md` — The brand's design system (fetched from GitHub)

## Quick start

```bash
# From the repo root
converge init --skills

# Run with a specific brand
converge run concept-living-playbook --var design_system=notion

# Run with a random brand (99 available)
converge run concept-living-playbook
```

## Available design systems

99 brand design systems from [VoltAgent/awesome-design-md](https://github.com/VoltAgent/awesome-design-md):

Airbnb, Apple, Binance, BMW, Bugatti, Cal, Claude, Coinbase, Cursor, ElevenLabs, Expo, Ferrari, Figma, Framer, HashiCorp, IBM, Linear, Mastercard, Meta, MiniMax, Mintlify, Miro, Mistral, MongoDB, Nike, Notion, NVIDIA, Ollama, Pinterest, PlayStation, PostHog, Raycast, Replicate, Resend, Revolut, Runway, Sanity, Sentry, Shopify, Slack, SpaceX, Spotify, Starbucks, Stripe, Supabase, Superhuman, Tesla, The Verge, Together.ai, Uber, Vercel, Vodafone, VoltAgent, Warp, Webflow, WIRED, Wise, X.ai, Zapier, and more.

## Skills

| Skill | Role | Used by |
|---|---|---|
| `design-director` | Writes opinionated creative briefs by deeply interpreting brand design systems | Task 02 |
| `design-taste-frontend` | Senior UI/UX engineer that builds HTML from design specs | Task 03 |
| `product-engineer` | Adds product-level interactivity to existing concepts | Task 04 |

## The spec

The playbook implements `docs/design/living-playbook-spec.md` — a specification for visualizing Converge playbook execution as an interactive handbook. Key ideas:

- **Handbook vibe** — structured reference document, not a dashboard
- **Composable nesting** — tasks nest up to 5 levels (gateway → spawner → leaf)
- **Task data** — title, description, body (markdown), inputs, outputs, checks, status
- **Three task modes** — leaf (work), spawner (fan-out), gateway (structure)

## Sample output

The `concepts/notion/` directory contains a complete run using the Notion design system:

- Open `concepts/notion/concept.html` in a browser to see the design concept
- Open `concepts/notion/mockup.html` to see the interactive mockup with status toggles, search, and filters

## Provider

By default uses Claude. To use MiniMax (cheaper), update `.converge/project.yaml`:

```yaml
ai:
  default: claude
  providers:
    claude:
      provider: minimax
      env:
        ANTHROPIC_BASE_URL: https://api.minimax.io/anthropic
        ANTHROPIC_API_KEY: ${ANTHROPIC_API_KEY}
```
