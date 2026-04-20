# Task: 04-generate-assets/018-week-18/018-03-meta

# Generate Asset Metadata

Create a machine-readable metadata file for this asset.

## From Specification

Read `SPEC.md` from the previous step.

## Output

Create `assets/illustrations/baby-sizes/week-18.svg.meta.json`:

```json
{
  "id": "week-18",
  "version": "1.0.0",
  "type": "baby-size",
  "format": "svg",
  "fileName": "week-18.svg",
  "semantic": {
    "title": "Week 18 Baby Size",
    "description": "...",
    "tags": ["baby-size", "pregnancy", "week-18", "bell pepper"],
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
    "light": "week-18.svg",
    "dark": null
  },
  "source": {
    "spec": ".converge/playbooks/default/tasks/04-generate-assets/tasks/018-week-18/SPEC.md"
  }
}
```

Ensure the metadata enables:
1. Search/discovery by tags
2. Accessibility labels
3. Usage tracking
4. Variant management