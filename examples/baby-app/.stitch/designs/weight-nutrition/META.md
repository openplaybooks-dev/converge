# META: Weight & Nutrition — Example Selection

## Target Screen
- **Screen:** Weight & Nutrition (data tracking with chart + gauge + stats + history)
- **App Type:** Health & Wellness / Pregnancy Tracker
- **Pattern:** Multi-State (line chart, BMI gauge, quick stats, nutrition tips, weight history list)
- **Key Components:** Weight line chart, BMI 5-segment gauge with needle, quick stats row, nutrition tips list, weight history list, FAB, bottom tab navigation

## Example Scoring

| Dimension | Weight | system/multi-state-screen.html | system/single-screen.html | system/celebration-screen.html |
|-----------|--------|-------------------------------|---------------------------|-------------------------------|
| App Type | High | Same (pregnancy tracker) | Same | Same |
| Platform | High | Mobile 375px | Mobile 375px | Mobile 375px |
| Interaction Density | Medium | Medium (matches — chart, gauge, list) | Low | Low |
| Visual Personality | Medium | Pastel/warm (matches) | Pastel/warm | Pastel/warm |
| Component Overlap | Medium | All components present (chart, gauge, stats, tips, history) | Dashboard cards, no chart | Celebration, milestone |
| Screen Pattern | High | Multi-State (matches) | Single Screen | Celebration |
| **Total** | | **Strong Match** | Weak | Weak |

## Selected Example
**`system/multi-state-screen.html`** — Strong match.

This is the same app's weight & nutrition reference mockup. It contains the exact Scaffold structure, weight line chart with Lilac Pulse stroke and gradient fill, 5-segment BMI gauge with needle indicator, quick stats row, nutrition tips list, weight history entries, FAB, and bottom tab navigation. Use directly as the structural base, adapting to use `data-flutter` attributes and Tailwind classes per the glossary.
