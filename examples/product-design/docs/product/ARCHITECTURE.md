# Information Architecture — Portfolio Page

## Content Hierarchy

```
Portfolio (single page, /)
├── Hero (#hero)
│   ├── Name (h1)
│   ├── Tagline (p)
│   └── CTA link → #work
├── Work (#work)
│   ├── Section heading (h2)
│   ├── Intro text
│   └── Project grid (ul > li > img + title + category)
├── About (#about)
│   ├── Section heading (h2)
│   ├── Bio (2–3 paragraphs)
│   └── Process note (optional)
└── Contact (#contact)
    ├── Section heading (h2)
    ├── Availability status
    └── Email link
```

**Depth**: Single level — all content is a direct child of `/`.
**Breadth**: 4 sections, no sub-pages in v1.

---

## Naming Conventions

### IDs and Fragment Anchors

| Element | ID | Pattern |
|---------|-----|---------|
| Hero section | `hero` | `#${section-name}` |
| Work section | `work` | `#${section-name}` |
| About section | `about` | `#${section-name}` |
| Contact section | `contact` | `#${section-name}` |

- IDs are lowercase, hyphenated, matching section names
- Fragment anchors are the only URL routing mechanism (no child paths)

### Paths

| Path | Type | Purpose |
|------|------|---------|
| `/` | page root | Single-page portfolio |
| `/docs/product/` | documentation | Design artifacts |

### Component IDs (for JS hooks and CSS)

| Component | ID | Notes |
|-----------|-----|-------|
| Navigation | `#nav` | Fixed top bar |
| Project grid | `#project-grid` | ul element |
| Project card | `.project-card` | li items |
| Contact link | `#contact-email` | Email anchor |

### File Naming

```
/ (root)
└── index.html           # Entry point

.design/
├── system/
│   ├── tokens.css       # CSS custom properties
│   ├── base.css         # Reset, typography, spacing
│   └── components.css  # Reusable patterns
├── screens/
│   └── (per-view HTML files)
└── prototype/
    └── index.html      # Interactive prototype

docs/product/
├── PRODUCT_BRIEF.md
├── SCOPE.md
├── SITEMAP.md           # Navigation map (this file's sibling)
├── ARCHITECTURE.md      # IA decisions (this file)
├── USER_JOURNEYS.md
└── research/
    ├── RESEARCH_REPORT.md
    ├── user-personas.md
    └── competitive-analysis.md
```

---

## Navigation Structure

### Primary Navigation

- **Location**: Fixed top bar, always visible on scroll
- **Items**: Work, About, Contact (no Hero link — implied by logo/home)
- **Behavior**: Smooth-scroll to anchored section on click
- **No dropdowns**: Flat structure, no sub-menus
- **Mobile**: Hamburger icon collapses nav to overlay

### Anchor Flow

```
Landing on / → #hero (top of page)
Nav: #work → scroll to work grid
Nav: #about → scroll to bio section
Nav: #contact → scroll to email/link section
```

### Outbound Links

| Destination | Location | Behavior |
|-------------|----------|----------|
| Project images | `#work` grid | Lightbox or external link (out of scope v1) |
| Email | `#contact` | `mailto:` link |
| Social links | `#about` | External links open in new tab |

### Scroll Behavior

- Smooth scroll native CSS (`scroll-behavior: smooth`)
- No JS scroll libraries required
- `scroll-margin-top` on sections to account for fixed nav height

---

## Out of Scope (v1)

- No blog or article routes (`/blog`, `/posts/:id`)
- No project detail pages (`/projects/:id`)
- No authentication or user accounts
- No shopping or service listing pages
- No multi-language support

---

## Relationship to Other Artifacts

| Artifact | Purpose | Link to IA |
|----------|---------|------------|
| SITEMAP.md | Visualizes page structure | Defines sections and anchors |
| SCOPE.md | MVP boundaries | Confirms single-page constraint |
| USER_JOURNEYS.md | How users reach and use the site | Primary nav is the entry path |