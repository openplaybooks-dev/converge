/**
 * WBS: Per-screen (and per-overlay) accessibility pass.
 *
 * Spawns one child per screen from screens.json and one child per overlay.
 * Sequential — children edit shared files in lib/widgets/ and emit
 * test/accessibility/<id>_a11y_test.dart.
 */

import { existsSync, readFileSync } from 'fs';
import { join } from 'path';

import { toPascalCase, toSnakeCase } from '../../03-build-screens/wbs/helpers.js';

const TEMPLATE_BASE = '.converge/playbooks/default/tasks/09-accessibility/wbs/templates/a11y';

export async function run(ctx) {
  const screensPath = join(ctx.projectDir, '.stitch/screens.json');
  if (!existsSync(screensPath)) {
    throw new Error(`Missing .stitch/screens.json`);
  }
  const raw = JSON.parse(readFileSync(screensPath, 'utf-8'));
  const all = Array.isArray(raw) ? raw : raw.screens;

  const regularScreens = all.filter(s =>
    typeof s.route === 'string' &&
    s.route.startsWith('/') &&
    !s.route.startsWith('overlay:')
  );
  const overlays = all.filter(s =>
    typeof s.route === 'string' && s.route.startsWith('overlay:')
  );

  let prevId = null;
  let counter = 0;

  for (const screen of regularScreens) {
    counter++;
    const { id: screenId, title } = screen;
    const prefix = String(counter).padStart(3, '0');
    const widgetName = toPascalCase(screenId);
    const snakeName = toSnakeCase(screenId);
    const taskId = `${prefix}-a11y-${screenId}`;

    const vars = {
      prefix, screenId, title, widgetName, snakeName, taskId,
      screenPath: `lib/screens/${snakeName}/${snakeName}_screen.dart`,
      localWidgetsDir: `lib/screens/${snakeName}/widgets`,
      testPath: `test/accessibility/${snakeName}_a11y_test.dart`,
      prevId: prevId || '',
      kind: 'screen',
    };

    await ctx.spawn(
      {
        _type: 'template-ref',
        path: `${TEMPLATE_BASE}/tasks/{{prefix}}-a11y-target/TASK.md`,
        vars,
      },
      {
        id: taskId,
        writeToPath: `.converge/playbooks/default/tasks/09-accessibility/tasks/${taskId}/TASK.md`,
      }
    );
    prevId = taskId;
  }

  for (const overlay of overlays) {
    counter++;
    const { id: overlayId, title } = overlay;
    const prefix = String(counter).padStart(3, '0');
    const widgetName = toPascalCase(overlayId);
    const snakeName = toSnakeCase(overlayId);
    const taskId = `${prefix}-a11y-overlay-${overlayId}`;

    const vars = {
      prefix, screenId: overlayId, title, widgetName, snakeName, taskId,
      screenPath: `lib/widgets/overlays/${snakeName}/${snakeName}.dart`,
      localWidgetsDir: `lib/widgets/overlays/${snakeName}`,
      testPath: `test/accessibility/overlays/${snakeName}_a11y_test.dart`,
      prevId: prevId || '',
      kind: 'overlay',
    };

    await ctx.spawn(
      {
        _type: 'template-ref',
        path: `${TEMPLATE_BASE}/tasks/{{prefix}}-a11y-target/TASK.md`,
        vars,
      },
      {
        id: taskId,
        writeToPath: `.converge/playbooks/default/tasks/09-accessibility/tasks/${taskId}/TASK.md`,
      }
    );
    prevId = taskId;
  }
}
