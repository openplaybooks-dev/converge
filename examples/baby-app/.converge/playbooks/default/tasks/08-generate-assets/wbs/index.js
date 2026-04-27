/**
 * WBS: Asset Generation Pipeline (3-level deep)
 *
 * Level 1: Asset category parent (e.g., "baby-size-illustrations")
 * Level 2: Individual asset tasks (e.g., "week-01", "week-02")
 * Level 3: Pipeline steps per asset (analyze, spec, meta, generate, wire)
 *
 * Categories run sequentially. Within a category, assets can be batched.
 *
 * Uses 2 template sets:
 *   - templates/illustration  (baby-size + empty-state — 200x200 SVGs)
 *   - templates/icon          (feature icons — 24x24 outlined SVGs, no meta step)
 */

import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

/** Convert kebab-case id to PascalCase widget name */
function toPascalCase(str) {
  return str.replace(/(^|-)(\w)/g, (_, _sep, c) => c.toUpperCase());
}

const WBS_ROOT = '.converge/playbooks/default/tasks/08-generate-assets/wbs/templates';

/**
 * Generate asset tasks for baby size illustrations (40 weeks)
 */
async function spawnBabySizeAssets(ctx, startIdx, vars) {
  const templateBase = `${WBS_ROOT}/illustration`;
  const weeks = [
    { week: 1, comparison: 'poppy seed', emoji: '🌱', trimester: 1 },
    { week: 2, comparison: 'poppy seed', emoji: '🌱', trimester: 1 },
    { week: 3, comparison: 'poppy seed', emoji: '🌱', trimester: 1 },
    { week: 4, comparison: 'poppy seed', emoji: '🌱', trimester: 1 },
    { week: 5, comparison: 'apple seed', emoji: '🍎', trimester: 1 },
    { week: 6, comparison: 'sweet pea', emoji: '🫛', trimester: 1 },
    { week: 7, comparison: 'blueberry', emoji: '🫐', trimester: 1 },
    { week: 8, comparison: 'raspberry', emoji: '🍇', trimester: 1 },
    { week: 9, comparison: 'green olive', emoji: '🫒', trimester: 1 },
    { week: 10, comparison: 'prune', emoji: '🫐', trimester: 1 },
    { week: 11, comparison: 'lime', emoji: '🍋', trimester: 1 },
    { week: 12, comparison: 'plum', emoji: '🍑', trimester: 1 },
    { week: 13, comparison: 'peach', emoji: '🍑', trimester: 2 },
    { week: 14, comparison: 'lemon', emoji: '🍋', trimester: 2 },
    { week: 15, comparison: 'apple', emoji: '🍎', trimester: 2 },
    { week: 16, comparison: 'avocado', emoji: '🥑', trimester: 2 },
    { week: 17, comparison: 'turnip', emoji: '🥔', trimester: 2 },
    { week: 18, comparison: 'bell pepper', emoji: '🫑', trimester: 2 },
    { week: 19, comparison: 'tomato', emoji: '🍅', trimester: 2 },
    { week: 20, comparison: 'banana', emoji: '🍌', trimester: 2 },
    { week: 21, comparison: 'carrot', emoji: '🥕', trimester: 2 },
    { week: 22, comparison: 'papaya', emoji: '🥭', trimester: 2 },
    { week: 23, comparison: 'grapefruit', emoji: '🍊', trimester: 2 },
    { week: 24, comparison: 'corn', emoji: '🌽', trimester: 2 },
    { week: 25, comparison: 'rutabaga', emoji: '🥔', trimester: 2 },
    { week: 26, comparison: 'scallion', emoji: '🥬', trimester: 2 },
    { week: 27, comparison: 'cauliflower', emoji: '🥦', trimester: 3 },
    { week: 28, comparison: 'eggplant', emoji: '🍆', trimester: 3 },
    { week: 29, comparison: 'butternut squash', emoji: '🎃', trimester: 3 },
    { week: 30, comparison: 'cabbage', emoji: '🥬', trimester: 3 },
    { week: 31, comparison: 'coconut', emoji: '🥥', trimester: 3 },
    { week: 32, comparison: 'jicama', emoji: '🥔', trimester: 3 },
    { week: 33, comparison: 'pineapple', emoji: '🍍', trimester: 3 },
    { week: 34, comparison: 'cantaloupe', emoji: '🍈', trimester: 3 },
    { week: 35, comparison: 'honeydew', emoji: '🍈', trimester: 3 },
    { week: 36, comparison: 'romaine lettuce', emoji: '🥬', trimester: 3 },
    { week: 37, comparison: 'swiss chard', emoji: '🥬', trimester: 3 },
    { week: 38, comparison: 'leek', emoji: '🥬', trimester: 3 },
    { week: 39, comparison: 'watermelon', emoji: '🍉', trimester: 3 },
    { week: 40, comparison: 'small pumpkin', emoji: '🎃', trimester: 3 },
  ];

  let prevAssetLastId = null;

  for (let i = 0; i < weeks.length; i++) {
    const { week, comparison, emoji, trimester } = weeks[i];
    const prefix = String(startIdx + i).padStart(3, '0');
    const assetId = `week-${String(week).padStart(2, '0')}`;
    const fileName = `${assetId}.svg`;
    const assetTaskId = `${prefix}-${assetId}`;
    const outputPath = `assets/illustrations/baby-sizes/${fileName}`;

    const assetVars = {
      ...vars,
      prefix,
      assetId,
      fileName,
      weekNumber: week,
      comparison,
      emoji,
      trimester,
      assetType: 'baby-size',
      outputPath,
      assetTaskId,
      assetLabel: `Week ${week}`,
      assetWidgetName: toPascalCase(assetId),
      assetDescription: `Week ${week} baby size illustration showing a ${comparison}.`,
      contextBlock: [
        `**Baby Size Illustration — Week ${week}**`,
        `- Size comparison: "${comparison}" ${emoji}`,
        `- Trimester: ${trimester}`,
        '- Used in: HeroIllustrationCard on HomeScreen',
        '- Data source: WeekContent.sizeComparison field',
      ].join('\n'),
      specOverview: `Baby size comparison illustration showing a ${comparison} alongside a gestational sac/fetus at week ${week}.`,
      metaTitle: `Week ${week} Baby Size`,
      metaTags: `["baby-size", "pregnancy", "week-${week}", "${comparison}"]`,
      generateGuidelines: [
        '### Baby Size Illustration Specifics',
        '',
        'Create an SVG showing:',
        `1. A cute, stylized ${comparison} (the fruit/vegetable)`,
        '2. A subtle gestational sac or baby silhouette',
        '3. Soft, friendly illustration style',
        '4. Coral (#FF6B6B) and lilac (#9B59B6) accent colors',
        '5. Clean vector lines suitable for scaling',
        '',
        'Design system:',
        '- Use rounded, organic shapes',
        '- Subtle gradient fills (if any) should be simple 2-color',
        '- Background: transparent',
        '- Style: Modern flat illustration with soft shadows',
      ].join('\n'),
      wireInstructions: [
        '## Update HeroIllustrationCard',
        '',
        `Replace the CustomPainter placeholder in \`lib/screens/home/_widgets/hero_illustration_card.dart\`:`,
        '',
        '```dart',
        '// OLD:',
        'CustomPaint(',
        '  painter: _HeroIllustrationPainter(sizeComparison: sizeComparison),',
        ')',
        '',
        '// NEW:',
        `${toPascalCase(assetId)}Asset(`,
        '  width: 140,',
        '  height: 140,',
        ')',
        '```',
        '',
        'Note: The card should look up the appropriate asset based on `weekNumber`.',
      ].join('\n'),
    };

    // Level 1: Asset parent task
    await ctx.spawn({
      id: assetTaskId,
      title: `Baby Size Week ${week}: ${comparison}`,
      dependencies: prevAssetLastId ? [prevAssetLastId] : [],
      tags: ['asset', 'baby-size', `week-${week}`, `trimester-${trimester}`],
      vars: assetVars,
      body: `Generate baby size illustration for week ${week} — baby is the size of a ${comparison}.`,
    });

    // Level 2: Pipeline steps from illustration templates
    const basePath = `.converge/playbooks/default/tasks/08-generate-assets/tasks/${assetTaskId}`;
    const steps = ['01-analyze', '02-spec', '03-meta', '04-generate', '05-wire'];

    for (const step of steps) {
      const id = `${prefix}-${step}`;
      const templatePath = `${templateBase}/tasks/${step}/TASK.md`;

      await ctx.spawn(
        { _type: 'template-ref', path: templatePath, vars: assetVars },
        { id }
      );
    }

    prevAssetLastId = `${prefix}-05-wire`;
  }

  return weeks.length;
}

