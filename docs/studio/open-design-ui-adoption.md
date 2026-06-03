# Open Design UI Adoption Guide for Converge Studio

This document is a practical guide for adopting the Open Design web UI (`open-design/apps/web/`) as the frontend for Converge Studio. The approach is **maximal reuse** — we keep the UI shell, layout, components, and interactions intact, changing only data bindings and making small UI tweaks where domain concepts differ.

See [open-design-concept-mapping.md](./open-design-concept-mapping.md) for the full domain translation tables.

---

## A. Component Inventory & Disposition

### Keep As-Is (zero changes)

These components are domain-agnostic utilities. Copy directly.

| Component | Source Path | Purpose |
|---|---|---|
| `Icon.tsx` | `web/src/components/Icon.tsx` | Icon rendering utility (lucide-react) |
| `RemixIcon.tsx` | `web/src/components/RemixIcon.tsx` | RemixIcon font wrapper |
| `Loading.tsx` | `web/src/components/Loading.tsx` | Loading spinners and skeleton states |
| `Toast.tsx` | `web/src/components/Toast.tsx` | Notification toast |
| `CustomSelect.tsx` | `web/src/components/CustomSelect.tsx` | Styled select dropdown |
| `QuickSwitcher.tsx` | `web/src/components/QuickSwitcher.tsx` | Cmd+K/Cmd+P palette — change search targets from "files/projects" to "tasks/playbooks" via data binding |
| `PasteTextDialog.tsx` | `web/src/components/PasteTextDialog.tsx` | Text paste modal |
| `ExportDiagnosticsButton.tsx` | `web/src/components/ExportDiagnosticsButton.tsx` | Debug diagnostics export |
| CSS tokens | `web/src/styles/tokens.css` | Design tokens (colors, spacing, typography) |
| CSS primitives | `web/src/styles/primitives.css` | Reusable UI primitives |
| CSS base | `web/src/styles/base.css` | Reset and base element styles |
| Theme system | `web/src/state/appearance.ts` | Light/dark/system mode toggle |
| Animation patterns | `web/src/styles/` | Accordion, transitions, easing curves |

### Keep UI, Swap Data (core adoption work)

These components keep their visual design and interaction patterns. We swap the data sources, type bindings, and make small label/icon tweaks.

---

#### ChatPane → PlanningChatPane

**Source:** `web/src/components/ChatPane.tsx`

**What stays the same:**
- Message list rendering with scroll management
- Day/time separators between messages
- Auto-scroll to bottom on new messages
- `PinnedTodoSlot` above the composer (reuse for task checklist)
- Feedback rating UI (thumbs up/down on messages)
- Message grouping and conversation history

**Data swap:**
- `Conversation` API → `StudioSession` API
- `ChatMessage[]` → `FeedbackEntry[]` (planning) or `JournalEvent[]` (execution)
- Message rendering: `ChatMessage.content` → `FeedbackEntry.message` or `JournalEvent.message`
- `ChatMessage.events` (PersistedAgentEvent[]) → journal events for the active task

**Small UI tweaks:**
- Starter prompts: change from design prompts ("Create a landing page") to playbook prompts ("Plan a data pipeline", "Set up CI/CD")
- Comment attachment chips: remove (design-specific)

---

#### ChatComposer → PlanningComposer

**Source:** `web/src/components/ChatComposer.tsx`

**What stays the same:**
- Textarea with auto-resize
- Keyboard shortcuts (Enter to send, Shift+Enter for newline)
- @-mention popover system
- Slash command support
- Send button and loading state

**Data swap:**
- @-mention targets: `designSystems` + `skills` → `skills` + `providers`
- `ChatRequest` body → `{ sessionId, message }` for planning feedback
- File attachment list → (remove or repurpose for task input files)

**Small UI tweaks:**
- Remove: image/video model picker, sketch mode toggle, pet selector, folder import button
- Add: playbook template dropdown (binds to `TemplateSpec[]` from `add-ui-templates.json`)

---

#### AssistantMessage → AgentMessage

**Source:** `web/src/components/AssistantMessage.tsx`

**What stays the same:**
- Markdown content rendering
- Tool call group display (ToolCard rendering)
- Feedback thumbs UI
- Copy-to-clipboard
- Message header (agent name, timestamp)
- `stripTodoToolGroups` logic (reuse for task checklists)

