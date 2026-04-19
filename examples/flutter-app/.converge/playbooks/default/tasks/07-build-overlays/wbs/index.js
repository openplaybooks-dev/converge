/**
 * WBS: Per-Overlay Pipeline
 *
 * Discovers overlays and spawns a 5-step pipeline per overlay.
 *
 * Discovery order:
 *   1. screens.json overlay entries (route starts with "overlay:")
 *   2. If none found, AI-discovers overlays from SITE.md + UX.md + existing screen source
 *
 * Steps: Spec → Design → Convert → Connect → Mount
 *
 * Task content comes from wbs/templates/overlay/ — a folder of TASK.md files
 * with {{var}} placeholders substituted at render time by the framework.
 */

import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { z } from 'zod';

function toPascalCase(str) {
  return str.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join('');
}

function toSnakeCase(str) {
  return str.replace(/-/g, '_');
}

function toParentScreenPath(parentScreenId) {
  const snakeName = parentScreenId.replace(/-/g, '_');
  return `lib/screens/${snakeName}/${snakeName}_screen.dart`;
}

// ── Schema for AI-discovered overlays ────────────────────────────────
const OverlaySchema = z.array(z.object({
  id: z.string().describe('kebab-case overlay id, e.g. "mode-selector"'),
  title: z.string().describe('Human-readable title'),
  parentScreenId: z.string().describe('id of the parent screen that triggers this overlay'),
  overlayType: z.enum(['bottom-sheet', 'dialog', 'persistent-bar']),
  description: z.string().describe('What this overlay does'),
}));

export async function run(ctx) {
  const screensPath = join(ctx.projectDir, '.stitch/screens.json');

  if (!existsSync(screensPath)) {
    throw new Error('Missing required file: .stitch/screens.json');
  }

  const raw = JSON.parse(readFileSync(screensPath, 'utf-8'));
  const allEntries = Array.isArray(raw) ? raw : raw.screens;

  // ── Step 1: Try screens.json for overlay entries ────────────────
  let overlays = allEntries
    .filter(s => s.route && s.route.startsWith('overlay:'))
    .map(s => ({
      id: s.id,
      title: s.title,
      parentScreenId: s.parentScreenId || '',
      overlayType: s.overlayType || 'bottom-sheet',
      description: s.description || '',
    }));

  // ── Step 2: AI discovery fallback ──────────────────────────────
  if (overlays.length === 0) {
    ctx.log.info('No overlay entries in screens.json — discovering from SITE.md, UX.md, and screen source files');

    const screenIds = allEntries.map(s => s.id).join(', ');

    overlays = await ctx.ai.ask(
      `Discover all overlays (bottom sheets, dialogs, persistent bars) that should exist in this project.

Read these files:
- .stitch/SITE.md — look for "Modal Overlays" or similar section listing overlay routes
- .stitch/UX.md — look for modal routes, bottom sheets, dialogs described in the navigation architecture
- Scan the parent screen .dart files in lib/screens/ for existing placeholder triggers:
  - showModalBottomSheet with Placeholder() or inline placeholder content
  - showDialog with placeholder content
  - ScaffoldMessenger.of(context).showSnackBar(...) stubs on FABs
  - debugPrint(...) stubs in onTap handlers
  - Widgets with Semantics(label: 'Edit...') but no onTap handler

For each overlay found, determine:
- id: kebab-case identifier (e.g. "mode-selector", "weight-entry")
- title: human-readable name
- parentScreenId: which screen (from screens.json) triggers it. Available screen ids: ${screenIds}
- overlayType: "bottom-sheet", "dialog", or "persistent-bar"
- description: what the overlay does

Skip overlays that are already fully implemented (have real widget content, not Placeholder()).
Return the list as a JSON array.`
    ).asJson(OverlaySchema);

    ctx.log.info(`Discovered ${overlays.length} overlays via AI`);
  }

  if (!overlays || overlays.length === 0) {
    ctx.log.info('No overlays found — skipping');
    return;
  }

  // ── Step 3: Spawn per-overlay pipeline ─────────────────────────
  const templateBase = '.converge/playbooks/default/tasks/07-build-overlays/wbs/templates/overlay';
  let prevOverlayLastId = null;

  for (let idx = 0; idx < overlays.length; idx++) {
    const overlay = overlays[idx];
    const { id: overlayId, title, parentScreenId, overlayType } = overlay;
    const prefix = String(idx + 1).padStart(3, '0');
    const widgetName = toPascalCase(overlayId);
    const snakeName = toSnakeCase(overlayId);
    const overlayTaskId = `${prefix}-${overlayId}`;

    const vars = {
      prefix, overlayId, title, widgetName, snakeName, overlayTaskId,
      parentScreenId: parentScreenId || '',
      parentScreenPath: parentScreenId ? toParentScreenPath(parentScreenId) : '',
      overlayType: overlayType || 'bottom-sheet',
      specPath: `.stitch/designs/${overlayId}/SPEC.md`,
      metaPath: `.stitch/designs/${overlayId}/META.md`,
      designPath: `.stitch/designs/${overlayId}/design.html`,
      widgetPath: `lib/widgets/overlays/${snakeName}/${snakeName}.dart`,
    };

    // ── Level 1: Overlay parent task ──────────────────────────────
    await ctx.spawn({
      id: overlayTaskId,
      title: `Overlay: ${title}`,
      dependencies: prevOverlayLastId ? [prevOverlayLastId] : [],
      tags: ['overlay', `overlay-${overlayId}`],
      vars: { overlayId, overlayTitle: title, widgetName, parentScreenId, overlayType },
      inputs: ['.stitch/screens.json', '.stitch/system/DESIGN.md', '.stitch/UX.md'],
      outputs: [vars.widgetPath],
      body: `Parent task for building the "${title}" overlay: spec → design → convert → connect → mount.`,
    });

    // ── Level 2: Step children (from templates) ──────────────────
    const basePath = `.converge/playbooks/default/tasks/07-build-overlays/tasks/${overlayTaskId}`;
    const steps = ['01-spec', '02-design', '03-convert', '04-connect', '05-mount'];

    for (const step of steps) {
      const id = `${prefix}-${step}`;
      const templatePath = `${templateBase}/tasks/{{prefix}}-${step}/TASK.md`;
      const writeToPath = `${basePath}/tasks/${id}/TASK.md`;

      await ctx.spawn(
        { _type: 'template-ref', path: templatePath, vars },
        { id, writeToPath },
      );
    }

    prevOverlayLastId = `${prefix}-05-mount`;
  }
}
