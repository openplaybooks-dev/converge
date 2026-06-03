# Open Design → Converge Studio: Concept Mapping

This document maps domain concepts, types, statuses, and routes between **Open Design** (the source UI at `open-design/`) and **Converge Studio** (the target product at `converge/`). The goal is maximal UI reuse — we keep the open-design shell and swap data bindings.

---

## A. Domain Entity Mapping

### Primary Entities

| Open Design | Type Location | Converge Studio | Type Location | Data Mapping Notes |
|---|---|---|---|---|
| **Project** | `contracts/src/api/projects.ts` `Project` | **Playbook** | `core/src/task/playbook/types.ts` `PlaybookDef` | Container for all work. `Project.id` → `PlaybookDef.name`. `Project.name` → `PlaybookDef.name`. `Project.metadata` → `PlaybookDef.run`, `PlaybookDef.inputs`. Playbooks live on disk at `.converge/playbooks/<name>/` rather than in SQLite. |
| **ProjectFile** | `contracts/src/api/files.ts` `ProjectFile` | **Task Definition + Task Output** | `core/src/config/task-definition.ts` `TaskDefinition` | `ProjectFile.name` → `TaskDefinition.id`. `ProjectFile.kind` → derived from task output file extension. `ProjectFile.size/mtime` → from filesystem stat of output files. The file tree becomes a task tree. |
| **Conversation** | `contracts/src/api/projects.ts` `Conversation` | **Planning Session** (planning) / **Journal** (execution) | `studio/src/add-ui.ts` `StudioSession`; `core/src/journal/types.ts` `JournalEvent` | During planning: `Conversation.id` → `StudioSession.id`. During execution: conversation maps to the journal event stream for a run. `Conversation.title` → `StudioSession.name`. |
| **ChatMessage** | `contracts/src/api/chat.ts` `ChatMessage` | **FeedbackEntry** (planning) / **JournalEvent** (execution) | `studio/src/add-ui.ts` `FeedbackEntry`; `core/src/journal/types.ts` `JournalEvent` | `ChatMessage.role: 'user'` → `FeedbackEntry` (user feedback in planning loop). `ChatMessage.role: 'assistant'` → planner agent response or journal event. `ChatMessage.content` → `FeedbackEntry.message` or `JournalEvent.message`. |
| **Artifact** | `contracts/src/api/chat.ts` `PersistedAgentEvent` (kind: 'live_artifact') | **Task Output + Review Report** | `core/src/manifest/types.ts` `RunStateNode.outputs[]`; `core/src/task/review.ts` `HumanReviewEntry` | Artifacts are what agents produce. In Converge, each task declares `outputs:` and the runtime tracks them via `output_hashes`. Review artifacts are HTML reports for human inspection. |
| **LiveArtifact** | `contracts/src/api/live-artifacts.ts` `LiveArtifact` | **RunState** (live execution view) | `core/src/manifest/types.ts` `RunState` | LiveArtifacts are continuously-updated previews. The Converge equivalent is the live RunState showing task DAG progress in real-time. `LiveArtifact.refreshStatus` → `RunState.metadata.status`. `LiveArtifact.document` → rendered DAG visualization. |
| **PreviewComment** | `contracts/src/api/comments.ts` `PreviewComment` | **HumanReviewEntry** | `core/src/task/review.ts` `HumanReviewEntry` | `PreviewComment.text` → `HumanReviewEntry.feedback`. `PreviewComment.status` → `HumanReviewEntry.decision` (see status mapping below). `PreviewComment.filePath` → `HumanReviewEntry.taskId`. |
| **DesignSystemSummary** | `contracts/src/design-systems/` | **Skills + Playbook Templates** | `studio/src/add-ui.ts` `TemplateSpec`; skills in `skills/` | Design systems define reusable rules. In Converge, skills are reusable agent capabilities and templates are reusable playbook scaffolds. `DesignSystemSummary.name` → `TemplateSpec.label`. |
| **SkillSummary** | `contracts/src/api/registry.ts` | **Skill** | skills defined in `skills/` directory | Direct 1:1 mapping. Both are reusable agent capabilities with input schemas. |
| **Routine / Automation** | `contracts/src/api/routines.ts` `Routine` | **PlaybookRunConfig** (execution configuration) | `core/src/task/playbook/types.ts` `PlaybookRunConfig` | `Routine.schedule` → external scheduling (cron). `Routine.prompt` → playbook goal. `Routine.enabled` → whether the playbook is configured for recurring execution. `Routine.lastRun` maps to the latest RunState. |
| **Theater / CritiqueConfig** | `web/src/components/Theater/` | **Gap Detection + Convergence Analysis** | `core/src/task/gap/types.ts` `Gap`; `core/src/manifest/types.ts` `RunState` | Theater's multi-agent critique maps to gap detection. Panelist roles → gap types. Score rounds → execution iterations/attempts. Score threshold → convergence criteria (all checks pass). |

