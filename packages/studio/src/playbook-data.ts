export interface PlaybookCheck {
  cmd: string;
  exit: number | null;
  label: string;
  actual?: string;
}

export interface TaskReview {
  state: "pending" | "approved" | "changes" | "rejected";
  reviewer?: string | null;
  note?: string;
  tags?: string[];
  requestedAt?: string;
  completedAt?: string;
  blocks?: string[];
}

export interface TaskHandoff {
  artifact: string;
  format?: "md" | "html";
  generate?: string;
  skill?: string;
}

export interface PlaybookTask {
  id: string;
  title: string;
  mode: string;
  status: string;
  duration: string | null;
  summary: string;
  outputs: string[];
  checks: PlaybookCheck[];
  review: TaskReview | null;
  children?: PlaybookTask[];
  progress?: { done: number; total: number };
  group?: string;
  dependsOn?: string[];
  dependedOnBy?: string[];
  inputs?: string[];
  dagType?: string;
  attempts?: {
    attempt: number;
    status: string;
    durationMs: number;
    error?: string;
  }[];
  body?: string;
  description?: string;
  tags?: string[];
  agent?: string;
  skill?: string | string[];
  handoff?: TaskHandoff | null;
  sourcePath?: string;
  vars?: Record<string, unknown>;
  spawnedChildren?: string[];
}

export interface TaskGroup {
  id: string;
  title: string;
  summary: string;
  tasks: PlaybookTask[];
}

export interface ChatMsg {
  id: string;
  role: "user" | "agent" | "tool" | "system";
  ts: string;
  text: string;
  highlight?: boolean;
}

export interface PlaybookData {
  id: string;
  name: string;
  goal: string;
  runId: string;
  startedAt: string;
  provider: string;
  runStatus: "idle" | "running" | "complete" | "error";
  counts: {
    ok: number;
    live: number;
    delta: number;
    fail: number;
    total: number;
    awaiting: number;
  };
  groups: TaskGroup[];
  chat: ChatMsg[];
}

