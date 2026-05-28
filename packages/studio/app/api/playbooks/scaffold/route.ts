import { NextResponse } from 'next/server';
import { existsSync, mkdirSync, readFileSync, writeFileSync, readdirSync, statSync, copyFileSync } from 'node:fs';
import { basename, join, relative } from 'node:path';

export const dynamic = 'force-dynamic';

function copyDirFiltered(src: string, dest: string) {
  const skip = new Set(['journal', 'inventory', 'logs', 'cache', 'node_modules', '.next']);
  if (!existsSync(dest)) mkdirSync(dest, { recursive: true });
  for (const entry of readdirSync(src, { withFileTypes: true })) {
    if (skip.has(entry.name)) continue;
    const srcPath = join(src, entry.name);
    const destPath = join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDirFiltered(srcPath, destPath);
    } else {
      copyFileSync(srcPath, destPath);
    }
  }
}

export async function POST(request: Request) {
  const body = await request.json();
  const { example, targetDir, overwrite } = body as { example: string; targetDir: string; overwrite?: boolean };

  if (!example || !targetDir) {
    return NextResponse.json({ error: 'example and targetDir required' }, { status: 400 });
  }

  try {
    const convergeRoot = join(__dirname, '..', '..', '..', '..', '..', '..');
    let exampleDir = '';
    const searchPaths = [
      join(targetDir, '..', '..', 'examples', example),
      join(process.cwd(), '..', '..', 'examples', example),
    ];

    // Walk up from studio package to find the converge root examples
    let dir = __dirname;
    for (let i = 0; i < 10; i++) {
      const candidate = join(dir, 'examples', example);
      if (existsSync(candidate)) {
        exampleDir = candidate;
        break;
      }
      const parent = join(dir, '..');
      if (parent === dir) break;
      dir = parent;
    }

    if (!exampleDir) {
      // Try known path
      const knownPath = join('D:\\converge\\examples', example);
      if (existsSync(knownPath)) exampleDir = knownPath;
    }

    if (!exampleDir) {
      return NextResponse.json({ error: `Example "${example}" not found` }, { status: 404 });
    }

    // Create target directory
    if (!existsSync(targetDir)) {
      mkdirSync(targetDir, { recursive: true });
    }

    // If the target already has a .converge/ (existing workspace), only
    // copy the playbooks directory — don't overwrite project.yaml, skills,
    // or other workspace-level config. Otherwise, copy the whole .converge/
    // so the target becomes a self-contained workspace.
    const destConverge = join(targetDir, '.converge');
    const srcConverge = join(exampleDir, '.converge');
    const targetIsExistingWorkspace = existsSync(destConverge);

    // Helper: list playbook names in a `.converge/playbooks/` directory
    const listPlaybooksIn = (convergeDir: string): string[] => {
      const dir = join(convergeDir, 'playbooks');
      if (!existsSync(dir)) return [];
      const out: string[] = [];
      try {
        for (const entry of readdirSync(dir, { withFileTypes: true })) {
          if (entry.isDirectory() && existsSync(join(dir, entry.name, 'playbook.yml'))) {
            out.push(entry.name);
          }
        }
      } catch { /* skip */ }
      return out;
    };

    // What's in the source example?
    const examplePlaybooks = listPlaybooksIn(srcConverge);
    // What's in the target BEFORE copy?
    const beforePlaybooks = new Set(listPlaybooksIn(destConverge));

    // Detect name conflicts BEFORE copying — refuse unless `overwrite: true`.
    const conflicts = examplePlaybooks.filter(name => beforePlaybooks.has(name));
    if (conflicts.length > 0 && !overwrite) {
      return NextResponse.json(
        {
          error: `Playbook(s) already exist in this workspace: ${conflicts.join(', ')}. Pass overwrite=true to replace.`,
          conflicts,
        },
        { status: 409 },
      );
    }

    if (existsSync(srcConverge)) {
      if (targetIsExistingWorkspace) {
        // Merge only the playbooks/ subdirectory
        const srcPlaybooks = join(srcConverge, 'playbooks');
        if (existsSync(srcPlaybooks)) {
          copyDirFiltered(srcPlaybooks, join(destConverge, 'playbooks'));
        }
        // Optionally merge skills/ if it exists in the example
        const srcSkills = join(srcConverge, 'skills');
        if (existsSync(srcSkills)) {
          copyDirFiltered(srcSkills, join(destConverge, 'skills'));
        }
      } else {
        copyDirFiltered(srcConverge, destConverge);
      }
    }

    // Copy scripts if they exist (only for fresh workspaces — don't clobber)
    if (!targetIsExistingWorkspace) {
      const srcScripts = join(exampleDir, 'scripts');
      if (existsSync(srcScripts)) {
        copyDirFiltered(srcScripts, join(targetDir, 'scripts'));
      }
    }

    // What's in the target AFTER copy? Everything from the example is what
    // we added (or overwrote) — restrict to playbooks the example actually
    // contained, so the client navigates to the right one.
    const afterPlaybooks = listPlaybooksIn(destConverge);
    // The "added" set is the example's playbooks (intersected with what
    // actually landed in the target — protects against partial copies).
    const addedPlaybooks = examplePlaybooks.filter(name => afterPlaybooks.includes(name));
    // Newly-introduced ones (not already in the workspace before) — useful
    // for distinguishing "added" vs "overwrote".
    const newPlaybooks = addedPlaybooks.filter(name => !beforePlaybooks.has(name));

    // Inspect project.yaml for workspace metadata
    let wsName = basename(targetDir);
    let wsDescription = '';
    const projectYaml = join(targetDir, '.converge', 'project.yaml');
    const projectYml = join(targetDir, '.converge', 'project.yml');
    const projectFile = existsSync(projectYaml) ? projectYaml : (existsSync(projectYml) ? projectYml : '');
    if (projectFile) {
      try {
        const raw = readFileSync(projectFile, 'utf-8');
        const nameMatch = raw.match(/^name:\s*(.+)$/m);
        const descMatch = raw.match(/^description:\s*(.+)$/m);
        if (nameMatch) wsName = nameMatch[1].trim().replace(/^["']|["']$/g, '');
        if (descMatch) wsDescription = descMatch[1].trim().replace(/^["']|["']$/g, '');
      } catch { /* skip */ }
    }

    return NextResponse.json({
      ok: true,
      targetDir,
      // The playbook(s) the example contributed to the target — the client
      // should navigate to the first of these, NOT to whatever was already
      // in the workspace. `newPlaybooks` is the subset that didn't previously
      // exist; `addedPlaybooks` is what the example provided (may overlap).
      playbooks: addedPlaybooks,
      newPlaybooks,
      example,
      workspace: {
        name: wsName,
        path: targetDir,
        description: wsDescription,
        playbookCount: afterPlaybooks.length,
      },
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
