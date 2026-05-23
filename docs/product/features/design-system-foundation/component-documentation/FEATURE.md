# Feature: Component Documentation

**Epic:** design-system-foundation
**Classification:** Administrative
**Priority:** Should (MVP)
**RICE:** Reach=50, Impact=2, Confidence=85%, Effort=3 → **Score: 2,833**

## Description

Living documentation for every design system component: usage examples, prop/API tables, code snippets, accessibility notes, and visual previews. Enables developer (Marcus persona) self-service without needing to read source code or ask teammates.

## Documentation Structure

Per component, the following must be documented:

```
docs/components/
├── button.md
├── card.md
├── input.md
├── badge.md
├── avatar.md
├── modal.md
├── toast.md
└── navigation.md
```

### Per-Component Document Template

```markdown
# Component: [Name]

## Overview
One-sentence description of purpose.

## Variants
Table of all variants with visual descriptions.

## Props / API
| Prop | Type | Default | Required | Description |
|---|---|---|---|---|

## Usage Examples
\`\`\`html
<!-- Minimal example -->
\`\`\`

\`\`\`html
<!-- Complex example -->
\`\`\`

## Accessibility
- ARIA attributes used
- Keyboard interactions
- Screen reader behavior

## CSS Classes
- Block class name
- Element class names
- Modifier class names

## Do / Don't
- ✅ Correct usage patterns
- ❌ Anti-patterns to avoid

## Related Components
Links to components that compose with this one.
```

## MVP Scope

- [ ] Documentation file for each of the 8 MVP components
- [ ] Usage examples with copyable code snippets (HTML + CSS)
- [ ] Props/API tables for each component
- [ ] Accessibility notes per component
- [ ] Do/Don't examples
- [ ] Integrated into the project docs site (under `/docs/components/`)
- [ ] Token reference page (from css-design-tokens feature)

## v2+ Scope

- Interactive playground (Storybook-like) — live-edit component props and see results
- Automated prop table generation from TypeScript interfaces
- Visual regression snapshots alongside each component doc
- Usage analytics (which components are most/least referenced)
- Component versioning docs (changelog per component)
- Search/filter across all component docs
- Dark mode preview toggle within the docs themselves

## Verification

- **Manual**: A developer unfamiliar with the system can build a feed card page using only the component docs (no source code inspection)
- **Automated**: Doc build script validates that every component in `components/index.ts` has a corresponding `.md` file
- **Review**: PR review checklist includes "new component has documentation entry"

## Trade-offs

| Decision | Alternative | Why Chosen |
|---|---|---|
| Markdown docs in repo | Storybook, Docz, Docusaurus | Zero dependency, version-controlled with code, easy to edit |
| Manual doc authoring | Auto-generated from source | More accurate intent, includes Do/Don't and accessibility notes that auto-tools miss |
| Static docs site | Interactive playground | Lower effort, sufficient for MVP; playground is v2 |
| Integrated in project docs | Separate docs site | Single source of truth, easier to maintain, no extra hosting |
