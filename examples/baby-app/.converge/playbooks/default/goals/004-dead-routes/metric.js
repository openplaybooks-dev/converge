// Counts navigation paths that don't match GoRouter route definitions.

import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { execSync } from 'child_process';

function normalizeRoute(route) {
  // Replace :param with * for comparison
  return route.replace(/:\w+/g, '*').replace(/\/$/, '') || '/';
}

export async function run(ctx) {
  const routerPath = join(ctx.projectDir, 'lib/router/app_router.dart');
  if (!existsSync(routerPath)) return 0;

  const routerContent = readFileSync(routerPath, 'utf-8');

  // Extract defined routes from GoRouter config
  const routeMatches = routerContent.match(/path:\s*'([^']+)'/g) || [];
  const definedRoutes = routeMatches.map(m => {
    const match = m.match(/path:\s*'([^']+)'/);
    return match ? normalizeRoute(match[1]) : null;
  }).filter(Boolean);

  // Find navigation paths in screens and widgets
  let navOutput;
  try {
    navOutput = execSync(
      "grep -rnoE \"(context\\.(push|go|goNamed)\\('([^']+)'|context\\.(push|go)\\(.*'([^']+)')\" lib/screens/ lib/widgets/ 2>/dev/null || true",
      { cwd: ctx.projectDir, encoding: 'utf-8' }
    );
  } catch {
    return 0;
  }

  const navPaths = [];
  for (const line of navOutput.trim().split('\n').filter(Boolean)) {
    const pathMatch = line.match(/'(\/[^']*?)'/);
    if (pathMatch) navPaths.push(normalizeRoute(pathMatch[1]));
  }

  const uniqueNavPaths = [...new Set(navPaths)];
  let dead = 0;
  for (const navPath of uniqueNavPaths) {
    if (!definedRoutes.some(r => r === navPath)) dead++;
  }

  return dead;
}
