# mage Class Style Guide

## Overview
The mage class embodies arcane mystery and flowing magical power. Visually defined by long robes, ritual staves, and an aura of supernatural energy. Silhouettes are elongated and graceful — heads slightly oversized, bodies obscured by drape and motion. Designs read as enigmatic and otherworldly at first glance, contrasting the grounded stances of warriors and the agile poise of rogues. Hand-drawn 2D in the project's painterly style: soft shading, clean rounded silhouettes, warm storybook lighting with subtle rim light to suggest channeled magic.

## Color Palette
- **Primary**: Dark purple (#2A0A4A), black (#0A0A0A) — robe body and hood interior.
- **Secondary**: Deep magenta (#6B1F8A), midnight blue (#1A1A3A) — robe trim and shadow folds.
- **Accent (magical)**: Bright purple (#B955FF), cyan-violet glow (#9DD0FF) — eyes, staff orb, casting effects, rim light.
- **Neutrals**: Bone white (#E8DCC8), warm brown (#5A3820) — bone trinkets, leather staps, staff shaft.
- Constraint: 16-color palette per project rules. Magical glow is the only saturated highlight; everything else stays muted.

## Materials
- **Armor type**: robes — no metal plate. Layered cloth with hood, draped sleeves, ankle-length hem. Cloth reads as heavy wool or velvet, with subtle painterly texture.
- **Clothing**: inner tunic and sash visible at neck and waist; leather belt with pouches for components.
- **Weapon style**: staff — wooden shaft (gnarled or carved), crowned with a glowing orb, crystal, or bound rune. Optional bone or metal fittings near the head. Length roughly 1.2× character height.
- **Trinkets**: bone pendants, woven cord, small bound scrolls at the belt.

## Design Elements
- **Hood**: deep, casting a soft shadow that obscures the upper face — only glowing eyes visible.
- **Glowing eyes**: signature class identifier. Always rendered as the brightest point on the character.
- **Flowing hem**: robe terminates in a wavy, slightly tattered edge that trails behind the movement direction.
- **Staff posture**: held vertically at rest in the dominant hand; orb floats just above the staff head.
- **Magical particles**: small, sparse motes near the staff orb and eyes — never busy, just enough to imply channeled energy.
- **Asymmetry**: one shoulder typically more exposed than the other; sash draped diagonally.

## Animation Style
- **Idle**: gentle vertical bob (2–3 px). Robe hem ripples slowly as if in a faint draft. Staff orb pulses softly (low-amplitude brightness loop). Eyes flicker subtly.
- **Walk**: flowing rather than striding — feet barely visible under the hem, which sways in counter-rhythm to the body. Upper body floats forward; staff held steady in dominant hand, slight bob. Suggestion of weightlessness without leaving the ground.
- **Pose style**: tall, vertical, slightly stooped forward when channeling. Avoids wide stances. Movements emphasize cloth physics over limb articulation.
- **Frame counts**: 4 frames idle, 8 frames walk (per project tech spec).

## Characters in Class
- shadow-mage (Malachar) — dark purple/black robes, glowing purple eyes, staff with bound rune; the canonical exemplar of the class.
