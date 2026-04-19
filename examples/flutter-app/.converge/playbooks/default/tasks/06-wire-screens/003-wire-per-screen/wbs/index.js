// WBS: Two-level — screen parents → per-element children
import { readFileSync } from 'fs';
import { join } from 'path';

const CHECK_SCRIPT = '.converge/playbooks/default/tasks/06-wire-screens/003-wire-per-screen/wbs/check-handler.mjs';

export async function run(ctx) {
  const navPath = join(ctx.projectDir, 'navigations.json');

  let manifest;
  try {
    manifest = JSON.parse(readFileSync(navPath, 'utf-8'));
  } catch {
    ctx.log.error('navigations.json not found — run 002-analyze-navigations first');
    return;
  }

  const bottomNavRoutes = manifest.bottomNavRoutes || [];
  const routeListStr = JSON.stringify(bottomNavRoutes);

  // Filter to screens with at least one non-wired element
  const screensToFix = manifest.screens.filter(
    (s) => s.elements.some((e) => e.status !== 'wired')
  );

  if (screensToFix.length === 0) {
    ctx.log.info('All elements already wired — nothing to spawn');
    return;
  }

  let prevScreenId = null;

  for (let si = 0; si < screensToFix.length; si++) {
    const screen = screensToFix[si];
    const screenIdx = String(si + 1).padStart(3, '0');
    const screenTaskId = `${screenIdx}-${screen.id}`;

    const broken = screen.elements.filter((e) => e.status !== 'wired');

    // Level 1: screen parent
    await ctx.spawn({
      id: screenTaskId,
      title: `Wire: ${screen.id}`,
      dependencies: prevScreenId ? [prevScreenId] : [],
      tags: ['screen', screen.id],
    });

    prevScreenId = screenTaskId;

    // Level 2: one child per broken element
    for (let ei = 0; ei < broken.length; ei++) {
      const el = broken[ei];
      const elIdx = String(ei + 1).padStart(3, '0');
      const safeId = el.elementId.replace(/[^a-zA-Z0-9_-]/g, '-');
      const elTaskId = `${elIdx}-${safeId}`;

      await ctx.spawn({
        id: elTaskId,
        title: `Wire ${el.widget}.${el.type}`,
        body: buildBody(el, screen, bottomNavRoutes, routeListStr),
        checks: [
          {
            id: 'handler-wired',
            cmd: `node ${CHECK_SCRIPT} ${el.file} ${el.line} ${el.type}`,
            description: `${el.widget}.${el.type} has real logic at ${el.file}:${el.line}`,
          },
        ],
      });
    }
  }

  ctx.log.info(
    `Spawned ${screensToFix.length} screen tasks with ${screensToFix.reduce((s, sc) => s + sc.elements.filter((e) => e.status !== 'wired').length, 0)} element tasks`
  );
}

/**
 * Build the task body for a single element.
 */
function buildBody(el, screen, bottomNavRoutes, routeListStr) {
  const lines = [];

  lines.push(`Wire the **${el.widget}** \`${el.type}\` handler in \`${el.file}:${el.line}\`.`);
  lines.push('');
  lines.push(`**Current status:** ${el.status}`);
  lines.push(`**Required action:** ${el.action}`);
  if (el.target) {
    lines.push(`**Target:** ${el.target}`);
  }
  lines.push('');

  if (el.type === 'onDestinationSelected') {
    lines.push('## Implementation');
    lines.push('');
    lines.push('```dart');
    lines.push(`onDestinationSelected: (index) => context.go(`);
    lines.push(`  const ${routeListStr}[index],`);
    lines.push(`),`);
    lines.push('```');
    lines.push('');
    lines.push('Import `go_router` if not already imported:');
    lines.push('```dart');
    lines.push("import 'package:go_router/go_router.dart';");
    lines.push('```');
  } else if (el.type === 'onTap' && el.target) {
    lines.push('## Implementation');
    lines.push('');
    lines.push('```dart');
    lines.push(`onTap: () => context.push('${el.target}'),`);
    lines.push('```');
  } else if (el.type === 'onPressed' && el.target) {
    lines.push('## Implementation');
    lines.push('');
    lines.push('```dart');
    lines.push(`onPressed: () => context.push('${el.target}'),`);
    lines.push('```');
  } else if (el.type === 'onPressed' && !el.target) {
    lines.push('## Implementation');
    lines.push('');
    lines.push('Wire to the appropriate action based on context:');
    lines.push('- Navigation: `context.push(\'/route\')`');
    lines.push('- Provider mutation: `ref.read(provider.notifier).method()`');
    lines.push('- Bottom sheet: `showModalBottomSheet(context: context, builder: (_) => const Placeholder())`');
    lines.push('- Dialog: `showDialog(context: context, builder: (_) => const AlertDialog(...))`');
  }

  lines.push('');
  lines.push('## Rules');
  lines.push('');
  lines.push('- Only modify the single handler — do NOT change layout or add widgets');
  lines.push('- Match existing code style in the file');
  lines.push('- The handler must not be empty after your change');
  lines.push('- The handler body must contain real logic — not just a comment');

  return lines.join('\n');
}
