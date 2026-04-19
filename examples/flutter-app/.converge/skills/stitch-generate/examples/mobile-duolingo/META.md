# Duolingo

- **App Type:** Mobile language learning (gamified education)
- **Tags:** gamified, mobile-first, playful, colorful, progress-tracking, quiz
- **Platform:** Mobile-first (375px)
- **Interaction Density:** High

## Screens

| File | Pattern | Description |
|------|---------|-------------|
| `single-screen.html` | Single Screen | Skill tree with node states (active/completed/locked), top stats bar, bottom tab navigation |
| `multi-state-screen.html` | Multi-State | Quiz question with answer cards showing default/selected/correct/incorrect states, segmented progress bar, feedback banner |
| `celebration-screen.html` | Celebration | Lesson complete with confetti particles, animated XP counter, staggered stat reveals, trophy illustration |

## Key Patterns

- Skill nodes with circular state indicators (locked/active/completed) and connecting path lines
- Bottom tab navigation with icon + label and active state
- Segmented progress bar with filled/empty segments
- Answer cards with border + background state transitions
- Feedback banner sliding up from bottom with correct/incorrect variants
- Confetti particle burst with CSS animations
- Animated counters using CSS @keyframes
- Staggered reveal animations with `animation-delay`
