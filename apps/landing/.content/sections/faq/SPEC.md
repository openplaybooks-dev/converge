# Section Spec: FAQ

## 1. Section ID + Title

- **ID**: `faq`
- **Title**: `FAQ`

## 2. Intent

8 disclosure items derived from the trade-offs sections of `docs/concepts/*.md` — each is an honest objection + an honest answer. Native `<details>` elements; each item has a deep-link anchor (`#faq-{slug}`).

## 3. Component Name

`Faq` — lives at `apps/landing/src/components/sections/Faq.astro`

## 4. Content Sources

The 4 concept docs and their trade-offs sections:

| Concept | File | Trade-off count |
|---|---|---|
| Context interpolation | `docs/concepts/context-interpolation.md` | 4 |
| Deterministic checks | `docs/concepts/deterministic-checks.md` | 4 |
| Dynamic work-breakdown | `docs/concepts/dynamic-work-breakdown.md` | 4 |
| Strategy-based self-correction | `docs/concepts/self-correction.md` | 4 |

The 8 FAQ items pick the most objection-worthy trade-offs across these four sections. No invented content — every line traces to one of the files above, specifically the `## Trade-offs` subsections.

## 5. Required Props

```typescript
interface Props {
  items: Array<{
    question: string;
    answer: string;   // markdown string
    slug: string;     // anchor id, e.g. "checks-authoring"
  }>;
}
```

Default export exports `items` derived from this spec's FAQ items list.

## 6. Layout / States

- **Single state**: all items closed on load.
- **Interactive**: one item open at a time (accordion behavior via `<details>` `<summary>`).
- **Deep-link**: `https://converge.dev#faq-checks-authoring` opens that item directly.
- **Responsive**: single column at 320px+; max-width 720px centered at desktop.

## 7. Acceptance Criteria

- [ ] Renders 8 `<details>` items, each with a `<summary>` (question) and body (answer).
- [ ] Each item has `id="faq-{slug}"` on the `<details>` element.
- [ ] All copy traces to a trade-offs section in `docs/concepts/*.md` (no marketing-speak).
- [ ] Uses brand palette tokens for heading color, border, and body text (no hardcoded hex).
- [ ] No console errors on render.
- [ ] Keyboard accessible: `<details>` is focusable; Enter/Space toggles.

## 8. Banned

- Adding a 9th FAQ item not sourced from the trade-offs sections.
- Replacing `<details>` with a custom accordion (accessibility + simplicity).
- Hardcoded brand colors — must use tokens from `brand.json`.
- Marketing tone — voice must be "direct, technical, honest-about-trade-offs" per `brand.json`.

---

## FAQ Items

### 1. `#faq-checks-authoring`
**Q: Can't the agent just write bad checks that pass on garbage?**

Yes — a check that passes on empty output is a tautology. Converge lints checks at startup against empty and positive-control sandboxes, but the linter can't know what *you* mean by "done." Writing precise predicates is the hardest skill in authoring a Converge playbook. The payoff is a contract that's auditable by anyone: run the check, read the exit code.

### 2. `#faq-shell-properties`
**Q: What can't checks express?**

Shell commands are great for file existence, regex matches, and exit codes. They're poor at qualitative judgments: "is this prose well-written," "does this design feel right." For those properties, decompose into measurable sub-properties (word count, required sections, link validity) or accept that some quality dimensions stay out of the contract.

### 3. `#faq-wbs-fail`
**Q: What happens when a WBS script crashes?**

The parent task enters a "seeded" state with no children, blocking the phase. The framework includes a `WBSScriptRepairStrategy` that can detect and recover from some crash patterns, but a misbehaving script can still burn attempt budget. Keep WBS scripts small, deterministic, and side-effect-free.

### 4. `#faq-wbs-determinism`
**Q: Why do WBS scripts need to be deterministic?**

A script that returns different results on each run (live API with no sort order, filesystem listing without sorting) will spawn ghost children on subsequent runs — children that existed in run N but not in run N+1. Make scripts deterministic: sort outputs, snapshot dynamic inputs, prefer deterministic data sources.

### 5. `#faq-strategies-framework`
**Q: Can playbook authors add their own repair strategies?**

No — strategies live in `packages/core/src/navigator/repair/strategies/` and require a code change to the framework. This is intentional: strategies must compose with the framework's repair contract. Playbook authors work around this by writing tighter input declarations, better check predicates, and clearer task boundaries — or by filing a strategy request.

### 6. `#faq-token-cost`
**Q: Does listing more inputs make the agent slower or more expensive?**

Yes. A task that declares 30 inputs has all 30 paths in its context snapshot. File-shaped interfaces are cheap on infrastructure but not on tokens. Keep input lists tight — list only what the task actually reads. For large input sets, consider whether a parent task can consolidate downstream data into a single derived file.

### 7. `#faq-file-interfaces`
**Q: What doesn't fit in a file output?**

File outputs capture *what* a task produced, not *why* it made the choices it did. "What did task A think about this data" is hard to represent in a file. Converge fills this gap with facts (structured key-value) and ancestor summaries (chain of decisions), but these are coarser tools than a shared conversation.

### 8. `#faq-complexity-cost`
**Q: Isn't 11 repair strategies overkill?**

It can be. Eleven strategies means eleven places to misroute a fix — a strategy that's too eager claims failures it can't actually resolve and burns attempt budget. The tradeoff is explicit: bounded retry budget, targeted fixes for known failure shapes, and observable diagnostics. For novel failures, the fallback is the AI-driven path with carried-forward context. The cost is real; the alternative is retry-and-hope on every failure.
