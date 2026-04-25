/**
 * WBS: Per-screen (and per-overlay) widget test generation.
 *
 * Spawns:
 *   000-test-helper    (once, creates test/helpers/pump_app.dart if missing)
 *   {nnn}-test-{screenId}   (one per non-overlay screen in screens.json)
 *   {nnn}-test-overlay-{overlayId}  (one per overlay in screens.json)
 *
 * All sequential. Test-helper first, then screens in screens.json order, then overlays.
 */

import { existsSync, readFileSync } from 'fs';
import { join } from 'path';

import { toPascalCase, toSnakeCase } from '../../03-build-screens/wbs/helpers.js';

const TEMPLATE_BASE = '.converge/playbooks/default/tasks/08-test-screens/wbs/templates/test';

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

  // ── 0: one-off helper spawn ──────────────────────────────────────────
  await ctx.spawn(
    {
      _type: 'template-ref',
      path: `${TEMPLATE_BASE}/tasks/000-test-helper/TASK.md`,
      vars: {},
    },
    {
      id: '000-test-helper',
      writeToPath: '.converge/playbooks/default/tasks/08-test-screens/tasks/000-test-helper/TASK.md',
    }
  );

  let prevId = '000-test-helper';

  // ── Screens ──────────────────────────────────────────────────────────
  for (let idx = 0; idx < regularScreens.length; idx++) {
    const screen = regularScreens[idx];
    const { id: screenId, title, route } = screen;
    const prefix = String(idx + 1).padStart(3, '0');
    const widgetName = toPascalCase(screenId);
    const snakeName = toSnakeCase(screenId);
    const taskId = `${prefix}-test-${screenId}`;

    const vars = {
      prefix, screenId, title, route, widgetName, snakeName, taskId,
      screenPath: `lib/screens/${snakeName}/${snakeName}_screen.dart`,
      statesPath: `lib/screens/${snakeName}/${snakeName}_states.dart`,
      testPath: `test/screens/${snakeName}/${snakeName}_screen_test.dart`,
      prevId,
    };

    await ctx.spawn(
      {
        _type: 'template-ref',
        path: `${TEMPLATE_BASE}/tasks/{{prefix}}-test-screen/TASK.md`,
        vars,
      },
      {
        id: taskId,
        writeToPath: `.converge/playbooks/default/tasks/08-test-screens/tasks/${taskId}/TASK.md`,
      }
    );

    prevId = taskId;
  }

  // ── Overlays ─────────────────────────────────────────────────────────
  for (let idx = 0; idx < overlays.length; idx++) {
    const overlay = overlays[idx];
    const { id: overlayId, title } = overlay;
    const prefix = String(regularScreens.length + idx + 1).padStart(3, '0');
    const widgetName = toPascalCase(overlayId);
    const snakeName = toSnakeCase(overlayId);
    const taskId = `${prefix}-test-overlay-${overlayId}`;

    const vars = {
      prefix, overlayId, title, widgetName, snakeName, taskId,
      widgetPath: `lib/widgets/overlays/${snakeName}/${snakeName}.dart`,
      testPath: `test/overlays/${snakeName}_test.dart`,
      prevId,
      parentScreenId: overlay.parentScreenId || '',
      overlayType: overlay.overlayType || 'bottom-sheet',
    };

    await ctx.spawn(
      {
        _type: 'template-ref',
        path: `${TEMPLATE_BASE}/tasks/{{prefix}}-test-overlay/TASK.md`,
        vars,
      },
      {
        id: taskId,
        writeToPath: `.converge/playbooks/default/tasks/08-test-screens/tasks/${taskId}/TASK.md`,
      }
    );

    prevId = taskId;
  }
}
