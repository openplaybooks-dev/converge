# Task: 04-generate-assets/004-week-04/004-01-analyze

# Analyze Asset Requirements

Analyze the design system, data models, and screen usage to define requirements for this asset.

## Context

**Baby Size Illustration — Week 4**
- Size comparison: "poppy seed" 🌱
- Trimester: 1
- Used in: HeroIllustrationCard on HomeScreen
- Data source: WeekContent.sizeComparison field

## Analysis Tasks

1. **Review DESIGN.md** — Extract color palette, corner radius, typography
2. **Check model usage** — How is this asset referenced in code?
3. **Identify constraints** — Dimensions, file format, naming conventions
4. **Define variants** — Light/dark mode, states (active/inactive)

## Output

Create `requirements.json`:

```json
{
  "assetId": "week-04",
  "assetType": "baby-size",
  "fileName": "week-04.svg",
  "dimensions": { "width": 200, "height": 200 },
  "style": {
    "colorPalette": ["primary", "secondary", "accent"],
    "strokeWidth": 1.5,
    "cornerRadius": "8px"
  },
  "content": {
    "subject": "...",
    "mood": "friendly",
    "background": "transparent"
  },
  "variants": ["light", "dark"],
  "usage": {
    "screens": ["HomeScreen"],
    "widget": "HeroIllustrationCard"
  }
}
```