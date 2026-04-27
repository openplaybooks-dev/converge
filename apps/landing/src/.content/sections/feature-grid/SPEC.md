# Section Spec: feature-grid

## 1. Section ID + Title

- **id**: `feature-grid`
- **title**: `Six differentiators`

## 2. Intent

3×2 grid of differentiator cards sourced from README.md "Why Converge?" bullets. Each card: lucide icon + headline + ≤180-char body. No invented copy — every text string traces to a named source file.

## 3. Component

- **Name**: `FeatureGrid`
- **Location**: `apps/landing/src/components/sections/FeatureGrid.astro`
- **Framework**: Astro (static)

## 4. Content Sources

| Source file | Used for |
|---|---|
| `README.md` lines 22–34 | "Why Converge?" bullet copy for each card |
| `apps/landing/.content/brand.json` | tagline (`Define done. Converge gets there.`), palette tokens |

No other sources are valid for this section.

## 5. Card Content

Each card maps to one "Why Converge?" bullet:

1. **Goal-driven, not step-driven** — `README.md` line 24
   - Icon: `Target` (lucide)
   - Body: Describe the declarative model (agent figures path, user declares outcome)

2. **Deterministic checks, not AI judgement** — `README.md` line 26
   - Icon: `CheckCircle` (lucide)
   - Body: Shell commands verify; agent has zero latitude on whether predicates pass

3. **Strategy-based self-correction** — `README.md` line 28
   - Icon: `RefreshCw` (lucide)
   - Body: Failed checks dispatch to named repair pipelines; each failure type gets targeted fix

4. **Dynamic task spawning** — `README.md` line 30
   - Icon: `GitBranch` (lucide)
   - Body: WBS scripts decompose work at runtime based on project state; scope emerges from problem

5. **Crash-safe checkpoints** — `README.md` line 32
   - Icon: `Save` (lucide)
   - Body: Kill process, restart, pick up exactly where left off; long-running workflows survive interrupts

6. **Multi-provider** — `README.md` line 34
   - Icon: `Layers` (lucide)
   - Body: Claude, Gemini, Kimi, Qwen via `agentfn` abstraction; no vendor lock-in

## 6. Required Props

```typescript
interface FeatureGridProps {
  features: Array<{
    icon: string;      // lucide icon name
    headline: string;  // ≤8 words
    body: string;      // ≤180 chars
  }>;
}
```

## 7. Layout / States

Single static state. Grid layout:

```
[Card 1] [Card 2] [Card 3]
[Card 4] [Card 5] [Card 6]
```

- **Desktop**: 3 columns, equal width
- **Tablet (768px–)**: 2 columns
- **Mobile (<768px)**: 1 column, cards stack vertically
- Grid gap: `var(--cv-space-4)` (24px)
- Card padding: `var(--cv-space-6)` (32px)
- Card background: `var(--cv-bg-elev)` from palette
- Border: `1px solid var(--cv-border)`

## 8. Acceptance Criteria

- [ ] Renders 6 cards in a 3×2 grid on desktop
- [ ] Each card shows: lucide icon + headline + body text
- [ ] All card body text is ≤180 characters
- [ ] No console errors on load
- [ ] Mobile responsive at 320px (single column)
- [ ] All copy traces to `README.md` or `brand.json` — zero invented marketing text
- [ ] Uses brand palette tokens for all colors (no hardcoded hex)
- [ ] Icon color uses `var(--cv-indigo)` from palette
- [ ] Hover state: card elevates slightly (box-shadow), icon color shifts to `var(--cv-cyan)`
- [ ] Keyboard accessible: cards are focusable, focus ring uses `var(--cv-cyan)`

## 9. Banned

- Invented copy not traceable to `README.md` or `brand.json`
- Hardcoded hex colors (use palette tokens only)
- Cards with equal visual weight — headlines should vary in emphasis (weight/size hierarchy)
- Using non-lucide icon library
- Aspect-ratio lockout that breaks at 320px