**Data swap:**
- `PersistedAgentEvent` kinds → `JournalEvent.eventType` rendering
- `kind: 'live_artifact'` events → task completion events (`TASK_COMPLETE`, `TASK_FAILED`)
- `kind: 'usage'` events → keep as-is (token/cost tracking applies to Converge too)
- `kind: 'tool_use'` / `kind: 'tool_result'` → keep as-is (agents use tools in Converge too)

**Small UI tweaks:**
- Add: task status badge next to message when event is a task lifecycle event
- Add: gap alert inline when `GAP_DETECTED` event is rendered

---

#### ToolCard → ToolCard (extended)

**Source:** `web/src/components/ToolCard.tsx`

**What stays the same:**
- Tool group rendering with deduplication
- `AskUserQuestionCard` — reuse directly for `AWAITING_USER_INPUT` journal events
- `TodoCard` — reuse for task checklists (`ChecklistItem[]` from `TaskStatus`)
- Collapse/expand for tool details

**Data swap:**
- `AskUserQuestionCard.onAnswerToolUse()` → `submitReviewDecision()` for human review gates
- `TodoCard` items → `ChecklistItem[]` from `core/src/journal/types.ts`

**Small UI tweaks:**
- Add: `HumanReviewCard` variant — renders approve/revise/reject buttons + feedback textarea (for `gateway` mode tasks). Reuse the `AskUserQuestionCard` chip-selection pattern but with three fixed options.

---

#### DesignFilesPanel → TaskTreePanel

**Source:** `web/src/components/DesignFilesPanel.tsx`

**What stays the same:**
- Right sidebar panel layout
- Tree/list view with expand/collapse
- Search/filter input
- Sort controls
- Panel header with action buttons

**Data swap:**
- `ProjectFile[]` → `RunStateNode[]` (or `ManifestNode[]` for the compiled view)
- File kind icons → task mode icons (task/spawner/converger/gateway)
- File name → `RunStateNode.title` or `RunStateNode.id`
- File size/mtime → `RunStateNode.duration_ms`, `RunStateNode.attempts`

**Small UI tweaks:**
- Add: status color dot per node (`pending`=gray, `running`=blue, `pass`=green, `error`=red, `blocked`=orange, `skipped`=muted)
- Add: manifest state indicator (`concrete`=solid, `expected`=dashed border, `frontier`=faded)
- Add: spawned children nesting (use `RunStateNode.spawned_children` for tree hierarchy)
- Remove: file upload, drag-drop, sketch preview thumbnails

---

#### FileViewer → TaskOutputViewer

**Source:** `web/src/components/FileViewer.tsx`

**What stays the same:**
- Viewer shell layout (header bar + content area)
- Tab system (preview / code / data tabs)
- Export/download actions in header
- Full-width content rendering area

**Data swap:**
- HTML iframe preview → TASK.md markdown rendering (use the existing markdown renderer from `AssistantMessage`)
- `ProjectFile` content → task definition body (`TaskDefinition.prompt` or TASK.md content)
- File metadata bar → task metadata (id, mode, status, agent, attempts)
- `srcDoc` / URL-load logic → direct content rendering (no iframe needed for markdown)

**Small UI tweaks:**
- Add: "Checks" tab showing `CheckResultItem[]` from latest `AttemptDetail`
- Add: "Attempts" tab showing `AttemptDetail[]` timeline (attempt number, status, duration, error)
- Add: "Outputs" tab listing `RunStateNode.outputs[]` with file previews
- Remove: deck rendering, react-component preview, srcDoc/URL-load decision logic

---

#### ProjectView → PlaybookWorkspaceView

**Source:** `web/src/components/ProjectView.tsx`

**What stays the same:**
- Three-column layout: chat (left) | viewer (center) | panel (right)
- Column resizing / collapse behavior
- Conversation switching in header
- Streaming integration (SSE event consumption)
- Run status indicator in header

**Data swap:**
- `Project` → `PlaybookDef`
- `Conversation[]` → `StudioSession[]` (planning) or run history
- `ProjectFile[]` → `RunStateNode[]`
- Chat streaming: `ChatRequest` SSE → `RunEvent` SSE
- File selection → task selection (clicking a task in the tree opens it in the viewer)

**Small UI tweaks:**
- Add: run controls in header (Start / Stop / Resume buttons)
- Add: gap count badge in header
- Remove: design-file management actions, comment overlay, sketch editor toggle

