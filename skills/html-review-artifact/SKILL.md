---
name: html-review-artifact
description: Framework-wide guidance for crafting polished human-review artifacts as markdown or HTML
---

# HTML Review Artifact Skill

## When to Use This Skill

Use this skill when the deliverable is a human-review artifact that may be:

- a concise `*.md` summary for fast review, or
- a standalone `*.html` page for richer visual review.

If the artifact is HTML, treat it like a polished review surface, not a raw dump of content.

## Output Modes

### Mode 1: Markdown Review Artifact

Use markdown when the goal is speed, traceability, or lightweight review.

Keep it structured:

- short title
- one-sentence summary
- sections for context, decision, evidence, and next steps
- tables for comparisons
- checklists for action items

### Mode 2: HTML Review Artifact

Use HTML when the artifact should feel like a polished review page.

HTML review artifacts should have:

- a strong hero area with title, summary, and status
- one clear primary column for the content under review
- one secondary column for metadata, decisions, or timeline
- card-based sections with clear hierarchy
- visible pills/badges for status and decision
- responsive behavior on mobile and desktop
- accessible semantic structure

## Tailwind-Style Guidance

If the environment already uses Tailwind, you may express the artifact with utility classes.
If there is no Tailwind build step, keep the same visual language with self-contained CSS.

In either case, aim for Tailwind-like qualities:

- consistent spacing scale
- restrained color palette
- rounded cards and chips
- readable typography hierarchy
- strong contrast
- minimal decorative noise
- no cluttered layouts

## Hard Rules

1. **Make the review obvious** - the page should immediately tell the human what to inspect.
2. **Prefer semantic HTML** - `header`, `main`, `section`, `aside`, `article`.
3. **Keep it responsive** - the artifact must work on a narrow browser window.
4. **Use realistic content** - no placeholder text, no lorem ipsum.
5. **Avoid generic white-page layouts** - the artifact should feel intentionally designed.
6. **No external dependency by default** - do not require a CDN unless the task explicitly allows it.
7. **No inline clutter** - keep styles organized and minimal.

## Recommended Structure

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>[Artifact Title]</title>
  </head>
  <body>
    <main>
      <header>
        <!-- title, summary, status -->
      </header>

      <section class="grid">
        <article>
          <!-- primary artifact content -->
        </article>

        <aside>
          <!-- review metadata, decision, timeline -->
        </aside>
      </section>
    </main>
  </body>
</html>
```

## Quality Checklist

- [ ] Title and status are obvious at a glance
- [ ] Content is split into readable sections
- [ ] Metadata is separated from the main content
- [ ] Mobile layout still reads cleanly
- [ ] The page looks intentional, not boilerplate
- [ ] The artifact is easy to review in one pass