export const PLAYBOOK_DATA: PlaybookData = {
  id: "design-system-build",
  name: "design-system-build",
  goal: "Build a Converge-flavored design system from upstream sources.",
  runId: "run-2026-05-26T14:33:08Z",
  startedAt: "14:33:08",
  provider: "claude · MiniMax-M2.7",
  runStatus: "running",
  counts: { ok: 4, live: 1, delta: 1, fail: 0, total: 10, awaiting: 3 },

  groups: [
    {
      id: "build",
      title: "Build phase",
      summary: "3 tasks · sources → tokens → preview cards",
      tasks: [
        {
          id: "01-explore-sources",
          title: "01-explore-sources",
          mode: "task",
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
          mode: "spawner",
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
          children: [
            {
              id: "02/palette",
              title: "02/palette",
              mode: "spawner",
              status: "ok",
              duration: "00:34",
              summary:
                "Extract the body + status + accent palettes from brand.json into CSS custom properties.",
              outputs: ["./tokens/palette.css"],
              checks: [
                {
                  cmd: 'grep -c "cv-bg" ./tokens/palette.css',
                  exit: 0,
                  label: "body palette present",
                },
              ],
              review: null,
              children: [
                {
                  id: "02/palette/body",
                  title: "02/palette/body",
                  mode: "spawner",
                  status: "ok",
                  duration: "00:12",
                  summary:
                    "Body palette — bg, bg-elev, bg-code, text, text-muted, text-dim, border tokens.",
                  outputs: ["./tokens/palette-body.css"],
                  checks: [
                    {
                      cmd: "test -f ./tokens/palette-body.css",
                      exit: 0,
                      label: "file exists",
                    },
                  ],
                  review: null,
                  children: [
                    {
                      id: "02/palette/body/light",
                      title: "02/palette/body/light",
                      mode: "task",
                      status: "ok",
                      duration: "00:06",
                      summary:
                        "Light theme body tokens — cream paper #F6F4E9 background, ink #111827 text.",
                      outputs: ["./tokens/palette-body-light.css"],
                      checks: [],
                      review: null,
                    },
                    {
                      id: "02/palette/body/dark",
                      title: "02/palette/body/dark",
                      mode: "task",
                      status: "live",
                      duration: "--:--",
                      summary:
                        "Dark theme body tokens — deep ink #0F172A background, slate #F8FAFC text.",
                      outputs: ["./tokens/palette-body-dark.css"],
                      checks: [],
                      review: null,
                    },
                  ],
                },
                {
                  id: "02/palette/status",
                  title: "02/palette/status",
                  mode: "task",
                  status: "ok",
                  duration: "00:08",
                  summary:
                    "Status palette — ok #10B981, delta #F59E0B, fail #FB6A76, live #27E62B.",
                  outputs: ["./tokens/palette-status.css"],
                  checks: [],
                  review: null,
                },
                {
                  id: "02/palette/accent",
                  title: "02/palette/accent",
                  mode: "task",
                  status: "ok",
                  duration: "00:06",
                  summary:
                    "Accent palette — terracotta #BE5133 for italic-emphasis, link hover, highlight wash.",
                  outputs: ["./tokens/palette-accent.css"],
                  checks: [],
                  review: null,
                },
              ],
            },
            {
              id: "02/typography",
              title: "02/typography",
              mode: "task",
              status: "ok",
              duration: "00:28",
              summary:
                "Type tokens — Inter sans, JetBrains Mono, Crimson Pro italic. Heading scale h1–h4.",
              outputs: ["./tokens/typography.css"],
              checks: [
                {
                  cmd: 'grep -c "cv-h1" ./tokens/typography.css',
                  exit: 0,
                  label: "heading tokens present",
                },
              ],
              review: null,
            },
            {
              id: "02/spacing",
              title: "02/spacing",
              mode: "task",
              status: "ok",
              duration: "00:18",
              summary:
                "Spacing + radii + shadow tokens. Tailwind-derived 4–128px ramp.",
              outputs: ["./tokens/spacing.css"],
              checks: [],
              review: null,
            },
          ],
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
              mode: "task",
              status: "ok",
              duration: "00:48",
              summary:
                "5 cards — body palette, status palette, terracotta accent scope, review verdicts, diagram palette.",
              outputs: [
                "./preview/01-color-body.html",
                "./preview/02-color-status.html",
                "./preview/03-color-accent.html",
                "./preview/04-color-review.html",
                "./preview/05-color-diagram.html",
              ],
              checks: [
                {
                  cmd: "ls preview/0[1-5]*.html | wc -l",
                  exit: 0,
                  label: "5 color cards present",
                },
              ],
              review: null,
            },
            {
              id: "03/type",
              title: "card-group · type",
              mode: "task",
              status: "ok",
              duration: "00:52",
              summary:
                "4 cards — display h1/h2, heading scale h3/h4/body/small, italic-emphasis motif, mono specimens.",
              outputs: [
                "./preview/06-type-display.html",
                "./preview/07-type-headings.html",
                "./preview/08-type-italic-emphasis.html",
                "./preview/09-type-mono.html",
              ],
              checks: [
                {
                  cmd: "ls preview/0[6-9]*.html | wc -l",
                  exit: 0,
                  label: "4 type cards present",
                },
              ],
              review: null,
            },
            {
              id: "03/spacing",
              title: "card-group · spacing",
              mode: "task",
              status: "ok",
              duration: "00:38",
              summary:
                "4 cards — spacing scale 4–128px, radii 2/2/4, borders hairline/strong/dashed, shadow-pop.",
              outputs: [
                "./preview/10-spacing-scale.html",
                "./preview/11-radii.html",
                "./preview/12-borders.html",
                "./preview/13-shadow-pop.html",
              ],
              checks: [
                {
                  cmd: "ls preview/1[0-3]*.html | wc -l",
                  exit: 0,
                  label: "4 spacing cards present",
                },
              ],
              review: null,
            },
            {
              id: "03/components",
              title: "card-group · components",
              mode: "task",
              status: "ok",
              duration: "01:24",
              summary:
                "7 cards — primary button, review verdict buttons, status indicators, pill tags, task row, review verdict card, link styles.",
              outputs: [
                "./preview/14-button-primary.html",
                "./preview/15-button-review.html",
                "./preview/16-status-indicators.html",
                "./preview/17-pill-tags.html",
                "./preview/18-task-row.html",
                "./preview/19-review-verdict-card.html",
                "./preview/20-link-styles.html",
              ],
              checks: [
                {
                  cmd: "ls preview/1[4-9]*.html preview/20*.html | wc -l",
                  exit: 0,
                  label: "7 component cards present",
                },
              ],
              review: null,
            },
            {
              id: "03/brand",
              title: "card-group · brand",
              mode: "task",
              status: "ok",
              duration: "00:12",
              summary:
                "1 card — logo wordmark, favicon, banner, apple-touch-icon.",
              outputs: ["./preview/21-brand-mark.html"],
              checks: [
                {
                  cmd: "test -f preview/21-brand-mark.html",
                  exit: 0,
                  label: "brand card present",
                },
              ],
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
          mode: "task",
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
          mode: "task",
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
          mode: "task",
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
          mode: "task",
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
          mode: "task",
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
          mode: "task",
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
