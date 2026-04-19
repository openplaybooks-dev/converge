# Task: 04-generate-assets/006-week-06/006-03-meta

# Generate Asset Metadata

Create a machine-readable metadata file for this asset.

## From Specification

Read `SPEC.md` from the previous step.

## Output

Create `assets/illustrations/baby-sizes/week-06.svg.meta.json`:

```json
{
  "id": "week-06",
  "version": "1.0.0",
  "type": "baby-size",
  "format": "svg",
  "fileName": "week-06.svg",
  "semantic": {
    "title": "Week 6 Baby Size",
    "description": "...",
    "tags": ["baby-size", "pregnancy", "week-6", "sweet pea"],
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
    "light": "week-06.svg",
    "dark": null
  },
  "source": {
    "spec": ".converge/playbooks/default/tasks/04-generate-assets/tasks/006-week-06/SPEC.md"
  }
}
```

Ensure the metadata enables:
1. Search/discovery by tags
2. Accessibility labels
3. Usage tracking
4. Variant management