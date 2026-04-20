# Task: 04-generate-assets/012-week-12/012-03-meta

# Generate Asset Metadata

Create a machine-readable metadata file for this asset.

## From Specification

Read `SPEC.md` from the previous step.

## Output

Create `assets/illustrations/baby-sizes/week-12.svg.meta.json`:

```json
{
  "id": "week-12",
  "version": "1.0.0",
  "type": "baby-size",
  "format": "svg",
  "fileName": "week-12.svg",
  "semantic": {
    "title": "Week 12 Baby Size",
    "description": "...",
    "tags": ["baby-size", "pregnancy", "week-12", "plum"],
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
    "light": "week-12.svg",
    "dark": null
  },
  "source": {
    "spec": ".converge/playbooks/default/tasks/04-generate-assets/tasks/012-week-12/SPEC.md"
  }
}
```

Ensure the metadata enables:
1. Search/discovery by tags
2. Accessibility labels
3. Usage tracking
4. Variant management