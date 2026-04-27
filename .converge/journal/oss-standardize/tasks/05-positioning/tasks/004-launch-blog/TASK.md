---
title: Draft Launch Blog Post
outputs:
  - docs/blog/launch-post.md
checks:
  - id: blog-exists
    cmd: test -f docs/blog/launch-post.md
    description: Launch blog post draft exists
dependencies:
  - 003-why-converge
---

Draft the launch announcement blog post for Converge.

**Reference**: Read `docs/converge-gtm.md` section 5 (Launch Playbook)
and section 6 (Content Strategy). Read `docs/brand-messaging.md` for voice.

**Structure** (`docs/blog/launch-post.md`):

1. **Hook** — start with the problem, not the product
   "We've been building AI agents wrong. Here's why."

2. **The Status Quo** — brief survey of current frameworks
   - Graph-based (define every edge)
   - Role-based (assign personas)
   - Conversation-based (hope for convergence)

3. **A Different Approach** — introduce gap-driven convergence
   - What if you just defined "done"?
   - The convergence loop: measure gap → attempt → verify → learn → repeat

4. **Introducing Converge** — the framework
   - Open source, Apache 2.0
   - TypeScript-native, 270 lines of core logic
   - Playbooks, WBS, goals, checks
   - Live example with code snippets

5. **Real Examples** — what you can build
   - 2-3 concrete use cases with playbook snippets
   - Results/outcomes

6. **Architecture** — brief technical overview
   - Filesystem-first design
   - Hierarchical task decomposition
   - Self-correction via LEARN.md

7. **What's Next** — roadmap teaser
   - Community, cloud dashboard, enterprise playbooks

8. **Try It** — installation, first playbook, links

**Length**: 1500-2000 words. Optimize for Hacker News / dev blog audience.
**Tone**: Technical narrative. Show, don't tell. Code snippets over prose.