### Secondary Entities

| Open Design | Converge Studio | Notes |
|---|---|---|
| **ChatAttachment** (image/file) | **Task Input** (`TaskDefinition.inputs[]`) | Files attached to chat → input files for a task |
| **ChatRunStatusResponse** | **RunState.metadata** | `ChatRunStatus` → `RunState.metadata.status` |
| **PersistedAgentEvent** | **JournalEvent** | Agent events during execution map to journal event types |
| **ProjectMetadata** (kind, fidelity, platform) | **PlaybookDef metadata** (inputs, run config) | Design-specific metadata replaced with execution metadata |
| **DesignSystemReviewEntry** | **HumanReviewEntry** | Both are review decisions with feedback |
| **PromptTemplateMetadata** | **TemplateSpec** | `PromptTemplateMetadata.prompt` → `TemplateSpec.workflowInstruction` |

---

## B. Status / Workflow Mapping

### Project Status → RunState Status

| Open Design `ProjectDisplayStatus` | Converge `RunState.metadata.status` | Notes |
|---|---|---|
| `not_started` | (no RunState exists) | Playbook exists but has never been run |
| `queued` | `running` (initial) | Converge doesn't have a separate queued state; running begins immediately |
| `running` | `running` | Direct mapping |
| `awaiting_input` | Task has `status: 'blocked'` | A task is blocked waiting for human review or missing dependency |
| `succeeded` | `complete` | All tasks passed |
| `failed` | `error` | One or more tasks failed |
| `canceled` | (not in current RunState) | Would need to be added or mapped to `error` with cancellation metadata |

### Comment Status → Review Decision

| Open Design `PreviewCommentStatus` | Converge `HumanReviewDecision` | Notes |
|---|---|---|
| `open` | (no decision yet) | Review handoff created, awaiting human |
| `attached` | (no equivalent) | Skip — design-specific concept (comment anchored to DOM element) |
| `applying` | `revise` (in progress) | Agent is applying the revision feedback |
| `needs_review` | (pending review) | Same semantics — human needs to look at this |
| `resolved` | `approve` | Human approved the result |
| `failed` | `reject` | Human rejected or the revision failed |

### Chat Run Status → Task Node Status

| Open Design `ChatRunStatus` | Converge `RunStateNode.status` | Notes |
|---|---|---|
| `queued` | `pending` | Waiting to execute |
| `running` | `running` | Currently executing |
| `succeeded` | `pass` | All checks passed |
| `failed` | `error` | Execution failed |
| `canceled` | `skipped` | Closest equivalent — task was not executed |

### Additional Converge Statuses (no open-design equivalent)

| Status | Where | Meaning |
|---|---|---|
| `blocked` | `RunStateNode.status` | Dependencies not met or awaiting human review |
| `seeded` | `RunStateNode.status` | Dynamically spawned but not yet materialized on disk |

### Session Status (already native to Converge)

| `SessionStatus` | Meaning |
|---|---|
| `idle` | No active planning session |
| `planning` | Planner agent is generating playbook |
| `awaiting-feedback` | Waiting for user feedback on draft |
| `publishing` | Writing final playbook to disk |
| `published` | Playbook successfully created |
| `failed` | Planning failed |

---

## C. Route Mapping

