// WBS: Per-widget lift subtasks
// Reads widgets.jsonl and spawns one subtask per shared widget using tasks/subtask/TASK.md.
// If no widgets are marked shared, spawns a single no-op task so the WBS doesn't fail.

import { readFileSync } from 'fs';
import { join, relative, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

export async function run(ctx) {
  const SUBTASK_TEMPLATE = relative(ctx.projectDir, join(__dirname, 'tasks', 'subtask', 'TASK.md'));
  const { localWidgetsDir, screenPath, screenId, screenTitle, widgetsJsonPath } = ctx.vars;
  const filePath = join(ctx.projectDir, widgetsJsonPath);

  let lines = [];
  try {
    lines = readFileSync(filePath, 'utf-8').split('\n').filter(l => l.trim());
  } catch {
    // widgets.jsonl missing — treat as no shared widgets
  }

  const shared = lines.map(l => JSON.parse(l)).filter(c => c.shared);

  if (shared.length === 0) {
    const noopId = '001-noop-no-shared-widgets';
    await ctx.spawn(
      {
        id: noopId,
        title: `Lift: ${screenTitle} — no shared widgets`,
        body: `No widgets in \`${widgetsJsonPath}\` are marked \`shared: true\`. Nothing to lift for ${screenTitle}.`,
        tags: ['lift', 'noop'],
        checks: [
          {
            id: 'noop',
            cmd: 'true',
            description: 'No shared widgets to lift',
          },
        ],
      },
      { id: noopId }
    );
    return;
  }

  const snakeName = (name) => name.replace(/([a-z])([A-Z])/g, '$1_$2').toLowerCase();

  for (let i = 0; i < shared.length; i++) {
    const widget = shared[i];
    const idx = String(i + 1).padStart(3, '0');
    const id = `${idx}-lift-${widget.name}`;
    const localWidgetPath = `${localWidgetsDir}/${snakeName(widget.name)}.dart`;
    const sharedWidgetPath = `lib/widgets/${snakeName(widget.name)}.dart`;

    await ctx.spawn(
      {
        _type: 'template-ref',
        path: SUBTASK_TEMPLATE,
        vars: {
          widgetName: widget.name,
          snakeName: snakeName(widget.name),
          screenId,
          screenTitle,
          localWidgetPath,
          sharedWidgetPath,
          localWidgetsDir,
          screenPath,
          subtaskId: id,
        },
      },
      { id }
    );
  }
}
