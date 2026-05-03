// Seed: Per-widget split subtasks
// Reads widgets.jsonl and spawns one subtask per widget using tasks/subtask/TASK.md.

import { readFileSync } from 'fs';
import { join, relative, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

export async function run(ctx) {
  const SUBTASK_TEMPLATE = relative(ctx.projectDir, join(__dirname, 'tasks', 'subtask', 'TASK.md'));
  const { localWidgetsDir, screenPath, screenId, screenTitle, widgetsJsonPath } = ctx.vars;
  const filePath = join(ctx.projectDir, widgetsJsonPath);

  let lines;
  try {
    lines = readFileSync(filePath, 'utf-8').split('\n').filter(l => l.trim());
  } catch {
    return;
  }

  if (lines.length === 0) return;

  const widgets = lines.map(l => JSON.parse(l));
  const snakeName = (name) => name.replace(/([a-z])([A-Z])/g, '$1_$2').toLowerCase();

  for (let i = 0; i < widgets.length; i++) {
    const widget = widgets[i];
    const idx = String(i + 1).padStart(3, '0');
    const id = `${idx}-split-${widget.name}`;
    const widgetPath = `${localWidgetsDir}/${snakeName(widget.name)}.dart`;

    await ctx.spawn(
      {
        _type: 'template-ref',
        path: SUBTASK_TEMPLATE,
        vars: {
          ...widget,
          widgetName: widget.name,
          grepString: widget.grep,
          widgetPath,
          localWidgetsDir,
          screenPath,
          screenId,
          screenTitle,
          subtaskId: id,
        },
      },
      { id }
    );
  }
}
