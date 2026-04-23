/**
 * WBS: Deep Research — Layer Spawner
 *
 * Scans existing layer directories to find the next layer number,
 * then spawns the appropriate layer from template. Controls the
 * outer loop: Layer 1 → Layer 2 → Layer 3 → Final Report.
 *
 * Evaluates aggregation outputs to decide whether to proceed
 * to the next layer or terminate early.
 */

import { join, relative, dirname } from 'path';
import { readdirSync, existsSync, readFileSync } from 'fs';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

export async function run(ctx) {
  const parentDir = join(__dirname, '..');
  const tasksDir = join(parentDir, 'tasks');
  const templatesDir = join(__dirname, 'templates');

  // Find next layer number by scanning existing layer-N folders
  let nextLayer = 1;
  if (existsSync(tasksDir)) {
    const existing = readdirSync(tasksDir)
      .filter(d => d.startsWith('layer-'))
      .map(d => parseInt(d.replace('layer-', ''), 10))
      .filter(n => !isNaN(n));
    if (existing.length > 0) {
      nextLayer = Math.max(...existing) + 1;
    }
  }

  // Determine if we should proceed based on prior layer aggregation
  if (nextLayer > 1) {
    const priorLayerDir = join(tasksDir, `layer-${nextLayer - 1}`);
    const aggregationPath = join(priorLayerDir, '004-aggregation', 'aggregation.json');

    if (existsSync(aggregationPath)) {
      const aggregation = JSON.parse(readFileSync(aggregationPath, 'utf-8'));

      // Quality gate check: can we proceed to next layer?
      if (nextLayer === 2 && aggregation.recommendation === 'terminate') {
        // Layer 1 failed quality gate — spawn final report only
        nextLayer = 99; // Special case for final-only
      } else if (nextLayer === 3 && aggregation.recommendation === 'skip_layer_3') {
        // Layer 2 found no cross-area insights — skip to final
        nextLayer = 99;
      } else if (nextLayer > parseInt(ctx.inputs?.maxLayers ?? '3', 10)) {
        // Max layers reached
        nextLayer = 99;
      }
    }
  }

  const layerStr = String(nextLayer).padStart(3, '0');
  const artifactsDir = join(ctx.projectDir, '.converge', 'artifacts', 'deep-research', 'layers', layerStr);

  if (nextLayer === 99) {
    // Spawn final report
    const templatePath = relative(ctx.projectDir, join(templatesDir, 'final', 'TASK.md'));
    await ctx.spawn(
      { _type: 'template-ref', path: templatePath, vars: {
        taskId: 'final-report', projectDir: ctx.projectDir,
        artifactsDir, templatesDir,
        question: ctx.inputs?.question ?? '',
        domain: ctx.inputs?.domain ?? 'general',
      }},
      { id: 'final-report' },
    );
    return;
  }

  const layerTemplateDir = join(templatesDir, `layer-${nextLayer}`);
  const layerId = `layer-${layerStr}`;
  const templatePath = relative(ctx.projectDir, join(layerTemplateDir, 'TASK.md'));

  await ctx.spawn(
    { _type: 'template-ref', path: templatePath, vars: {
      taskId: layerId, layer: layerStr, projectDir: ctx.projectDir,
      artifactsDir, layerTemplateDir, templatesDir,
      question: ctx.inputs?.question ?? '',
      domain: ctx.inputs?.domain ?? 'general',
      minPromisingAreas: ctx.inputs?.minPromisingAreas ?? '3',
      maxLayers: ctx.inputs?.maxLayers ?? '3',
    }},
    { id: layerId },
  );
}