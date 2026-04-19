// WBS: Spawn one provider task per entity in data-models.md
import { readFileSync } from 'fs';
import { join } from 'path';

export async function run(ctx) {
  const modelsPath = join(ctx.projectDir, 'data-models.md');

  let content;
  try {
    content = readFileSync(modelsPath, 'utf-8');
  } catch {
    ctx.log.warn('data-models.md not found, spawning single provider task');
    await ctx.spawn({
      id: '001-create-providers',
      title: 'Create Riverpod Providers',
      body: `Create Riverpod providers for the app's data models in lib/providers/.

Read data-models.md for the list of entities.
Each provider should use @riverpod annotations, import from models and mock data.

References: flutter-riverpod-patterns

Verify with: \`dart analyze lib/providers/\``,
      checks: [
        {
          id: 'providers-exist',
          cmd: 'find lib/providers -name "*.dart" -type f | wc -l | awk \'{if ($1 > 0) exit 0; exit 1}\'',
          description: 'Provider files exist',
        },
      ],
    });
    return;
  }

  // Parse entity names from "## Entity: <Name>" headers
  const entityRegex = /^## Entity:\s+(\w+)/gm;
  const entities = [];
  let match;
  while ((match = entityRegex.exec(content)) !== null) {
    entities.push(match[1]);
  }

  if (entities.length === 0) {
    ctx.log.warn('No entities found in data-models.md, spawning single provider task');
    await ctx.spawn({
      id: '001-create-providers',
      title: 'Create Riverpod Providers',
      body: `Create Riverpod providers for the app's data models in lib/providers/.

Read data-models.md for the list of entities.
Each provider should use @riverpod annotations, import from models and mock data.

References: flutter-riverpod-patterns

Verify with: \`dart analyze lib/providers/\``,
      checks: [
        {
          id: 'providers-exist',
          cmd: 'find lib/providers -name "*.dart" -type f | wc -l | awk \'{if ($1 > 0) exit 0; exit 1}\'',
          description: 'Provider files exist',
        },
      ],
    });
    return;
  }

  const snakeName = (name) => name.replace(/([a-z])([A-Z])/g, '$1_$2').toLowerCase();

  for (let i = 0; i < entities.length; i++) {
    const entity = entities[i];
    const idx = String(i + 1).padStart(3, '0');
    const id = `${idx}-provider-${entity}`;
    const fileName = `${snakeName(entity)}_provider.dart`;
    const filePath = `lib/providers/${fileName}`;

    await ctx.spawn({
      id,
      title: `Create ${entity} Provider`,
      body: `Create a Riverpod provider for the **${entity}** entity in \`${filePath}\`.

Read \`data-models.md\` for the entity definition and relationships.

References: flutter-riverpod-patterns

**Instructions:**
1. Import the ${entity} model from \`package:folio/models/models.dart\`
2. Import mock data from \`package:folio/data/mock_data.dart\`
3. Use \`@riverpod\` annotation
4. Initialize with mock data
5. Export from a barrel file at \`lib/providers/providers.dart\`

Verify with: \`dart analyze ${filePath}\``,
      checks: [
        {
          id: 'file-exists',
          cmd: `test -f ${filePath}`,
          description: `${fileName} exists`,
        },
        {
          id: 'dart-valid',
          cmd: `dart analyze ${filePath}`,
          description: 'Dart analysis passes',
        },
      ],
    });
  }

  ctx.log.info(`Spawned ${entities.length} provider tasks`);
}