---

#### WorkspaceTabsBar

**Source:** `web/src/components/WorkspaceTabsBar.tsx`

**What stays the same:**
- Tab bar rendering with drag-reorder
- Close button per tab (Cmd+W)
- Active tab highlighting
- Session persistence to localStorage
- Tab overflow handling

**Data swap:**
- Tab types: `project` | `entry` | `marketplace` → `playbook` | `task` | `run` | `settings`
- Tab labels: project name → playbook name / task ID / run ID

---

#### EntryView + EntryShell → StudioEntryView

**Source:** `web/src/components/EntryView.tsx`, `EntryShell.tsx`

**What stays the same:**
- Left navigation rail (`EntryNavRail`)
- Centered hero layout
- Settings dialog access
- Recent items strip
- Tab-based content switching (home, list, settings)

**Data swap:**
- Navigation tabs: `projects` → `playbooks`, `design-systems` → `skills`, `plugins` → `providers`, `tasks` → `runs`
- `RecentProjectsStrip` → `RecentPlaybooksStrip` (same strip component, different data source)
- `HomeHero` content → Converge Studio branding + quick-create playbook action
- Project list → playbook list from `.converge/playbooks/`

**Small UI tweaks:**
- Remove: project kind picker (prototype/deck/image/video/audio), media model selectors
- Add: provider status indicator (which AI providers are configured and healthy)
- Rebrand: "Open Design" → "Converge Studio" in all visible text

---

#### EntryNavRail

**Source:** `web/src/components/EntryNavRail.tsx`

**What stays the same:**
- Vertical icon rail layout
- Active tab highlighting
- Tooltip labels
- Collapse behavior

**Data swap:**
- Tab items: `home` | `projects` | `tasks` | `plugins` | `design-systems` | `integrations` → `home` | `playbooks` | `runs` | `providers` | `skills` | `integrations`
- Icons: swap design-specific icons for orchestration-appropriate ones

---

#### SettingsDialog

**Source:** `web/src/components/SettingsDialog.tsx`

**What stays the same:**
- Modal dialog structure
- Section tabs layout
- Theme picker (light/dark/system)
- Language picker
- Privacy section
- Diagnostics export

**Data swap:**
- API key sections: BYOK protocol tabs (anthropic/openai/azure/google/ollama) → Converge provider configuration (agent function selection, model choice)
- Remove: media provider configs, pet settings, orbit/notification settings, design-system toggles
- Add: run defaults section (maxTaskAttempts, workers, maxDuration from `PlaybookRunConfig`)
- Add: project directory picker (`.converge/` root path)

---

#### Theater/ → VerificationPanel

**Source:** `web/src/components/Theater/TheaterStage.tsx`, `TheaterTranscript.tsx`, `ScoreTicker.tsx`, `PanelistLane.tsx`

**What stays the same:**
- Multi-panel parallel display layout
- Score ticker / progress indicator
- Transcript scrolling
- Round dividers between iterations
- Interrupt/cancel button

**Data swap:**
- Panelist roles (designer/critic/brand/a11y/copy) → gap categories (output/check/blocker/systemic/plan)
- Score per panelist → gap count per category
- Score threshold → convergence criteria (all gaps resolved, all checks pass)
- Round → execution iteration / attempt
- Transcript entries → `JournalEvent[]` filtered by category

**Small UI tweaks:**
- `ScoreTicker` → convergence progress bar (gaps resolved / total gaps)
- `PanelistLane` → gap category lane (shows events for one gap type)
- `InterruptButton` → run cancellation button (same behavior)

---

#### ConversationsMenu

**Source:** `web/src/components/ConversationsMenu.tsx`

**What stays the same:**
- Dropdown menu listing past conversations
- Click to switch active conversation
- Timestamp display

**Data swap:**
- `Conversation[]` → `StudioSession[]` (planning sessions) + run history
- `Conversation.title` → `StudioSession.name` or run execution ID
- `Conversation.latestRun.status` → `SessionStatus` or `RunState.metadata.status`

---

#### RoutinesSection → RunsSection

**Source:** `web/src/components/RoutinesSection.tsx`

**What stays the same:**
- List layout with status badges
- Create new / edit / delete actions
- Schedule display
- Last run summary

