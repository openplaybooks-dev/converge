// WBS: Per-widget lift subtasks
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
  } catch (err) {
    ctx.log.warn(`Could not read widgets.jsonl at ${filePath}: ${err.message}`);
    return;
  }

  if (lines.length === 0) return;

  const parsed = lines.map((l, i) => {
    try {
      return JSON.parse(l);
    } catch {
      ctx.log.warn(`Failed to parse line ${i + 1} in widgets.jsonl: ${l}`);
      return null;
    }
  }).filter(Boolean);

  ctx.log.info(`widgets.jsonl had ${parsed.length} entries`);

  if (parsed.length === 0) {
    ctx.log.info(`No widgets found in ${widgetsJsonPath}, nothing to lift`);
    return;
  }

  const snakeName = (name) => name.replace(/([a-z])([A-Z])/g, '$1_$2').toLowerCase();

  for (let i = 0; i < parsed.length; i++) {
    const widget = parsed[i];
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