// =============================================================
// Converge UI Kit — data.js
// The chat-and-workspace surface narrates the playbook
// that builds THIS design system. Eight tasks, one in
// awaiting-review, plus a chat log that mirrors the run.
// =============================================================

window.PLAYBOOK_DATA = {
  id: "design-system-build",
  name: "design-system-build",
  goal: "Build a Converge-flavored design system from upstream sources.",
  runId: "run-2026-05-26T14:33:08Z",
  startedAt: "14:33:08",
  provider: "claude · MiniMax-M2.7",
  counts: { ok: 4, live: 1, delta: 1, fail: 0, total: 10, awaiting: 3 },

  // Grouped task tree. Each task can declare children — the runner spawns
  // them at runtime and renders them recursively inside the task card.
  groups: [
    {
      id: "build",
      title: "Build phase",
      summary: "3 tasks · sources → tokens → preview cards",
      tasks: [
        {
          id: "01-explore-sources",
          title: "01-explore-sources",
          mode: "leaf",
          status: "ok",
          duration: "01:12",
          summary:
            "Walk the upstream Converge + Open Design repos and copy the canonical brand files.",
          outputs: [
            "./reference/converge-brand.json",
            "./reference/converge-tokens.css",
            "./reference/converge-typography.css",
          ],
          checks: [
            {
              cmd: "test -f ./reference/converge-brand.json",
              exit: 0,
              label: "brand.json present",
            },
            {
              cmd: "jq -e '.palette.accentWarm' ./reference/converge-brand.json",
              exit: 0,
              label: "palette.accentWarm declared",
            },
          ],
          review: {
            state: "approved",
            reviewer: "maintainer",
            note: "Sources copied correctly.",
          },
        },
        {
          id: "02-tokens",
          title: "02-tokens",
          mode: "leaf",
          status: "ok",
          duration: "02:08",
          summary:
            "Write colors_and_type.css from brand.json — palette, status, accent, diagram scopes.",
          outputs: ["./colors_and_type.css"],
          checks: [
            {
              cmd: 'grep -c "BE5133" ./colors_and_type.css',
              exit: 0,
              label: "terracotta token defined",
            },
            {
              cmd: 'grep -c "cv-status-ok" ./colors_and_type.css',
              exit: 0,
              label: "status scope present",
            },
          ],
          review: { state: "approved", reviewer: "maintainer", note: "" },
        },
        {
          id: "03-preview-cards",
          title: "03-preview-cards",
          mode: "spawner",
          status: "ok",
          duration: "03:54",
          summary: "Spawn one child per design-system card across five groups.",
          outputs: ["./preview/*.html (21 files)"],
          checks: [
            {
              cmd: "ls preview/*.html | wc -l",
              exit: 0,
              label: "21 files",
              actual: "21",
            },
          ],
          review: null,
          children: [
            {
              id: "03/colors",
              title: "card-group · colors",
              status: "ok",
              duration: "00:48",
              summary:
                "5 cards · body / status / terracotta / review / diagram",
              review: null,
            },
            {
              id: "03/type",
              title: "card-group · type",
              status: "ok",
              duration: "00:52",
              summary: "4 cards · display / heading scale / italic / mono",
              review: null,
            },
            {
              id: "03/spacing",
              title: "card-group · spacing",
              status: "ok",
              duration: "00:38",
              summary: "4 cards · scale / radii / borders / shadow",
              review: null,
            },
            {
              id: "03/components",
              title: "card-group · components",
              status: "ok",
              duration: "01:24",
              summary: "7 cards · buttons / pills / row / verdict / links",
              review: null,
            },
            {
              id: "03/brand",
              title: "card-group · brand",
              status: "ok",
              duration: "00:12",
              summary: "1 card · mark + wordmark",
              review: null,
            },
          ],
        },
      ],
    },
    {
      id: "review",
      title: "Review phase",
      summary: "1 task · gated on human verdict",
      tasks: [
        {
          id: "04-define-type-scale",
          title: "04-define-type-scale",
          mode: "leaf",
          status: "awaiting-review",
          duration: "00:48",
          summary:
            "Lock the heading scale — Inter 400, very tight tracking (-0.04em on h1). Renders match canonical typography.css within 0.4% delta.",
          outputs: [
            "./preview/06-type-display.html",
            "./preview/07-type-headings.html",
          ],
          checks: [
            {
              cmd: "pnpm test:type",
              exit: 0,
              label: "visual diff vs canonical · within tolerance",
            },
          ],
          review: {
            state: "pending",
            requestedAt: "14:41:07",
            reviewer: null,
            blocks: ["06-ui-kit"],
          },
        },
        {
          id: "04b-define-color-tokens",
          title: "04b-define-color-tokens",
          mode: "leaf",
          status: "awaiting-review",
          duration: "00:36",
          summary:
            "Map the upstream brand.json palette into the cv-* token scope — status / accent / diagram subtrees defined.",
          outputs: ["./colors_and_type.css"],
          checks: [
            {
              cmd: "pnpm test:tokens",
              exit: 0,
              label: "all 14 tokens present · within tolerance",
            },
          ],
          review: {
            state: "pending",
            requestedAt: "14:41:21",
            reviewer: null,
            blocks: ["06-ui-kit"],
          },
        },
        {
          id: "04c-confirm-italic-motif",
          title: "04c-confirm-italic-motif",
          mode: "leaf",
          status: "awaiting-review",
          duration: "00:14",
          summary:
            "Confirm the italic-emphasis motif renders Crimson Pro Italic 500 in terracotta on every body surface.",
          outputs: ["./preview/08-type-italic-emphasis.html"],
          checks: [
            {
              cmd: 'grep -c "BE5133" ./preview/08-type-italic-emphasis.html',
              exit: 0,
              label: "terracotta italic present",
            },
          ],
          review: {
            state: "pending",
            requestedAt: "14:41:34",
            reviewer: null,
            blocks: [],
          },
        },
      ],
    },
    {
      id: "pending",
      title: "In flight & pending",
      summary: "4 tasks · 1 running, 3 blocked",
      tasks: [
        {
          id: "05-components",
          title: "05-components",
          mode: "spawner",
          status: "live",
          duration: "--:--",
          summary:
            "Render component cards: buttons, status indicators, pills, task row, review verdict.",
          outputs: ["./preview/14-*.html → ./preview/21-*.html"],
          checks: [
            {
              cmd: "ls preview/1[4-9]*.html preview/2[01]*.html | wc -l",
              exit: null,
              label: "expected 8 files",
              actual: "running · 4/8",
            },
          ],
          review: null,
          progress: { done: 4, total: 8 },
        },
        {
          id: "06-ui-kit",
          title: "06-ui-kit",
          mode: "leaf",
          status: "delta",
          duration: "--:--",
          summary:
            "Build the playbook + chat workspace (this surface). Unblocks when 04-define-type-scale is approved.",
          outputs: [
            "./ui_kits/playbook/index.html",
            "./ui_kits/playbook/*.jsx",
          ],
          checks: [
            {
              cmd: "open ui_kits/playbook/index.html",
              exit: null,
              label: "manual verification",
            },
          ],
          review: null,
        },
        {
          id: "07-readme",
          title: "07-readme",
          mode: "leaf",
          status: "pending",
          duration: null,
          summary:
            "Finalize README with content fundamentals + visual foundations + iconography.",
          outputs: ["./README.md"],
          checks: [],
          review: null,
        },
        {
          id: "08-skill",
          title: "08-skill",
          mode: "leaf",
          status: "pending",
          duration: null,
          summary:
            "Emit SKILL.md so this design system loads as an Agent Skill.",
          outputs: ["./SKILL.md"],
          checks: [],
          review: null,
        },
      ],
    },
  ],

  // Chat narrates the run. Roles: user · agent · tool · system.
  chat: [
    {
      id: "m1",
      role: "user",
      ts: "14:32:55",
      text: "Build me a Converge-flavored design system from the upstream brand.json. Use /converge-planning to scaffold the playbook.",
    },
    {
      id: "m2",
      role: "agent",
      ts: "14:33:00",
      text: "I'll create a playbook called design-system-build with three phases — *Build*, *Review*, *Pending*. The Review phase gates on a human verdict so you can lock the type scale before downstream tasks consume it.",
    },
    {
      id: "m3",
      role: "tool",
      ts: "14:33:02",
      text: "converge add design-system-build · 8 tasks · spawner mode on 03 + 05",
    },
    {
      id: "m4",
      role: "agent",
      ts: "14:33:06",
      text: "Running. Streaming task events into the journal — watch the Playbook tab on the right for status as they land.",
    },
    {
      id: "m5",
      role: "tool",
      ts: "14:34:20",
      text: "✓ 01-explore-sources · 3 outputs · 2 checks pass · 01:12",
    },
    {
      id: "m6",
      role: "tool",
      ts: "14:36:29",
      text: "✓ 02-tokens · 1 output · 2 checks pass · 02:08",
    },
    {
      id: "m7",
      role: "tool",
      ts: "14:40:18",
      text: "✓ 03-preview-cards (spawner) · 21 children complete · 03:54",
    },
    {
      id: "m8",
      role: "agent",
      ts: "14:41:07",
      text: "04-define-type-scale wrote its outputs and its visual diff passed within tolerance. Because this gates the rest of the run, the runner paused for a *human verdict*. Open the task on the right and approve or request changes.",
      highlight: true,
    },
    {
      id: "m9",
      role: "tool",
      ts: "14:41:08",
      text: "● 05-components · spawner started · 4/8 children running",
    },
  ],
};
