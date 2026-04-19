// Reports dead navigation routes.

import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { execSync } from 'child_process';

function normalizeRoute(route) {
  return route.replace(/:\w+/g, '*').replace(/\/$/, '') || '/';
}

export async function run(ctx) {
  const routerPath = join(ctx.projectDir, 'lib/router/app_router.dart');
  if (!existsSync(routerPath)) {
    return { detail: 'No app_router.dart found.', data: { issues: [] } };
  }

  const routerContent = readFileSync(routerPath, 'utf-8');
  const routeMatches = routerContent.match(/path:\s*'([^']+)'/g) || [];
  const definedRoutes = routeMatches.map(m => {
    const match = m.match(/path:\s*'([^']+)'/);
    return match ? normalizeRoute(match[1]) : null;
  }).filter(Boolean);

  let navOutput;
  try {
    navOutput = execSync(
      "grep -rnE \"context\\.(push|go)\\(\" lib/screens/ lib/widgets/ 2>/dev/null || true",
      { cwd: ctx.projectDir, encoding: 'utf-8' }
    );
  } catch {
    navOutput = '';
  }

  const issues = [];
  for (const line of navOutput.trim().split('\n').filter(Boolean)) {
    const pathMatch = line.match(/'(\/[^']*?)'/);
    if (pathMatch) {
      const navPath = normalizeRoute(pathMatch[1]);
      if (!definedRoutes.some(r => r === navPath)) {
        issues.push({ path: pathMatch[1], file: line.split(':')[0] });
      }
    }
  }

  const detail = issues.length
    ? `## Dead Routes\n\n${issues.map(i => `- \`${i.path}\` in ${i.file}`).join('\n')}`
    : '## Dead Routes\n\nNone found.';

  return { detail, data: { definedRoutes, issues } };
}