**Data swap:**
- `Routine` → playbook execution record
- `Routine.schedule` → (external scheduling or manual trigger)
- `RoutineRun[]` → run history entries
- `RoutineRunStatus` → `RunState.metadata.status`

---

#### TasksView → RunsView

**Source:** `web/src/components/TasksView.tsx`

**What stays the same:**
- List/table layout for automation runs
- Status filtering
- Run detail expansion
- Timing information

**Data swap:**
- `Routine[]` + `RoutineRun[]` → playbook run history
- Run status values → `RunState.metadata.status`

---

#### NewProjectModal → NewPlaybookModal

**Source:** `web/src/components/NewProjectModal.tsx`

**What stays the same:**
- Modal dialog with form layout
- Name input field
- Template selection
- Create action

**Data swap:**
- Project kind selector → (remove — playbooks don't have "kinds")
- Template list: design templates → `TemplateSpec[]` from `add-ui-templates.json`
- Create action: `createProject()` → `POST /api/sessions` (start planning session)

**Small UI tweaks:**
- Add: goal text input (what should this playbook accomplish)
- Remove: fidelity picker, platform selector, media model choice

---

#### NewAutomationModal → NewRunModal

**Source:** `web/src/components/NewAutomationModal.tsx`

**What stays the same:**
- Modal form layout
- Prompt/instruction textarea
- Schedule configuration

**Data swap:**
- `Routine` creation → playbook run configuration
- Agent picker → provider picker
- Skill picker → keep as-is

---

### Skip (design-tool-specific, not applicable)

| Component | Reason |
|---|---|
| `SketchEditor.tsx`, `SketchPreview.tsx` | Drawing/sketching canvas — design-specific |
| `PreviewDrawOverlay.tsx` | Visual annotation overlay on design previews |
| `ManualEditPanel.tsx` | Inline code editing of design HTML |
| `PaletteTweaks.tsx` | Color palette adjustment UI |
| `DesignSystemFlow.tsx` | Multi-step design system creation wizard |
| `DesignSystemPreviewModal.tsx` | Design system preview rendering |
| `DesignSpecView.tsx` | Design specification viewer |
| `DesignSystemsSection.tsx` | Design systems list section |
| `ConnectorsBrowser.tsx`, `ConnectorLogo.tsx` | External connector catalog (Figma, Notion, etc) |
| `BoardComposerPopover.tsx` | Deck/board composition popover |
| `FinalizeDesignButton.tsx` | Design finalization workflow |
| `HandoffButton.tsx` | Design-to-developer handoff |
| `GithubStarBadge.tsx` | Marketing star count widget |
| `GenUIInbox.tsx`, `GenUISurfaceRenderer.tsx` | Generative UI specific to design tool |
| `pet/` directory (PetOverlay, etc) | Companion pet feature |
| `UpdaterPopup.tsx` | Desktop auto-updater |
| `PrivacyConsentModal.tsx` | Telemetry consent — revisit later |
| `MemoryToast.tsx`, `MemorySection.tsx`, `MemoryModelInline.tsx` | Agent memory system (different in Converge) |
| `InlinePluginsRail.tsx`, `PluginLoopHome.tsx` | Plugin ecosystem UI |
| `MarketplaceView.tsx`, `PluginDetailView.tsx`, `PluginDetailsModal.tsx` | Marketplace catalog |
| `HomeHero.tsx` | Design-specific hero content (replace with Converge branding) |
| `XaiOAuthControl.tsx` | xAI-specific OAuth — not needed |
| `MissingBrandFontsBanner.tsx` | Font detection — design-specific |
| `LiveArtifactBadges.tsx` | Live artifact status badges — replace with task status badges |
| `ProjectDesignSystemPicker.tsx` | Design system assignment — not needed |
| `PromptTemplatesTab.tsx`, `PromptTemplatePreviewModal.tsx` | Design prompt templates — replace with playbook templates |
| `DesignsTab.tsx` | Design gallery tab |
| `ExamplesTab.tsx` | Design examples — replace with playbook examples |

### New Components (Converge-specific)

These address concepts that don't exist in Open Design.

#### DAGVisualization

**Purpose:** Render the task dependency graph as an interactive node-edge diagram, grouped by execution waves.

**Data source:** `RunState.dag` (nodes + edges), wave ordering from `computeWaves()` in `studio/src/add-ui.ts`

**Placement:** Center panel of `PlaybookWorkspaceView`, as an alternative tab alongside the `TaskOutputViewer`

**Interaction:** Click a node → opens task detail in viewer. Hover → shows status tooltip. Color-coded by `RunStateNode.status`.

#### GapPanel

**Purpose:** Display detected gaps with severity, type, and resolution status.

**Data source:** `Gap[]` from gap detection API, filtered/grouped by `GapKind`

**Placement:** Collapsible bottom panel in `PlaybookWorkspaceView` (similar to a terminal panel in an IDE), or as a badge + dropdown in the workspace header.

**Interaction:** Click a gap → navigates to the relevant task. Gap count badge in header updates in real-time via SSE.

#### HumanReviewQueue

**Purpose:** List all tasks currently blocked waiting for human review, with inline decision controls.

**Data source:** `HumanReviewHandoff[]` from the review API, linked to `RunStateNode` entries with `status: 'blocked'`

**Placement:** Dedicated section in the chat sidebar (below the message list), or as a filterable view in the task tree panel.

**Interaction:** Each item shows the task title, review artifact preview, and approve/revise/reject buttons. Reuse the `AskUserQuestionCard` chip-selection layout from `ToolCard.tsx`.

#### JournalViewer

**Purpose:** Scrollable, filterable log of execution journal events.

**Data source:** `JournalEvent[]` streamed via SSE, persisted in `.converge/journal/<playbook>/`

**Placement:** Tab in the center viewer area, or expandable bottom panel.

**Interaction:** Filter by `EventType` category (task, gap, check, agent, correction). Color-coded by level. Timestamp + scope column. Click event → navigates to relevant task.

#### TaskModeIndicator

**Purpose:** Small visual badge showing the task's lifecycle mode.

**Data source:** `TaskDefinition.mode` — `'task' | 'spawner' | 'converger' | 'gateway'`

**Placement:** Inline with task name in `TaskTreePanel` and `TaskOutputViewer` header.

**Design:** Small colored badge or icon:
- `task` → dot (default, can be omitted)
- `spawner` → branching icon or "+" badge
- `converger` → merge/funnel icon
- `gateway` → pause/gate icon (human review required)

---

## B. Architecture — Package Structure

### New Packages

```
D:\converge\
  packages/
    studio-web/                    # New React frontend (forked from open-design apps/web)
      app/                         # Next.js 16 App Router
        layout.tsx
        [[...slug]]/
          page.tsx                 # Catch-all route (same pattern as open-design)
      src/
        components/
          chat/                    # ChatPane, ChatComposer, AgentMessage (adapted)
          dag/                     # DAGVisualization, TaskModeIndicator (new)
          execution/               # RunDashboard, GapPanel, JournalViewer (new)
          review/                  # HumanReviewQueue, HumanReviewCard (new)
          shell/                   # EntryView, EntryNavRail, WorkspaceTabsBar, SettingsDialog (adapted)
          workspace/               # PlaybookWorkspaceView, TaskTreePanel, TaskOutputViewer (adapted)
          verification/            # VerificationPanel — Theater adaptation
          common/                  # Icon, Loading, Toast, CustomSelect, QuickSwitcher (as-is)
        hooks/                     # Shared React hooks
        i18n/                      # Internationalization (copied, stripped to English initially)
        providers/                 # API clients for studio server
          converge-api.ts          # REST client for playbook/session/run/review endpoints
          run-stream.ts            # SSE client for real-time run events
        router.ts                  # Adapted from open-design router.ts
        state/
          config.ts                # StudioConfig (adapted from AppConfig)
          appearance.ts            # Theme — copied as-is
          playbooks.ts             # Playbook CRUD operations
        styles/                    # Copied from open-design, rebranded
          tokens.css
          primitives.css
          base.css
          shell.css
          chat.css
          workspace/
          viewer/
        types.ts                   # Converge-specific UI types
        utils/
      package.json                 # Dependencies: next@16, react@18, tailwindcss@4
      next.config.ts
      tsconfig.json
      tailwind.config.ts

    studio-contracts/              # Shared types between studio server and web client
      src/
        api/
          playbooks.ts             # PlaybookSummary, PlaybookDetail request/response shapes
          sessions.ts              # Session creation, feedback, status shapes
          runs.ts                  # Run start, status, history shapes
          reviews.ts               # Review handoff, decision shapes
          tasks.ts                 # Task detail, output, check result shapes
          skills.ts                # Skill listing shapes
          providers.ts             # Provider configuration shapes
        sse/
          run-events.ts            # SSE event type union for real-time streaming
          session-events.ts        # SSE event type union for planning sessions
        common.ts                  # Shared pagination, error, and envelope types

    studio/                        # EXISTING — extended with REST/SSE API
      src/
        add-ui.ts                  # Existing HTML planning UI (keep as fallback)
        html-server-manager.ts     # Existing HTTP server lifecycle
        api/                       # NEW: REST endpoint handlers
          playbooks.ts
          sessions.ts
          runs.ts
          reviews.ts
          tasks.ts
          journal.ts
        sse/                       # NEW: SSE stream handlers
          run-events.ts
          session-events.ts
        index.ts                   # Extended exports
```

### Dependency Graph

```
studio-web  →  studio-contracts  ←  studio (server)
                                         ↓
                                    core (engine)
```

`studio-web` and `studio` (server) share types via `studio-contracts`. `studio-web` never imports from `core` directly — all data access goes through the REST/SSE API layer.

---

## C. API Layer

Extend `packages/studio/` with REST + SSE endpoints. The existing HTML server continues to work as a lightweight fallback.

### REST Endpoints

| Method | Path | Request | Response | Notes |
|---|---|---|---|---|
| `GET` | `/api/playbooks` | — | `PlaybookSummary[]` | List all playbooks from `.converge/playbooks/` |
| `GET` | `/api/playbooks/:name` | — | `PlaybookDetail` (def + tasks + latest RunState) | Full playbook with embedded task definitions |
| `POST` | `/api/playbooks/:name/run` | `{ resume?: boolean }` | `{ executionId: string }` | Start or resume a playbook run |
| `DELETE` | `/api/playbooks/:name/run` | — | `{ stopped: boolean }` | Cancel an active run |
| `GET` | `/api/playbooks/:name/runs` | `?limit=N` | `RunSummary[]` | Run history |
| `GET` | `/api/playbooks/:name/run/:execId` | — | `RunState` | Full run state snapshot |
| `GET` | `/api/sessions` | — | `PlannerSessionSnapshot[]` | List planning sessions |
| `POST` | `/api/sessions` | `{ goal, templateId? }` | `{ sessionId: string }` | Create planning session |
| `GET` | `/api/sessions/:id` | — | `PlannerSessionSnapshot` | Session detail with feedback history |
| `POST` | `/api/sessions/:id/feedback` | `{ message: string }` | `{ status: SessionStatus }` | Submit planning feedback |
| `POST` | `/api/sessions/:id/publish` | — | `{ playbookName: string }` | Publish session as playbook |
| `GET` | `/api/tasks/:playbook/:taskId` | — | `TaskDetail` (definition + RunStateNode + outputs) | Task detail with execution data |
| `GET` | `/api/tasks/:playbook/:taskId/review` | — | `HumanReviewHandoff` | Review handoff data + artifact |
| `POST` | `/api/tasks/:playbook/:taskId/review` | `{ decision, feedback }` | `{ accepted: boolean }` | Submit review decision |
| `GET` | `/api/journal/:playbook` | `?eventType=X&limit=N` | `JournalEvent[]` | Filtered journal events |
| `GET` | `/api/skills` | — | `SkillSummary[]` | Available skills |
| `GET` | `/api/config` | — | `StudioConfig` | Studio configuration |
| `PUT` | `/api/config` | `StudioConfig` | `StudioConfig` | Update configuration |

### SSE Endpoints

| Path | Event Types | Notes |
|---|---|---|
| `GET /api/playbooks/:name/run/events` | `RunEvent` stream (task status changes, check results, gap detections, journal events) | Real-time execution monitoring. Client reconnects on drop. |
| `GET /api/sessions/:id/events` | `SessionEvent` stream (status changes, planner progress, draft updates) | Real-time planning session updates. |

---

## D. Phased Migration

### Phase 0: Foundation (Week 1–2)

**Goal:** Buildable, navigable empty shell.

1. Create `packages/studio-web/` with Next.js 16 + React 18 + Tailwind CSS 4 + TypeScript
2. Copy from open-design `apps/web/`:
   - `styles/tokens.css`, `styles/primitives.css`, `styles/base.css`, `styles/shell.css`
   - `state/appearance.ts` (theme system)
   - `components/Icon.tsx`, `Loading.tsx`, `Toast.tsx`, `CustomSelect.tsx`
   - `router.ts` (adapt Route type to Converge routes)
   - `index.css` (cascade entrypoint — strip design-specific imports)
3. Create `packages/studio-contracts/` with initial type stubs
4. Verify: `pnpm --filter @converge/studio-web build` succeeds, app renders an empty shell with theme toggle

### Phase 1: Core Shell (Week 3–4)

**Goal:** Navigable home page with playbook listing.

1. Adapt `EntryView` + `EntryShell` + `EntryNavRail` → `StudioEntryView`
   - Swap nav tabs (playbooks/runs/skills/providers/integrations)
   - Bind playbook list to `GET /api/playbooks`
2. Adapt `WorkspaceTabsBar` (change tab types)
3. Adapt `SettingsDialog` (strip design sections, add provider config)
4. Build stub `PlaybookWorkspaceView` (three-column layout, empty panels)
5. Extend `packages/studio/` with `GET /api/playbooks` endpoint
6. Verify: can browse playbook list, open a playbook (shows empty workspace), change settings

### Phase 2: Planning Workspace (Week 5–7)

**Goal:** Interactive planning flow via chat sidebar.

1. Adapt `ChatPane` → `PlanningChatPane` (bind to session API)
2. Adapt `ChatComposer` → `PlanningComposer` (template picker, goal input)
3. Adapt `AssistantMessage` → `AgentMessage` (planner responses)
4. Adapt `ToolCard` for human review decisions
5. Build `NewPlaybookModal` (from `NewProjectModal`)
6. Extend `packages/studio/` with session REST + SSE endpoints
7. Verify: can create a planning session, chat with planner, give feedback, publish playbook

### Phase 3: Execution Dashboard (Week 8–10)

**Goal:** Real-time run monitoring with task navigation.

1. Adapt `DesignFilesPanel` → `TaskTreePanel` (task DAG as tree with status colors)
2. Adapt `FileViewer` → `TaskOutputViewer` (TASK.md rendering, checks, attempts, outputs tabs)
3. Build `DAGVisualization` (wave-based graph view)
4. Wire `PlaybookWorkspaceView` three-column layout (chat | viewer | task tree)
5. Build run controls (start/stop/resume) in workspace header
6. Extend `packages/studio/` with run REST + SSE endpoints
7. Adapt Theater → `VerificationPanel` (gap categories, convergence progress)
8. Verify: can start a run, watch tasks progress in real-time, click tasks to view details, see gap alerts

### Phase 4: Review & Polish (Week 11–12)

**Goal:** Complete human-in-the-loop workflow and UI polish.

1. Build `HumanReviewQueue` (pending reviews with inline decisions)
2. Build `JournalViewer` (filterable event log)
3. Build `GapPanel` (collapsible gap display)
4. Adapt `QuickSwitcher` for task/playbook search
5. Adapt `ConversationsMenu` for session/run switching
6. Polish keyboard shortcuts, responsive layout, loading states
7. Rebrand all visible text (i18n keys) from "Open Design" → "Converge Studio"
8. Verify: end-to-end flow — plan playbook → run → review blocked task → approve → run completes

---

## E. Converge-Only UI Additions

Summary of new visual treatments for concepts that have no open-design equivalent.

| Concept | Visual Treatment | Where It Appears |
|---|---|---|
| Manifest node state (concrete/expected/frontier) | Solid border / dashed border / faded + dotted border on task tree nodes | TaskTreePanel, DAGVisualization |
| Task mode (task/spawner/converger/gateway) | Small icon badge inline with task name | TaskTreePanel, TaskOutputViewer header |
| Gap severity (critical/high/medium/low) | Color-coded badge: red/orange/yellow/blue | GapPanel, workspace header badge, JournalViewer |
| Execution wave grouping | Horizontal divider with "Wave N" label between task groups | TaskTreePanel (when sorted by wave), DAGVisualization |
| Check results | Green checkmark / red X per check with expandable output | TaskOutputViewer "Checks" tab |
| Attempt history | Horizontal timeline with numbered circles, color-coded by attempt status | TaskOutputViewer "Attempts" tab |
| Convergence progress | Horizontal progress bar: gaps resolved / total gaps | VerificationPanel header (adapted from ScoreTicker) |
| Run cost rollup | Small text showing total tokens + estimated cost | Workspace header, RunDashboard |