| Open Design Route | URL Pattern | Converge Studio Route | URL Pattern | Component Mapping |
|---|---|---|---|---|
| Home | `/` | Studio Home | `/` | `HomeView` → `StudioHomeView` (swap project list for playbook list) |
| Onboarding | `/onboarding` | Onboarding | `/onboarding` | Keep as-is, swap content |
| Projects List | `/projects` | Playbooks List | `/playbooks` | `EntryView` (projects tab) → playbook discovery from `.converge/playbooks/` |
| Project Workspace | `/projects/:id` | Playbook Workspace | `/playbooks/:name` | `ProjectView` → `PlaybookWorkspaceView` (same 3-column layout) |
| Project Conversation | `/projects/:id/conversations/:cid` | Planning Session | `/playbooks/:name/sessions/:sid` | Same chat UI, different backing session |
| Project File | `/projects/:id/files/:path` | Task Detail | `/playbooks/:name/tasks/:taskId` | `FileViewer` → `TaskOutputViewer` |
| Design Systems | `/design-systems` | Skills | `/skills` | `DesignSystemsTab` → skills list |
| Design System Create | `/design-systems/create` | (Skip initially) | — | Not needed for MVP |
| Design System Detail | `/design-systems/:id` | Skill Detail | `/skills/:id` | Adapted detail view |
| Automations / Tasks | `/automations` or `/tasks` | Runs | `/runs` | `TasksView` → run history list |
| Plugins | `/plugins` | Providers | `/providers` | `PluginsView` → AI provider configuration |
| Integrations | `/integrations` | Integrations | `/integrations` | Keep as-is, adapt data |
| Marketplace | `/marketplace` | (Skip) | — | Not applicable |
| **New** | — | Live Run Dashboard | `/playbooks/:name/run` | New route — DAG visualization + real-time progress |
| **New** | — | Planning Session | `/playbooks/:name/plan` | New route — interactive planning with feedback loop |

### Route Type Definition (Converge)

```typescript
type EntryHomeView = 'home' | 'onboarding' | 'playbooks' | 'runs' | 'skills' | 'providers' | 'integrations';

type Route =
  | { kind: 'home'; view: EntryHomeView }
  | { kind: 'playbook'; playbookName: string; sessionId?: string | null; taskId: string | null }
  | { kind: 'playbook-plan'; playbookName: string; sessionId: string }
  | { kind: 'playbook-run'; playbookName: string; executionId: string }
  | { kind: 'skill-detail'; skillId: string };
```

---

## D. Converge-Only Concepts

These concepts have no direct open-design equivalent and need new UI treatment.

### Manifest Node States

Tracks whether a task definition physically exists on disk.

| State | Type | Meaning | UI Treatment |
|---|---|---|---|
| `concrete` | `ConcreteNode` | Task file exists on disk at `node.path` | Default task node appearance |
| `expected` | `ExpectedNode` | Predicted from a spawner's seed rules but not yet materialized | Dashed outline / ghost node in task tree |
| `frontier` | `FrontierNode` | Beyond the prediction horizon — may be discovered later | Faded / placeholder node |

**Source:** `core/src/manifest/types.ts` — `ManifestNode = ConcreteNode | ExpectedNode | FrontierNode`

### Task Modes

Each task declares a lifecycle contract via its `mode` field.

| Mode | Meaning | UI Treatment |
|---|---|---|
| `task` | Executes work directly (default) | Standard task icon |
| `spawner` | Creates child tasks dynamically at runtime | Icon with "+" or branching indicator |
| `converger` | Merges results from multiple upstream tasks | Icon with merge/funnel indicator |
| `gateway` | Blocks for external input (human review) | Icon with pause/gate indicator |

**Source:** `core/src/config/task-definition.ts` — `TaskDefinition.mode`

### Gap Types

Detected differences between current state and target state.

| Gap Kind | Meaning | Severity Levels | UI Treatment |
|---|---|---|---|
| `plan` | Missing or incomplete plan | critical/high/medium/low | Warning badge on playbook header |
| `blocker` | Blocking dependency issue | critical/high | Red alert in task tree |
| `output` | Expected output file missing | high/medium | Missing file indicator on task node |
| `check-failed` | Verification check did not pass | high/medium | Red X on check item |
| `corrupted` | Output exists but is invalid | critical | Corruption warning overlay |
| `systemic` | Infrastructure or environment issue | critical/high | System alert banner |
| `user-question` | Needs human input to proceed | medium | Prompt card (reuse AskUserQuestion pattern) |
| `insufficient-evidence` | Not enough data to verify | medium/low | Info badge |
| `contradictory-finding` | Conflicting results detected | high | Conflict indicator |
| `untested-hypothesis` | Hypothesis not yet validated | low | Pending badge |
| `definition` | Task definition issue | medium | Warning on task definition |

**Source:** `core/src/task/gap/types.ts` — `GapKind` enum, `Gap` interface

### Wave-Based Execution Ordering

Tasks execute in waves based on dependency ordering (topological sort). Each wave contains tasks whose dependencies are all satisfied.

