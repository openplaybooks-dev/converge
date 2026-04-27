/**
 * WBS: One task per symptom section in
 * skills/converge-control/troubleshooting/playbook.md.
 *
 * Spawns scan-troubleshooting.mjs to materialize the symptom manifest
 * (docs/_troubleshooting.json), then spawns one symptom-page task per
 * entry. Each task instantiates the symptom-page template with
 * substitution vars: number, slug, title, anchor, sourceLine, pagePath.
 */

import { execSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const TEMPLATE_ROOT =
  '.converge/playbooks/docs/tasks/07-troubleshooting/wbs/templates';
const SCANNER = '.converge/playbooks/docs/scripts/scan-troubleshooting.mjs';
const MANIFEST = 'docs/_troubleshooting.json';

export async function run(ctx) {
  const manifestAbs = join(ctx.projectDir, MANIFEST);

  // (Re)build the manifest each WBS run — the source playbook may have
  // gained new symptoms since last time.
  execSync(`node ${SCANNER} ${MANIFEST}`, {
    cwd: ctx.projectDir,
    stdio: 'inherit',
  });

  if (!existsSync(manifestAbs)) {
    throw new Error(
      `Missing ${MANIFEST}; scan-troubleshooting.mjs did not produce output`,
    );
  }

  const symptoms = JSON.parse(readFileSync(manifestAbs, 'utf-8'));
  if (!Array.isArray(symptoms) || symptoms.length === 0) {
    throw new Error(`${MANIFEST} has no symptoms`);
  }

  for (const s of symptoms) {
    const prefix = String(s.number).padStart(3, '0');
    const slug = String(s.slug).replace(/[^a-z0-9-]/gi, '-').toLowerCase();
    const taskId = `${prefix}-${slug}`;
    const vars = {
      prefix,
      slug,
      title: s.title,
      number: String(s.number),
      anchor: s.anchor,
      sourceLine: String(s.sourceLine),
      pagePath: `docs/troubleshooting/${slug}.md`,
    };

    const templatePath = `${TEMPLATE_ROOT}/symptom-page/tasks/{{slug}}/TASK.md`;
    await ctx.spawn(
      { _type: 'template-ref', path: templatePath, vars },
      { id: taskId },
    );
  }
}
