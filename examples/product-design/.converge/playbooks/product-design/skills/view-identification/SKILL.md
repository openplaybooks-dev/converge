---
name: view-identification
description: Methodology for identifying and scoping UI views from feature requirements
---

# View Identification Skill

## View Discovery Patterns

| User Task | Typical Views |
|-----------|---------------|
| Browse content | List view, Grid view, Search, Filter |
| View details | Detail view, Preview, Gallery |
| Create/edit | Form view, Editor, Wizard |
| Manage settings | Settings view, Preferences, Configuration |
| Navigate | Dashboard, Home, Menu, Breadcrumbs |
| Receive feedback | Success, Error, Confirmation, Toast |
| Authenticate | Login, Registration, Forgot password |

## View Scoping Rules

- A view should be completable in 3-5 user actions
- If it requires more, split it
- Too coarse: "Settings" → split into Account, Notifications, Privacy
- Too fine: "Username Field" → part of a larger view
- Just right: "Account Settings" — clear scope, specific purpose

## View Documentation

Each view needs:
- id (kebab-case), title, description
- target_persona, priority
- **sections**: sub-areas of the view (id, title, layout, components[], data_fields[], states[])
- **tabs**: tabbed content areas (id, label, content_type, sort_or_filter)
- **modals**: dialogs/overlays (id, trigger, type, content)
- interactions (action → response pairs)
- data_requirements
- states (empty, loading, populated, error)

## Section Layouts

| Layout Type | Description |
|-------------|-------------|
| `single-column` | Stacked content, one column |
| `two-column` | Side-by-side content areas |
| `card-grid` | Grid of cards (N columns based on viewport) |
| `horizontal-form` | Label-input pairs in a row |
| `sidebar-content` | Fixed sidebar + main content area |
| `dashboard` | Multiple widgets/cards in a grid |

## Modal Types

| Type | Description |
|------|-------------|
| `centered-dialog` | Overlay centered on screen |
| `side-drawer` | Slides in from right/left edge |
| `fullscreen` | Takes over entire viewport |
| `confirmation` | Small dialog with yes/no action |

## Output

**views.json** per feature with all views defined, each containing sections/tabs/modals sub-catalogs. Sections, tabs, and modals are documented as data within views.json — they are NOT separate spawn targets. The view-design template interpolates this structured data to produce SPEC.md, mockup.html, and design.html.
