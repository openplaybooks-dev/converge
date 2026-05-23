---
id: 07-wire-prototype
title: Wire Interactive Prototype
description: Connect all screen designs into a clickable prototype site with navigation
blocking: true
depends_on:
  - 06-views
inputs:
  - docs/product/features/*/catalog.json
  - docs/product/features/*/*/views.json
  - .design/screens/**/*
  - .design/system/tokens.css
  - .design/system/base.css
  - .design/system/components.css
outputs:
  - .design/prototype/index.html
  - .design/prototype/navigation.js
  - .design/prototype/styles/prototype.css
checks:
  - id: prototype-index-exists
    cmd: test -f .design/prototype/index.html
    description: Prototype index.html exists
  - id: prototype-nav-exists
    cmd: test -f .design/prototype/navigation.js
    description: Prototype navigation.js exists
  - id: prototype-styles-exist
    cmd: test -f .design/prototype/styles/prototype.css
    description: Prototype CSS exists
  - id: prototype-references-screens
    cmd: python3 -c "
import json, glob, os
html_files = glob.glob('.design/screens/**/design.html', recursive=True)
nav_content = open('.design/prototype/navigation.js').read()
missing = []
for f in html_files:
    screen_id = f.replace('.design/screens/', '').replace('/design.html', '')
    if screen_id not in nav_content:
        missing.append(screen_id)
if missing:
    print(f'Missing screens in navigation: {missing[:5]}...')
    exit(1)
print(f'All {len(html_files)} screens referenced in navigation')
"
    description: All designed screens are navigable from prototype
  - id: prototype-valid-html
    cmd: grep -q '<!DOCTYPE html>' .design/prototype/index.html
    description: Valid HTML5 structure
skills:
  - prototype-wiring
---

# Wire Interactive Prototype

Create a clickable, navigable prototype by wiring all individual screen designs together. The prototype serves as a living mockup that stakeholders can click through to validate the design before development begins.

## Body

Read `docs/product/features/catalog.json` to discover the epic → feature → view hierarchy, then generate the prototype site.