| Concept | Meaning | UI Treatment |
|---|---|---|
| Wave N | Set of tasks executable in parallel at step N | Group tasks by wave in the task tree; show wave separators in DAG view |
| Wave progress | How many waves completed vs total | Progress indicator (reuse ScoreTicker pattern from Theater) |

**Source:** `studio/src/add-ui.ts` — `computeWaves()` function

### Journal Event Types

Execution produces a rich stream of journal events.

| Event Category | Key Events | UI Treatment |
|---|---|---|
| Session lifecycle | `SESSION_START`, `SESSION_END` | Timeline markers |
| Iteration tracking | `ITERATION_START`, `ITERATION_COMPLETE` | Iteration separators (reuse day separator pattern from ChatPane) |
| Gap lifecycle | `GAP_DETECTED`, `GAP_RESOLVED`, `GAP_FIX_FAILED` | Gap status change notifications |
| Task lifecycle | `TASK_START`, `TASK_COMPLETE`, `TASK_FAILED`, `TASK_CRASH` | Task status updates in real-time |
| Check results | `CHECK_RUN`, `CHECK_PASSED`, `CHECK_FAILED`, `CHECK_SELF_HEALED` | Check result indicators |
| Correction loops | `CORRECTION_LOOP_START`, `CORRECTION_ATTEMPTED`, `CORRECTION_VERIFIED` | Retry/correction progress |
| Agent activity | `AGENT_START`, `AGENT_COMPLETE`, `AGENT_FAILED` | Agent status in chat pane |
| User interaction | `AWAITING_USER_INPUT`, `USER_INPUT_RECEIVED` | Prompt card in chat |

**Source:** `core/src/journal/types.ts` — `EventType` union (70+ event types)

---

## E. State Management Mapping

### Data Layer Translation

| Open Design Pattern | Location | Converge Studio Equivalent | Notes |
|---|---|---|---|
| **Daemon SQLite** (`app.sqlite`) | `apps/daemon/` | **Filesystem** (`.converge/`) | Converge uses file-based persistence: YAML configs, JSON state, JSONL journals. No database. |
| **REST API** (`/api/*`) | `apps/daemon/src/*-routes.ts` | **New REST API** in `packages/studio/` | Extend the existing studio server with JSON endpoints (currently serves only HTML). |
| **SSE streaming** (chat events) | `contracts/src/sse/` | **SSE streaming** (run events) | Same pattern: `RunEvent` objects streamed over SSE during execution. |
| **React useState** | `apps/web/src/` | **React useState** | Same approach — no global state library needed. |
| **useRoute() hook** | `apps/web/src/router.ts` | **useRoute() hook** | Same custom router pattern with `pushState` + `popstate`. |
| **AppConfig** (localStorage) | `apps/web/src/state/config.ts` | **StudioConfig** (localStorage) | Same pattern for client-side preferences (theme, provider keys, etc). |
| **fetchProjects() / listProjects()** | `apps/web/src/state/projects.ts` | **fetchPlaybooks()** | Reads from `.converge/playbooks/` directory instead of SQLite. |
| **fetchAgents()** | `apps/web/src/providers/registry.ts` | **fetchProviders()** | Lists configured AI providers (Claude, Codex, Gemini, etc). |

### API Client Mapping

| Open Design Provider | Converge Studio Provider | Endpoint Changes |
|---|---|---|
| `listProjects()` | `listPlaybooks()` | `GET /api/playbooks` — reads `.converge/playbooks/` |
| `getProject(id)` | `getPlaybook(name)` | `GET /api/playbooks/:name` — returns PlaybookDef + tasks + latest RunState |
| `createProject()` | `createPlaybook()` / planning session | `POST /api/sessions` — starts interactive planning |
| `fetchConversation()` | `getSession(id)` | `GET /api/sessions/:id` — returns StudioSession with feedback history |
| `chat()` (SSE) | `runPlaybook()` (SSE) | `POST /api/playbooks/:name/run` + `GET /api/playbooks/:name/run/events` (SSE) |
| `listProjectRuns()` | `listRuns(playbook)` | `GET /api/playbooks/:name/runs` — returns run history |
| `submitChatRunToolResult()` | `submitReviewDecision()` | `POST /api/tasks/:playbook/:taskId/review` — approve/revise/reject |
| `fetchDesignSystems()` | `listSkills()` | `GET /api/skills` — lists available skills |
| `fetchComments()` | `listReviewHandoffs()` | `GET /api/reviews` — lists pending human reviews |
