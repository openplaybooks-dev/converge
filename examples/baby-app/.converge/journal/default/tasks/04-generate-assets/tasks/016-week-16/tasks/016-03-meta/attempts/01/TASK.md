# Task: 04-generate-assets/016-week-16/016-03-meta

# Generate Asset Metadata

Create a machine-readable metadata file for this asset.

## From Specification

Read `SPEC.md` from the previous step.

## Output

Create `assets/illustrations/baby-sizes/week-16.svg.meta.json`:

```json
{
  "id": "week-16",
  "version": "1.0.0",
  "type": "baby-size",
  "format": "svg",
  "fileName": "week-16.svg",
  "semantic": {
    "title": "Week 16 Baby Size",
    "description": "...",
    "tags": ["baby-size", "pregnancy", "week-16", "avocado"],
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
    "light": "week-16.svg",
    "dark": null
  },
  "source": {
    "spec": ".converge/playbooks/default/tasks/04-generate-assets/tasks/016-week-16/SPEC.md"
  }
}
```

Ensure the metadata enables:
1. Search/discovery by tags
2. Accessibility labels
3. Usage tracking
4. Variant management