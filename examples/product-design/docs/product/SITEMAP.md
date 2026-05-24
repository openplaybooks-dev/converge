# Sitemap — Portfolio Page

## Overview

Single-page portfolio site. All content lives on one HTML page accessed at `/`.

---

## Pages

| Path | Purpose | Parent |
|------|---------|--------|
| `/` | Single-page portfolio: hero, work grid, about, contact | — |

---

## Sections (on `/`)

| Section | ID | Description |
|---------|-----|-------------|
| Hero | `#hero` | Designer name, tagline, entry point to work |
| Work | `#work` | Portfolio grid — image-first showcase of projects |
| About | `#about` | Bio, process, personality — builds trust before contact |
| Contact | `#contact` | Email address, availability status — primary conversion point |

---

## Navigation

- **Primary nav**: Fixed top bar — links to `#work`, `#about`, `#contact`
- **Anchor-based**: All navigation uses fragment identifiers (`#work`, `#about`, `#contact`)
- **No sub-pages**: True single-page architecture, no child routes

---

## Routes Summary

```
/
├── #hero (anchor)
├── #work (anchor)
├── #about (anchor)
└── #contact (anchor)
```

---

## Out of Scope (v1)

- `/blog` or article pages
- `/projects/:id` detail pages — portfolio items shown inline in grid
- `/about` standalone page — inline section only
- `/contact` form with backend — email-only for v1