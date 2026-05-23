---
name: prototype-wiring
description: Methodology for wiring individual screen designs into an interactive, clickable prototype site
---

# Prototype Wiring Skill

## When to Use This Skill

Use this skill after all screen designs are complete, to connect them into a navigable prototype that stakeholders can click through.

## Architecture

The prototype is a simple static site with no build step, no frameworks, no dependencies:

```
.design/prototype/
├── index.html          # Shell with sidebar nav + iframe viewer
├── navigation.js       # Screen data + navigation logic
└── styles/
    └── prototype.css   # Prototype viewer styles
```

## How It Works

### 1. Screen Discovery
Read `docs/product/features/catalog.json` to get the epic → feature → view hierarchy.
For each view, check if `.design/screens/<epic-id>/<feature-id>/<view-id>/design.html` exists.
If it does, include it in the prototype navigation.

### 2. Sidebar Navigation
Build a hierarchical sidebar:
```
Epic 1: User Management
  Feature 1: Authentication
    → Login Form
    → Registration Form
    → Password Reset
  Feature 2: Profile
    → View Profile
    → Edit Profile
    → Notification Settings

Epic 2: Content
  ...
```

### 3. Screen Viewer
An `<iframe>` loads the `design.html` for the selected screen:
- Clicking a nav item loads that screen in the iframe
- Browser back/forward buttons work via `history.pushState`
- URL hash encodes the screen: `#screen=5`
- Toolbar shows current screen path (Epic / Feature / View)

### 4. Navigation Logic
```javascript
// In navigation.js
function loadScreen(index) {
    const screen = SCREENS[index];
    document.getElementById('screen-viewer').src = screen.designPath;
    updateActiveNav(index);
    window.history.pushState({ screenIndex: index }, '', `#screen=${index}`);
}
```

### 5. Mobile Responsive
On screens < 768px:
- Sidebar is hidden by default
- A hamburger toggle reveals it
- iframe takes full width

## HTML Structure

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Product Design Prototype — N Screens</title>
    <link rel="stylesheet" href="styles/prototype.css">
    <link rel="stylesheet" href="../../system/tokens.css">
</head>
<body>
    <div class="prototype-container">
        <nav id="sidebar" aria-label="Screen navigation">
            <!-- Populated by navigation.js -->
        </nav>
        <div id="viewer-area">
            <div id="viewer-toolbar">
                <span class="breadcrumb">Epic / Feature / View</span>
                <span class="screen-title" id="current-screen-title">Loading...</span>
            </div>
            <iframe id="screen-viewer" title="Screen preview" src="about:blank"></iframe>
        </div>
    </div>
    <script src="navigation.js"></script>
</body>
</html>
```

## CSS Structure

```css
.prototype-container {
    display: grid;
    grid-template-columns: 280px 1fr;
    height: 100vh;
}

#sidebar {
    overflow-y: auto;
    padding: var(--space-md);
}

.nav-group h3 { /* Epic titles */ }
.nav-subgroup h4 { /* Feature titles */ }
.nav-item { /* Screen buttons */ }
.nav-item.active { /* Currently selected */ }

#viewer-area { display: flex; flex-direction: column; }

#screen-viewer {
    flex: 1;
    border: none;
    width: 100%;
    height: 100%;
}
```

## Rules

1. **No build step** — the prototype is pure HTML/CSS/JS, openable directly in a browser
2. **No external dependencies** — no npm packages, no CDNs, no frameworks
3. **All screens linked** — every view with a design.html must be navigable
4. **History support** — back/forward buttons work correctly
5. **Design system tokens** — prototype styles use `.design/system/tokens.css`
6. **Responsive** — works on mobile, tablet, desktop
7. **Accessible** — ARIA labels on navigation, keyboard focus, screen reader support

## Output

Three files that together create a fully interactive prototype site:
- `.design/prototype/index.html` — the shell
- `.design/prototype/navigation.js` — screen data and navigation logic
- `.design/prototype/styles/prototype.css` — viewer styles

The prototype can be opened directly in a browser (no server needed) and used to review all screen designs in context.
