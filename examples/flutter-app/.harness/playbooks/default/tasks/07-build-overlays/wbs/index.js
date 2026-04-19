/**
 * WBS: Per-Overlay Pipeline
 *
 * Reads screens.json and spawns a 5-step pipeline per overlay screen.
 * Overlays are identified by routes starting with "overlay:".
 *
 * Steps: Spec → Design → Convert → Connect → Mount
 */

import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

function toPascalCase(str) {
  return str.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join('');
}

function toSnakeCase(str) {
  return str.replace(/-/g, '_');
}

export async function run(ctx) {
  const screensPath = join(ctx.projectDir, '.stitch/screens.json');

  if (!existsSync(screensPath)) {
    throw new Error('Missing required file: .stitch/screens.json');
  }

  const raw = JSON.parse(readFileSync(screensPath, 'utf-8'));
  const overlays = (Array.isArray(raw) ? raw : raw.screens)
    .filter(s => s.route.startsWith('overlay:'));

  if (!overlays || overlays.length === 0) {
    // No overlays defined — skip gracefully
    return;
  }

  let prevOverlayLastId = null;

  for (let idx = 0; idx < overlays.length; idx++) {
    const overlay = overlays[idx];
    const { id: overlayId, title } = overlay;
    const prefix = String(idx + 1).padStart(3, '0');
    const widgetName = toPascalCase(overlayId);
    const snakeName = toSnakeCase(overlayId);
    const overlayTaskId = `${prefix}-${overlayId}`;

    const vars = {
      prefix, overlayId, title, widgetName, snakeName, overlayTaskId,
      specPath: `.stitch/designs/${overlayId}/SPEC.md`,
      designPath: `.stitch/designs/${overlayId}/design.html`,
      widgetPath: `lib/widgets/overlays/${snakeName}/${snakeName}.dart`,
    };

    // Parent task
    await ctx.spawn({
      id: overlayTaskId,
      title: `Overlay: ${title}`,
      dependencies: prevOverlayLastId ? [prevOverlayLastId] : [],
      tags: ['overlay', `overlay-${overlayId}`],
      vars: { overlayId, overlayTitle: title, widgetName },
      body: `Parent task for building the "${title}" overlay: spec → design → convert → connect → mount.`,
    });

    // Step tasks
    const steps = [
      { step: '01-spec', title: `Spec: ${title}`, plan: true },
      { step: '02-design', title: `Design: ${title}` },
      { step: '03-convert', title: `Convert: ${title}` },
      { step: '04-connect', title: `Connect: ${title}` },
      { step: '05-mount', title: `Mount: ${title}` },
    ];

    let prevStepId = null;
    for (const { step, title: stepTitle, plan } of steps) {
      const id = `${prefix}-${step}`;
      await ctx.spawn({
        id,
        title: stepTitle,
        dependencies: prevStepId ? [prevStepId] : [],
        tags: ['overlay', `overlay-${overlayId}`, step.split('-')[1]],
        vars,
        plan: plan || false,
        body: `Step ${step} for overlay "${title}".`,
      });
      prevStepId = id;
    }

    prevOverlayLastId = `${prefix}-05-mount`;
  }
}
