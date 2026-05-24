# Epic Map — Portfolio Page

## Priority Matrix

| Epic | Priority | Rationale |
|------|----------|-----------|
| Work Showcase | **Must** | Core value prop — without work samples, there's no portfolio |
| Hero & Identity | **Must** | First impression in <60s; establishes credibility |
| Contact & Availability | **Must** | Contact friction kills leads; explicit per both personas |
| Responsive Performance | **Must** | Performance is a trust signal; static-file structural advantage |
| About & Bio | **Should** | Both personas use it to validate fit and trust, but not blocking |

## Persona Coverage

| Persona | Covered Epics | Gaps |
|---------|--------------|------|
| Rebecca (Screening Client) | Work Showcase, Hero Identity, Contact, Responsive, About | None identified |
| Marcus (Returning Inquirer) | About, Contact, Work Showcase | Hero less critical; already decided to reach out |

## Dependency Graph

```
[responsive-performance] ←─────────────┐
        │                              │
        │ (layout depends on nav/hero)  │
        ▼                              │
[hero-identity] ───────────────────────┐
        │                              │
        │ (bio placed after hero)      │
        ▼                              │
[about-bio] ◄─────────────────────────┤
                                        │
        (all epics feed into final)    │
        ▼                              │
[work-showcase] ───────────────────────┤
                                        │
        ▼                              ▼
[contact-availability] ◄──────────────┘
```

## Epic Definitions

### Must (Critical for v1)

**1. Work Showcase** (`work-showcase`)
- Thumbnail grid with project titles, categories, and date indicators
- High image quality; no pixelation or slow load
- Grid view sufficient for initial screening (no detail pages in v1)

**2. Hero & Identity** (`hero-identity`)
- Name, tagline, positioning statement above fold
- CTA link → #work section
- Clean, minimal, editorial aesthetic

**3. Contact & Availability** (`contact-availability`)
- Visible, human-readable email address
- Availability status signal
- No contact forms (direct email only for v1)

**4. Responsive Performance** (`responsive-performance`)
- Static HTML + CSS; no server, no CMS
- First load <2s on fast connection
- Layout stable after initial paint
- Responsive: desktop (1024px+) and mobile (375px+)

### Should (Important if timeline allows)

**5. About & Bio** (`about-bio`)
- 2–3 paragraph bio with personality
- Optional process note to distinguish from templates
- Placed before Contact section

## Out of Scope per Epic

- **No project detail pages** — grid view only
- **No blog/articles** — explicitly out of scope
- **No contact form** — email-only for v1
- **No CMS** — static file is a feature
- **No analytics** — external script only, not in v1

## Traceability

| Epic | Source Artifact | Key Quote |
|------|----------------|-----------|
| Work Showcase | Product Brief, Research Report | "Core value proposition of portfolio" |
| Hero Identity | User Journeys | "5 seconds to form initial impression" |
| Contact | Research Report, User Journeys | "Contact friction kills leads" |
| Responsive | Research Report | "Performance is a trust signal" |
| About | User Personas | "personality matters as much as work" |