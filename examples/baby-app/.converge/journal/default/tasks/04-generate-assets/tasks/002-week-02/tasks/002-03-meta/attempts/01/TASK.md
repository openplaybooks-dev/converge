# Task: 04-generate-assets/002-week-02/002-03-meta

# Generate Asset Metadata

Create a machine-readable metadata file for this asset.

## From Specification

Read `SPEC.md` from the previous step.

## Output

Create `assets/illustrations/baby-sizes/week-02.svg.meta.json`:

```json
{
  "id": "week-02",
  "version": "1.0.0",
  "type": "baby-size",
  "format": "svg",
  "fileName": "week-02.svg",
  "semantic": {
    "title": "Week 2 Baby Size",
    "description": "...",
    "tags": ["baby-size", "pregnancy", "week-2", "poppy seed"],
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
    "light": "week-02.svg",
    "dark": null
  },
  "source": {
    "spec": ".converge/playbooks/default/tasks/04-generate-assets/tasks/002-week-02/SPEC.md"
  }
}
```

Ensure the metadata enables:
1. Search/discovery by tags
2. Accessibility labels
3. Usage tracking
4. Variant management