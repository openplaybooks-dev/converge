# Playbook workspace — Converge UI Kit

Chat-on-the-left + tabbed-workspace-on-the-right recreation, modelled on the Open Design / Cursor / Claude Design layout. The playbook tab carries the task list as expandable cards; selecting a task in `awaiting-review` opens the **Open Design–style inline review** — `👍 Looks good` and `💬 Needs work…` next to each card, with a feedback textarea + tag chips that submit a verdict back into the run journal.

## Screens

**01 Playbook workspace** (`index.html`) — the whole product:

- **Left rail · Chat.** Brand mark + playbook name in the header. Conversation is a mix of `user` prompts, `agent` replies (with italic-emphasis terracotta on key nouns — the brand motif), and `tool` status lines (mono, dim). Composer at the bottom with attach / skills / send affordances.
- **Right rail · Tabs.** Three tabs: **Playbook** (default), **Run journal**, **Files**. The Playbook tab shows an amber-pill badge with the awaiting-review count.
- **Playbook tab body.** Top status row with `✓ ● Δ ✕` counters and run controls. A "Needs review" pinned card highlights the gated task. Below that, three white card groups — *Build phase*, *Review phase*, *In flight & pending* — each containing expandable task rows.
- **Task row.** Mono task id, mode pill, duration, and a trailing review pill when the task is `pending`, `approved`, etc. Click the chevron to expand: brand-voice summary, 4-cell meta grid (outputs / checks / status / duration), declared outputs, declared checks with live exit codes, the prior approved-verdict note (if any), and — recursively — any spawned children.
- **Inline review.** When the expanded task is in `awaiting-review`, the row gets a footer with `👍 Looks good`, `💬 Needs work…`, `✕ Reject`. Clicking *Needs work* or *Reject* slides a textarea + tag chips in; Submit writes the verdict to the playbook state, advances the DAG (06-ui-kit flips `Δ → ●`), and pushes confirmation messages back into the chat.
- **Toast.** A small ink toast confirms each verdict.

The whole flow is wired — type in the composer and send, click verdicts, watch the chat narrate every action.

## Components

| File | Component(s) | Notes |
|---|---|---|
| `data.js` | `window.PLAYBOOK_DATA` | Grouped task tree + chat thread fixture. |
| `primitives.jsx` | `StatusGlyph` · `ReviewPill` · `Pill` · `Caption` · `CodeChip` · `KvRow` · `statusLabel` | Atoms shared across chat + workspace. |
| `chat.jsx` | `ChatPane` · `ChatHeader` · `ChatMessage` · `ChatComposer` | Left rail. `ChatMessage` renders `*foo*` as terracotta italic on the fly. |
| `workspace.jsx` | `WorkspaceTabs` · `PlaybookTab` · `JournalTab` · `FilesTab` · `TaskGroup` · `TaskCardRow` · `ReviewActions` · `MetaCell` | Tabs + recursive task tree + inline review form. |
| `App.jsx` | `App` · `Toast` | Wires state, verdict actions, DAG advancement, chat narration. |

## Visual rules followed

- **App-chrome background `#FAFAF7`** locally (overrides `--cv-bg` from the cream paper); panels are pure `#FFFFFF`. Set in `index.html`.
- **Terracotta only** appears in: the brand wordmark dot, the left-edge marker on the awaiting-review row, italic emphasis inside summaries / chat agent messages, the "needs review" pin's left border (`var(--cv-status-delta)`). All four uses align with the brand contract.
- **Status palette as glyph-as-type.** `✓` `●` `Δ` `✕` `◇` `◉` typed in JetBrains Mono. No SVG status icons.
- **Tabs are underline-only.** No pill-tab; the underline matches the brand's editorial rhythm.
- **2px corner radius** on every interactive element. The card groups go up to `4px` only as a deliberate one-step elevation.
- **One shadow** — `--cv-shadow-pop` — only on the toast.

## What's not in this kit

- A real DAG / graph renderer (Converge has SVG primitives in `reference/converge-diagrams.css` — slot reserved for a future iteration).
- A skill picker / provider switcher (lives in `apps.converge.dev` outside this surface).
- Multi-conversation persistence (the chat is in-memory React state).

## Iterating

`data.js` controls the fixture. `colors_and_type.css` (one level up) is the token source — every visual rule traces back to a `--cv-*` variable. The local `#FAFAF7` background override lives in `index.html`'s `:root` block; remove it to render the kit on cream paper.
