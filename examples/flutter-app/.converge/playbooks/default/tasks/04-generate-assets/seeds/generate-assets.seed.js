/**
 * Seed: Asset Generation Pipeline
 *
 * Reads assets.json (produced by 001-analyze-assets) and spawns a 3-step
 * pipeline per asset: spec → generate → wire.
 *
 * Uses a single unified template set: templates/asset/tasks/{01-spec,02-generate,03-wire}
 */

import { readFileSync } from 'fs';
import { join } from 'path';

const Seed_ROOT = '.converge/playbooks/default/tasks/04-generate-assets/seed/templates';
const TEMPLATE_BASE = `${Seed_ROOT}/asset`;

/** Convert kebab-case id to PascalCase */
function toPascalCase(str) {
  return str.replace(/(^|[-_])(\w)/g, (_, _sep, c) => c.toUpperCase());
}

export async function run(ctx) {
  const manifestPath = join(ctx.projectDir, 'assets.json');

  let manifest;
  try {
    manifest = JSON.parse(readFileSync(manifestPath, 'utf-8'));
  } catch {
    ctx.log.error(
      'assets.json not found — run 001-analyze-assets first'
    );
    return;
  }

  const assets = manifest.assets;
  if (!assets || assets.length === 0) {
    ctx.log.info('No assets in manifest — nothing to spawn');
    return;
  }

  let prevAssetLastId = null;

  for (let i = 0; i < assets.length; i++) {
    const asset = assets[i];
    const prefix = String(i + 1).padStart(3, '0');
    const assetTaskId = `${prefix}-${asset.id}`;

    const assetVars = {
      projectDir: ctx.projectDir,
      prefix,
      assetId: asset.id,
      assetType: asset.type,
      assetName: asset.name,
      assetCategory: asset.category,
      outputPath: asset.outputPath,
      format: asset.format,
      assetTaskId,
      assetWidgetName: asset.wire?.widgetName || toPascalCase(asset.id),
      assetDescription: asset.description,
      dimensionWidth: asset.dimensions?.width || 24,
      dimensionHeight: asset.dimensions?.height || 24,
      generateGuidelines: asset.generateGuidelines || '',
      wireTargetFile: asset.wire?.targetFile || '',
      wireAction: asset.wire?.action || '',
      contextScreens: Array.isArray(asset.context?.screens)
        ? asset.context.screens.join(', ')
        : '',
      contextWidget: asset.context?.widget || '',
      tags: Array.isArray(asset.tags) ? asset.tags.join(', ') : '',
    };

    // Level 1: Asset parent task
    await ctx.spawn({
      id: assetTaskId,
      title: `${asset.type}: ${asset.name}`,
      dependencies: prevAssetLastId ? [prevAssetLastId] : [],
      tags: ['asset', asset.type, ...(asset.tags || [])],
      vars: assetVars,
      body: `Generate ${asset.type} "${asset.name}" — ${asset.description}`,
    });

    // Level 2: Pipeline steps (spec → generate → wire)
    const steps = ['01-spec', '02-generate', '03-wire'];

    for (const step of steps) {
      const id = `${prefix}-${step}`;
      const templatePath = `${TEMPLATE_BASE}/tasks/${step}/TASK.md`;

      await ctx.spawn(
        { _type: 'template-ref', path: templatePath, vars: assetVars },
        { id }
      );
    }

    prevAssetLastId = `${prefix}-03-wire`;
  }

  ctx.log.info(`Spawned ${assets.length} asset tasks`);
}
