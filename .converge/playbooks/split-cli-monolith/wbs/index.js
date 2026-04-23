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

// Path vars are substituted into YAML frontmatter of seeded TASK.md files.
// On Windows, backslash + letter (e.g. "D:\converge") is an invalid YAML escape
// sequence when it lands inside a double-quoted string. Forward slashes are
// valid on Windows for Node fs APIs and sidestep the YAML escape problem.
const toPosix = (p) => p.split('\\').join('/');

export async function run(ctx) {
  const projectDir = toPosix(ctx.projectDir);
  const itemTemplateDir = toPosix(join(ctx.projectDir, '.converge', 'playbooks', 'split-cli-monolith', 'wbs', 'templates', 'item'));
  const templatePath = relative(ctx.projectDir, join(__dirname, 'templates', 'item', 'TASK.md'));

  for (const pr of PRS) {
    const artifactsDir = toPosix(
      join(ctx.projectDir, '.converge', 'artifacts', 'split-cli', pr.id),
    );

    // wbsSection is injected via var (not baked into the template). This keeps
    // the raw template text free of the literal string "wbs:", which suppresses
    // converge's sibling-wbs.js copy behavior. Every seeded TASK.md points back
    // at the ONE shared wbs.js via absolute path — no duplicate files.
    const wbsSection = `wbs:\n  type: nodejs\n  path: "${itemTemplateDir}/wbs.js"`;

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
          // Absolute POSIX path to the item template dir — inner wbs.js files
          // use this to locate their sub-templates, since their __dirname
          // points to the *seeded* task dir, not the template source.
          itemTemplateDir,
          wbsSection,
        },
      },
      { id: pr.id },
    );
  }
}
