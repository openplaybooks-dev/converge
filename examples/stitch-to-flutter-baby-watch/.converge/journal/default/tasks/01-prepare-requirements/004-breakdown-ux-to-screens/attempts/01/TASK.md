# Task: 01-prepare-requirements/004-breakdown-ux-to-screens

# Breakdown UX to Screens

Invoke **/ux-breakdown** skill to extract structured screen definitions from the UX overview.

## Purpose

This task transforms the high-level UX.md into machine-readable artifacts that downstream tasks can consume. It serves as the bridge between user experience design and implementation.

## What Gets Generated

### 1. `.stitch/SITE.md`
A human-readable sitemap showing:
- Navigation hierarchy
- All routes and their purposes
- User flow diagrams
- Screen relationships

### 2. `.stitch/screens.json`
Machine-readable screen metadata. Contains **both** regular screens and overlay entries.

**Regular screen entry fields:**
- `id` — Unique kebab-case identifier
- `title` — Human-readable name
- `route` — GoRouter path (e.g., `/novel/:id`)
- `description` — What the screen does
- `features` — Key features list
- `priority` — Implementation priority (1 = highest)

**Overlay entry fields** (for bottom sheets, dialogs, persistent bars):
- `id` — Unique kebab-case identifier
- `title` — Human-readable name
- `route` — MUST use `overlay:` prefix (e.g., `overlay:mode-selector`)
- `description` — What the overlay does
- `parentScreenId` — ID of the screen that triggers this overlay
- `overlayType` — One of: `bottom-sheet`, `dialog`, `persistent-bar`
- `features` — Key features list
- `priority` — Implementation priority

Example overlay entry:
```json
{
  "id": "settings-editor",
  "title": "Settings Editor",
  "route": "overlay:settings-editor",
  "description": "Bottom sheet for editing user preferences",
  "parentScreenId": "settings",
  "overlayType": "bottom-sheet",
  "features": ["form-fields", "save-button"],
  "priority": 1
}
```

## Flutter-Specific Notes

- Routes use GoRouter path format: `/path/:param`
- Bottom navigation screens use top-level routes: `/`, `/browse`, `/library`, `/profile`
- Detail screens use nested routes: `/novel/:id`, `/novel/:id/chapter/:chapterId`
- Overlay screens use `overlay:` prefix: `overlay:audio-player`

## Extracting Overlays

You MUST extract overlay entries from UX.md. Look for:
- Bottom sheets (selection pickers, entry forms, detail views)
- Dialogs (confirmations, alerts, settings)
- Persistent bars (audio players, media controls)

Each overlay mentioned or implied in UX.md gets its own entry in `screens.json` with the `overlay:` route prefix, `parentScreenId`, and `overlayType`.

## Success Criteria

After completion:
- `.stitch/SITE.md` exists with clear navigation structure
- `.stitch/screens.json` exists with valid JSON schema
- All screens from UX.md are represented
- All overlays (bottom sheets, dialogs) from UX.md are represented with `overlay:` routes
- Screen IDs are unique and follow kebab-case convention
- Each screen has required fields (id, title, route, description)
- Each overlay has required fields (id, title, route, description, parentScreenId, overlayType)