/**
 * Generate asset tasks for feature icons
 */
async function spawnFeatureIcons(ctx, startIdx, vars) {
  const templateBase = `${WBS_ROOT}/icon`;
  const icons = [
    { id: 'nav-home', name: 'Home', category: 'navigation' },
    { id: 'nav-progress', name: 'Progress', category: 'navigation' },
    { id: 'nav-health', name: 'Health', category: 'navigation' },
    { id: 'nav-wellness', name: 'Wellness', category: 'navigation' },
    { id: 'nav-learn', name: 'Learn', category: 'navigation' },
    { id: 'action-add', name: 'Add', category: 'action' },
    { id: 'action-edit', name: 'Edit', category: 'action' },
    { id: 'action-delete', name: 'Delete', category: 'action' },
    { id: 'action-share', name: 'Share', category: 'action' },
    { id: 'action-bookmark', name: 'Bookmark', category: 'action' },
    { id: 'status-mood', name: 'Mood', category: 'status' },
    { id: 'status-weight', name: 'Weight', category: 'status' },
    { id: 'status-cycle', name: 'Cycle', category: 'status' },
    { id: 'status-symptom', name: 'Symptom', category: 'status' },
    { id: 'status-reminder', name: 'Reminder', category: 'status' },
  ];

  let prevAssetLastId = null;

  for (let i = 0; i < icons.length; i++) {
    const { id: iconId, name, category } = icons[i];
    const prefix = String(startIdx + i).padStart(3, '0');
    const fileName = `${iconId}.svg`;
    const assetTaskId = `${prefix}-icon-${iconId}`;
    const outputPath = `assets/icons/${fileName}`;

    const assetVars = {
      ...vars,
      prefix,
      assetId: iconId,
      fileName,
      iconName: name,
      category,
      assetType: 'icon',
      outputPath,
      assetTaskId,
      assetWidgetName: toPascalCase(iconId),
    };

    // Level 1: Icon parent task
    await ctx.spawn({
      id: assetTaskId,
      title: `Icon: ${name} (${category})`,
      dependencies: prevAssetLastId ? [prevAssetLastId] : [],
      tags: ['asset', 'icon', category],
      vars: assetVars,
      body: `Generate ${category} icon for "${name}" — 24x24px, outlined style, single stroke.`,
    });

    // Level 2: Pipeline steps from icon templates (no 03-meta step)
    const basePath = `.converge/playbooks/default/tasks/08-generate-assets/tasks/${assetTaskId}`;
    const steps = ['01-analyze', '02-spec', '04-generate', '05-wire'];

    for (const step of steps) {
      const id = `${prefix}-${step}`;
      const templatePath = `${templateBase}/tasks/${step}/TASK.md`;

      await ctx.spawn(
        { _type: 'template-ref', path: templatePath, vars: assetVars },
        { id }
      );
    }

    prevAssetLastId = `${prefix}-05-wire`;
  }

  return icons.length;
}

