# Traceability Matrix — Portfolio Page

Mapping epics → features → views → design system.

---

## Epic → Feature → View → Design

| Epic | Feature | View / Section | Design Components | Design Tokens |
|------|---------|----------------|------------------|--------------|
| **work-showcase** | Thumbnail grid of design samples with titles, categories, date indicators | `#work` | `.project-card`, `.project-card__image`, `.project-card__category`, `.project-card__title`, `.project-card__year` | `--color-neutral-*`, `--text-xs`, `--text-base`, `--weight-semibold`, `--space-*` |
| **hero-identity** | Name, tagline, positioning statement; CTA link to #work | `#hero` | `.nav-bar`, `.btn--primary` (CTA) | `--text-5xl`, `--text-6xl`, `--weight-bold`, `--weight-semibold`, `--space-16`, `--space-24` |
| **about-bio** | 2–3 paragraph bio with personality; optional process note | `#about` | `.card`, `.card__description`, `.card__meta` | `--text-lg`, `--text-base`, `--text-sm`, `--weight-normal`, `--space-10`, `--space-12` |
| **contact-availability** | Visible email address, availability status signal | `#contact` | `.badge--success` / `.badge--warning`, `.alert--info`, `.nav-item` (email link) | `--color-success-*`, `--color-warning-*`, `--text-sm`, `--weight-medium` |
| **responsive-performance** | Static HTML/CSS; <2s load; desktop (1024px+) / mobile (375px+) responsive | All sections | `.grid`, responsive breakpoints via CSS custom properties | `--breakpoint-sm`, `--breakpoint-md`, `--breakpoint-lg`, `--breakpoint-xl` |

---

## View → Section Anatomy

| View / Section | HTML Element | ID | Component |
|----------------|--------------|-----|-----------|
| Hero | `<header>` | `#hero` | `.hero` (section wrapper) |
| Work | `<section>` | `#work` | `.project-grid` (ul), `.project-card` (li) |
| About | `<section>` | `#about` | `.card`, `.card__image`, `.card__content` |
| Contact | `<section>` | `#contact` | `.alert--info`, `.badge` |
| Navigation | `<nav>` | `#nav` | `.nav-bar`, `.nav-item` |

---

## Design System Coverage

| Epic | Tokens Used | Components Used |
|------|-------------|-----------------|
| work-showcase | `--color-neutral-*`, `--text-*`, `--weight-*`, `--space-*` | `.project-card`, grid layout |
| hero-identity | `--text-5xl`, `--text-6xl`, `--weight-bold`, `--color-blue-*` | `.nav-bar`, `.btn--primary` |
| about-bio | `--text-lg`, `--text-base`, `--text-sm`, `--space-10`, `--space-12` | `.card` |
| contact-availability | `--color-success-*`, `--color-warning-*`, `--text-sm`, `--weight-medium` | `.badge`, `.alert--info` |
| responsive-performance | `--breakpoint-*` | Grid system, all sections |

---

## Dependency Chain

```
epics.json (source of truth)
    │
    ▼
EPIC_MAP.md (epic definitions, priority, dependencies)
    │
    ├──► ARCHITECTURE.md (view/section mapping, component IDs)
    │         │
    │         ▼
    │    SITEMAP.md (section anchors)
    │
    └──► DESIGN.md / COMPONENTS.md (design system)
              │
              ▼
         TRACEABILITY.md (this document)
```

---

## Source Artifacts

| Epic | Source | Key Quote |
|------|--------|-----------|
| work-showcase | epics.json, PRODUCT_BRIEF.md | "primary value proposition of the portfolio" |
| hero-identity | epics.json, USER_JOURNEYS.md | "first impressions form in under 60 seconds" |
| about-bio | epics.json, USER_JOURNEYS.md | "personality matters as much as work" |
| contact-availability | epics.json, USER_JOURNEYS.md | "contact friction kills leads" |
| responsive-performance | epics.json, SCOPE.md | "performance is a trust signal" |