# Task: 04-generate-assets/003-week-03/003-03-meta

# Generate Asset Metadata

Create a machine-readable metadata file for this asset.

## From Specification

Read `SPEC.md` from the previous step.

## Output

Create `assets/illustrations/baby-sizes/week-03.svg.meta.json`:

```json
{
  "id": "week-03",
  "version": "1.0.0",
  "type": "baby-size",
  "format": "svg",
  "fileName": "week-03.svg",
  "semantic": {
    "title": "Week 3 Baby Size",
    "description": "...",
    "tags": ["baby-size", "pregnancy", "week-3", "poppy seed"],
    "alt": "..."
  },
  "usage": {
    "screens": ["HomeScreen"],
    "widgets": ["HeroIllustrationCard"],
    "accessibility": {
      "label": "...",
      "role": "image"
    }
  },
  "variants": {
    "light": "week-03.svg",
    "dark": null
  },
  "source": {
    "spec": ".converge/playbooks/default/tasks/04-generate-assets/tasks/003-week-03/SPEC.md"
  }
}
```

Ensure the metadata enables:
1. Search/discovery by tags
2. Accessibility labels
3. Usage tracking
4. Variant management