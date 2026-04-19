# Selecting Examples

How to choose the best reference example when generating a new HTML design mockup.

**Input:** Target app's DESIGN.md + screen prompt
**Output:** The example directory to use as structural reference

## Procedure

1. Read each `examples/{app}/META.md`
2. Score each example against the target on the dimensions below
3. Pick the highest-scoring example
4. If no example scores well, fall back to the one with the closest structural similarity

## Scoring Dimensions

Compare the target app against each example on these dimensions, weighted by importance:

| Dimension | Weight | What to Compare |
|---|---|---|
| **App Type** | High | Is it the same category? (education, e-commerce, fitness, social, productivity) |
| **Platform** | High | Same device target? (phone, tablet, cross-platform) |
| **Interaction Density** | Medium | Similar number of interactive states? (Low: mostly static; Medium: forms/toggles; High: multi-state, gamified) |
| **Visual Personality** | Medium | Similar aesthetic? (playful vs corporate, colorful vs minimal, rounded vs sharp) |
| **Component Overlap** | Medium | Does the example contain similar UI patterns? (cards, lists, navigation, progress indicators, modals) |
| **Screen Pattern Match** | High | Does the example have the right pattern file? (Single Screen, Multi-State, Celebration) |

## Decision Process

### Strong Match (use directly)
The example shares app type AND has the right screen pattern file. Use its Scaffold structure closely — same navigation pattern, similar content hierarchy — replacing tokens with the target design system.

### Moderate Match (adapt structure)
Different app type but similar interaction density and component overlap. Use the example's layout rhythm and mobile patterns (scroll behavior, card layouts, bottom navigation), but restructure the content for the target domain.

### Weak Match (extract patterns only)
No good category match. Extract only low-level patterns: phone frame setup, Scaffold chrome, animation approach, icon strategy. Build the screen layout from the spec.

## Example

**Target:** A novel reader app with a home feed showing continue reading and trending novels.

**Scoring against airbnb:**
- App Type: Travel vs Reading — different category, but both content-browsing → Medium
- Platform: Both phone 375pt, Scaffold + bottom nav → High
- Interaction Density: Both medium (browsing, tapping into detail screens) → High
- Visual Personality: Both warm, content-forward, card-based → High
- Component Overlap: Cards, horizontal scroll, category chips, bottom nav, hero transitions → High
- Screen Pattern: single-screen.html exists → High

**Result:** Strong match. Use airbnb's `single-screen.html` as the structural base — same Scaffold chrome, similar scroll and card patterns.
