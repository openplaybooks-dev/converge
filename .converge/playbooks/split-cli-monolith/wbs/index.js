/**
 * WBS: split-cli root
 *
 * Seeds PR items from prs.json into templates/item.
 * Each item runs the analyze → implement → review → quality pipeline.
 *
 * PR ordering matters — every PR depends on the previous landing cleanly.
 * Sequential spawn order (within a single parent) enforces this.
 *
 * Edit prs.json to add/remove/reorder PRs. This file is plumbing only.
 */

import { join, relative, dirname } from 'path';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const PRS = JSON.parse(
  readFileSync(join(__dirname, 'prs.json'), 'utf-8'),
);

export async function run(ctx) {
  const projectDir = ctx.projectDir;
  const itemTemplateDir = join(__dirname, 'templates', 'item');
  const templatePath = relative(projectDir, join(itemTemplateDir, 'TASK.md'));

  for (const pr of PRS) {
    const artifactsDir = join(
      projectDir,
      '.converge',
      'artifacts',
      'split-cli',
      pr.id,
    );

    await ctx.spawn(
      {
        _type: 'template-ref',
        path: templatePath,
        vars: {
          taskId: pr.id,
          title: pr.title,
          tier: pr.tier,
          task: pr.summary,
          spec: pr.spec,
          projectDir,
          artifactsDir,
          // Absolute path to the item template dir — inner wbs.js files
          // use this to locate their sub-templates, since their __dirname
          // points to the *seeded* task dir, not the template source.
          itemTemplateDir,
        },
      },
      { id: pr.id },
    );
  }
}