/**
 * Generate asset tasks for empty state illustrations
 */
async function spawnEmptyStates(ctx, startIdx, vars) {
  const templateBase = `${WBS_ROOT}/illustration`;
  const states = [
    { id: 'empty-data', name: 'No Data', context: 'lists with no items' },
    { id: 'empty-search', name: 'No Search Results', context: 'search with no matches' },
    { id: 'error-generic', name: 'Generic Error', context: 'something went wrong' },
    { id: 'success-celebration', name: 'Success', context: 'achievement unlocked' },
    { id: 'offline', name: 'Offline', context: 'no internet connection' },
  ];

  let prevAssetLastId = null;

  for (let i = 0; i < states.length; i++) {
    const { id: stateId, name, context } = states[i];
    const prefix = String(startIdx + i).padStart(3, '0');
    const fileName = `${stateId}.svg`;
    const assetTaskId = `${prefix}-empty-${stateId}`;
    const outputPath = `assets/illustrations/empty-states/${fileName}`;

    const assetVars = {
      ...vars,
      prefix,
      assetId: stateId,
      fileName,
      stateName: name,
      context,
      assetType: 'empty-state',
      outputPath,
      assetTaskId,
      assetLabel: name,
      assetWidgetName: toPascalCase(stateId),
      assetDescription: `${name} empty state illustration.`,
      contextBlock: [
        `**Empty State — ${name}**`,
        `- Context: ${context}`,
        `- Usage: Displayed when ${context}`,
        '- Style: Friendly, soft colors, encouraging',
      ].join('\n'),
      specOverview: `Empty state illustration for "${name}" — shown when ${context}.`,
      metaTitle: `${name} Illustration`,
      metaTags: `["empty-state", "feedback", "${stateId}"]`,
      generateGuidelines: [
        '### Empty State Illustration Specifics',
        '',
        `Create a friendly illustration for "${name}":`,
        '1. Soft, encouraging mood',
        '2. Character or scene that explains the state',
        '3. Coral/lilac color palette',
        '4. Generous whitespace',
        '5. Suitable for 200x200 display',
      ].join('\n'),
      wireInstructions: '',
    };

    await ctx.spawn({
      id: assetTaskId,
      title: `Empty State: ${name}`,
      dependencies: prevAssetLastId ? [prevAssetLastId] : [],
      tags: ['asset', 'empty-state'],
      vars: assetVars,
      body: `Generate empty state illustration for "${name}" — ${context}.`,
    });

    const basePath = `.converge/playbooks/default/tasks/08-generate-assets/tasks/${assetTaskId}`;
    const steps = ['01-analyze', '02-spec', '03-meta', '04-generate', '05-wire'];

    for (const step of steps) {
      const id = `${prefix}-${step}`;
      const templatePath = `${templateBase}/tasks/${step}/TASK.md`;

      await ctx.spawn(
        { _type: 'template-ref', path: templatePath, vars: assetVars },
        { id }
      );
    }

    prevAssetLastId = `${prefix}-05-wire`;
  }

  return states.length;
}

/**
 * Main WBS runner
 */
export async function run(ctx) {
  const { projectDir } = ctx;

  const vars = {
    projectDir,
  };

  let currentIdx = 1;

  // Category 1: Baby Size Illustrations (40 weeks)
  console.log('  📦 Spawning baby size illustrations (40 weeks)...');
  const babySizeCount = await spawnBabySizeAssets(ctx, currentIdx, vars);
  currentIdx += babySizeCount;

  // Category 2: Feature Icons
  console.log('  📦 Spawning feature icons (15 icons)...');
  const iconCount = await spawnFeatureIcons(ctx, currentIdx, vars);
  currentIdx += iconCount;

  // Category 3: Empty State Illustrations
  console.log('  📦 Spawning empty state illustrations (5 states)...');
  const emptyStateCount = await spawnEmptyStates(ctx, currentIdx, vars);
  currentIdx += emptyStateCount;

  console.log(`  ✅ Total assets to generate: ${currentIdx - 1}`);
}