```bash
#!/bin/bash
# 07-wire-prototype body — generate interactive prototype site
# Walks per-epic catalog tree (no master catalog)

mkdir -p .design/prototype/styles

python3 -c "
import json, glob, os

# Discover all screen design files by walking the per-epic catalog tree
screens = []
for epic_catalog_path in sorted(glob.glob('docs/product/features/*/catalog.json')):
    with open(epic_catalog_path) as f:
        epic_data = json.load(f)

    epic_id = epic_data.get('epic_id', os.path.basename(os.path.dirname(epic_catalog_path)))
    epic_title = epic_data.get('epic_title', epic_id)

    for feature in epic_data.get('features', []):
        feature_id = feature['id']
        feature_title = feature.get('title', feature_id)
        views_file = f'docs/product/features/{epic_id}/{feature_id}/views.json'

        if not os.path.exists(views_file):
            continue

        with open(views_file) as vf:
            views_data = json.load(vf)

        for view in views_data.get('views', []):
            view_id = view['id']
            view_title = view.get('title', view_id)
            design_html = f'.design/screens/{epic_id}/{feature_id}/{view_id}/design.html'
            if os.path.exists(design_html):
                screens.append({
                    'epic_id': epic_id,
                    'epic_title': epic_title,
                    'feature_id': feature_id,
                    'feature_title': feature_title,
                    'view_id': view_id,
                    'view_title': view_title,
                    'design_path': design_html
                })

# Generate navigation.js
nav_entries = []
for s in screens:
    nav_entries.append(json.dumps({
        'epicId': s['epic_id'],
        'epicTitle': s['epic_title'],
        'featureId': s['feature_id'],
        'featureTitle': s['feature_title'],
        'viewId': s['view_id'],
        'viewTitle': s['view_title'],
        'designPath': s['design_path']
    }))

with open('.design/prototype/navigation.js', 'w') as f:
    f.write('// Prototype Navigation Data\\n')
    f.write('const SCREENS = [\\n')
    f.write(',\\n'.join(nav_entries))
    f.write('\\n];\\n')
    f.write('''
// Screen navigation logic
let currentScreenIndex = 0;

function loadScreen(index) {
    const screen = SCREENS[index];
    if (!screen) return;
    currentScreenIndex = index;
    const iframe = document.getElementById('screen-viewer');
    iframe.src = screen.designPath;
    updateActiveNav(index);
    window.history.pushState({ screenIndex: index }, '', \`#screen=\${index}\`);
}

function updateActiveNav(index) {
    document.querySelectorAll('.nav-item').forEach((el, i) => {
        el.classList.toggle('active', i === index);
    });
}

function buildSidebar() {
    const sidebar = document.getElementById('sidebar');
    const grouped = {};
    SCREENS.forEach((screen, idx) => {
        const key = screen.epicTitle;
        if (!grouped[key]) grouped[key] = {};
        const fkey = screen.featureTitle;
        if (!grouped[key][fkey]) grouped[key][fkey] = [];
        grouped[key][fkey].push({ ...screen, index: idx });
    });

    let html = '';
    for (const [epic, features] of Object.entries(grouped)) {
        html += \`<div class=\"nav-group\"><h3>\${epic}</h3>\`;
        for (const [feature, screens] of Object.entries(features)) {
            html += \`<div class=\"nav-subgroup\"><h4>\${feature}</h4>\`;
            for (const screen of screens) {
                html += \`<button class=\"nav-item\" data-index=\"\${screen.index}\" onclick=\"loadScreen(\${screen.index})\">\${screen.viewTitle}</button>\`;
            }
            html += '</div>';
        }
        html += '</div>';
    }
    sidebar.innerHTML = html;
}

function handleBackForward(event) {
    if (event.state && event.state.screenIndex !== undefined) {
        loadScreen(event.state.screenIndex);
    }
}

window.addEventListener('popstate', handleBackForward);
window.addEventListener('DOMContentLoaded', () => {
    buildSidebar();
    const hash = window.location.hash;
    const match = hash.match(/#screen=(\\d+)/);
    if (match) {
        loadScreen(parseInt(match[1]));
    } else {
        loadScreen(0);
    }
});
''')

# Generate prototype.css
with open('.design/prototype/styles/prototype.css', 'w') as f:
    f.write('''/* Prototype Viewer Styles */
@import url('../../system/tokens.css');

.prototype-container {
    display: grid;
    grid-template-columns: 280px 1fr;
    height: 100vh;
    overflow: hidden;
}

#sidebar {
    background: var(--color-neutral-50, #f8f9fa);
    border-right: 1px solid var(--color-neutral-200, #e9ecef);
    overflow-y: auto;
    padding: var(--space-md, 16px);
    font-family: var(--font-body, -apple-system, sans-serif);
}

.nav-group { margin-bottom: var(--space-md, 16px); }
.nav-group h3 {
    font-size: var(--text-sm, 14px);
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: var(--color-neutral-600, #6c757d);
    margin: 0 0 var(--space-xs, 4px);
}

.nav-subgroup { margin-left: var(--space-sm, 8px); }
.nav-subgroup h4 {
    font-size: var(--text-xs, 12px);
    font-weight: 500;
    color: var(--color-neutral-500, #adb5bd);
    margin: var(--space-xs, 4px) 0;
}

.nav-item {
    display: block;
    width: 100%;
    text-align: left;
    padding: var(--space-xs, 4px) var(--space-sm, 8px);
    border: none;
    background: transparent;
    border-radius: var(--radius-sm, 4px);
    font-size: var(--text-sm, 14px);
    color: var(--color-neutral-700, #495057);
    cursor: pointer;
    transition: background-color 0.15s ease;
}

.nav-item:hover { background: var(--color-neutral-100, #f1f3f5); }
.nav-item.active {
    background: var(--color-primary-50, #e3f2fd);
    color: var(--color-primary-700, #1565c0);
    font-weight: 500;
}

#viewer-area {
    display: flex;
    flex-direction: column;
    overflow: hidden;
}

#viewer-toolbar {
    display: flex;
    align-items: center;
    padding: var(--space-sm, 8px) var(--space-md, 16px);
    border-bottom: 1px solid var(--color-neutral-200, #e9ecef);
    background: white;
    gap: var(--space-sm, 8px);
}

#viewer-toolbar .screen-title {
    font-weight: 600;
    font-size: var(--text-sm, 14px);
}

#viewer-toolbar .breadcrumb {
    font-size: var(--text-xs, 12px);
    color: var(--color-neutral-500, #adb5bd);
}

#screen-viewer {
    flex: 1;
    border: none;
    width: 100%;
    height: 100%;
    background: white;
}

@media (max-width: 768px) {
    .prototype-container {
        grid-template-columns: 1fr;
    }
    #sidebar {
        display: none; /* Could be a toggle on mobile */
    }
}
''')

# Generate index.html
with open('.design/prototype/index.html', 'w') as f:
    f.write(f'''<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Product Design Prototype — {len(screens)} Screens</title>
    <link rel="stylesheet" href="styles/prototype.css">
    <link rel="stylesheet" href="../../system/tokens.css">
</head>
<body>
    <div class="prototype-container">
        <nav id="sidebar" aria-label="Screen navigation">
            <!-- Populated by navigation.js -->
            <p>Loading screens...</p>
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
''')

print(f'Prototype generated with {len(screens)} screens')
"

echo "Interactive prototype wired at .design/prototype/index.html"
```

## Output

A self-contained interactive prototype site at `.design/prototype/` that can be opened in any browser. Features:
- Sidebar navigation grouped by Epic → Feature → View
- Screen viewer iframe showing each design.html
- Browser history support (back/forward buttons)
- Responsive layout (collapsible sidebar on mobile)
- Design system tokens for consistent styling
