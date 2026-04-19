# Task: 04-generate-assets/015-week-15/015-03-meta

# Generate Asset Metadata

Create a machine-readable metadata file for this asset.

## From Specification

Read `SPEC.md` from the previous step.

## Output

Create `assets/illustrations/baby-sizes/week-15.svg.meta.json`:

```json
{
  "id": "week-15",
  "version": "1.0.0",
  "type": "baby-size",
  "format": "svg",
  "fileName": "week-15.svg",
  "semantic": {
    "title": "Week 15 Baby Size",
    "description": "...",
    "tags": ["baby-size", "pregnancy", "week-15", "apple"],
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
    "light": "week-15.svg",
    "dark": null
  },
  "source": {
    "spec": ".converge/playbooks/default/tasks/04-generate-assets/tasks/015-week-15/SPEC.md"
  }
}
```

Ensure the metadata enables:
1. Search/discovery by tags
2. Accessibility labels
3. Usage tracking
4. Variant management