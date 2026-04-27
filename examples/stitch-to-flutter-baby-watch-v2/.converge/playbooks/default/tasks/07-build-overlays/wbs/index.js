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

// ── Validate AI-discovered overlays ─────────────────────────────────
function validateOverlays(data) {
  if (!Array.isArray(data)) return [];
  const validTypes = ['bottom-sheet', 'dialog', 'persistent-bar'];
  return data
    .filter(o => o && typeof o.id === 'string' && typeof o.title === 'string')
    .map(o => ({
      id: String(o.id),
      title: String(o.title),
      parentScreenId: o.parentScreenId ? String(o.parentScreenId) : '',
      overlayType: validTypes.includes(o.overlayType) ? o.overlayType : 'bottom-sheet',
      description: o.description ? String(o.description) : '',
    }));
}

export async function run(ctx) {
  const screensPath = join(ctx.projectDir, '.stitch/screens.json');

  if (!existsSync(screensPath)) {
    throw new Error('Missing required file: .stitch/screens.json');
  }

  const raw = JSON.parse(readFileSync(screensPath, 'utf-8'));
  const allEntries = Array.isArray(raw) ? raw : raw.screens;

  // ── Step 1: Read overlay entries declared in screens.json ──────────
  const screensJsonOverlays = allEntries
    .filter(s => s.route && s.route.startsWith('overlay:'))
    .map(s => ({
      id: s.id,
      title: s.title,
      parentScreenId: s.parentScreenId || '',
      overlayType: s.overlayType || 'bottom-sheet',
      description: s.description || '',
      htmlReference: typeof s.htmlReference === 'string' ? s.htmlReference.trim() : '',
    }));

  // ── Step 2: Always run AI discovery and merge ─────────────────────
  // Rationale: screens.json is often incomplete because the upstream
  // 004-breakdown-ux-to-screens task only declares overlays that have an
  // explicit reference. Placeholder triggers (showModalBottomSheet with
  // Placeholder()) added later get missed. AI discovery scans the actual
  // screen source for triggers and we merge with screens.json (dedup by id).
  ctx.log.info('Running AI overlay discovery to catch placeholder triggers in screen source');

  const screenIds = allEntries.map(s => s.id).join(', ');

  const aiResponse = await ctx.ai.ask(
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
Skip files under lib/screens/**/*_legacy.dart — those are deprecated and being removed.
Return the list as a JSON array.`
  );

  let aiOverlays = [];
  try {
    aiOverlays = validateOverlays(JSON.parse(aiResponse.text()));
    ctx.log.info(`AI discovered ${aiOverlays.length} overlays`);
  } catch {
    ctx.log.warn('AI response was not valid JSON — falling back to screens.json overlays only');
  }

  // ── Merge: screens.json takes precedence on conflicts (it carries htmlReference) ──
  const byId = new Map();
  for (const o of aiOverlays) byId.set(o.id, o);
  for (const o of screensJsonOverlays) byId.set(o.id, o); // overwrites if id matched
  const overlays = [...byId.values()];

  const declaredIds = new Set(screensJsonOverlays.map(o => o.id));
  const newFromAi = aiOverlays.filter(o => !declaredIds.has(o.id)).length;
  ctx.log.info(`Total overlays after merge: ${overlays.length} (${screensJsonOverlays.length} from screens.json + ${newFromAi} new from AI)`);

  if (overlays.length === 0) {
    ctx.log.info('No overlays found — skipping');
    return;
  }

  // ── Step 3: Spawn per-overlay pipeline ─────────────────────────
  // Spawned tasks (parent overlay + its 5 step children) write into the
  // journal automatically. The journal is the source of truth for execution
  // state; the playbook directory holds only the blueprint (this WBS + the
  // wbs/templates/overlay/ TASK.md files).
  const templateBase = '.converge/playbooks/default/tasks/07-build-overlays/wbs/templates/overlay';
  let prevOverlayLastId = null;

  for (const overlay of overlays) {
    const { id: overlayId, title, parentScreenId, overlayType } = overlay;
    // Use overlayId as both the spawned task id and the template variable that
    // composes child task ids. Avoids index-based numeric prefixes that would
    // shift when discovery order changes between runs (see git log of this WBS
    // for the renumbering bug that motivated this).
    const prefix = overlayId;
    const widgetName = toPascalCase(overlayId);
    const snakeName = toSnakeCase(overlayId);
    const overlayTaskId = overlayId;

    const htmlRef = typeof overlay.htmlReference === 'string' ? overlay.htmlReference.trim() : '';
    const vars = {
      prefix, overlayId, title, widgetName, snakeName, overlayTaskId,
      parentScreenId: parentScreenId || '',
      parentScreenPath: parentScreenId ? toParentScreenPath(parentScreenId) : '',
      overlayType: overlayType || 'bottom-sheet',
      specPath: `.stitch/designs/${overlayId}/SPEC.md`,
      metaPath: `.stitch/designs/${overlayId}/META.md`,
      designPath: `.stitch/designs/${overlayId}/design.html`,
      widgetPath: `lib/widgets/overlays/${snakeName}/${snakeName}.dart`,
      htmlReference: htmlRef,
      htmlReferenceInput: htmlRef ? `  - "${htmlRef.replace(/"/g, '\\"')}"\n` : '',
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
    const steps = ['01-spec', '02-design', '03-convert', '04-connect', '05-mount'];

    for (const step of steps) {
      const id = `${prefix}-${step}`;
      const templatePath = `${templateBase}/tasks/{{prefix}}-${step}/TASK.md`;

      await ctx.spawn(
        { _type: 'template-ref', path: templatePath, vars },
        { id },
      );
    }

    prevOverlayLastId = `${prefix}-05-mount`;
  }
}
