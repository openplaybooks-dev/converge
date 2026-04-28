// ESM wbs driver for 05-command-views.
// Reads the CLI command manifest produced by 00-cli-inventory and
// spawns one child per command. Idempotent: same manifest -> same
// child set with the same ids.

export default async function wbs(ctx) {
  const manifestPath = '00-cli-inventory/cli-commands.json';

  let raw;
  try {
    raw = await ctx.read(manifestPath);
  } catch (err) {
    ctx.log?.(
      `[05-command-views] driver not found at ${manifestPath} ` +
        `(upstream 00-cli-inventory may not have run yet); spawning 0 children.`,
    );
    return;
  }

  let manifest;
  try {
    manifest = JSON.parse(raw);
  } catch (err) {
    throw new Error(
      `[05-command-views] ${manifestPath} is not valid JSON: ${err.message}`,
    );
  }

  const commands = Array.isArray(manifest?.commands) ? manifest.commands : [];
  if (commands.length === 0) {
    ctx.log?.('[05-command-views] manifest has zero commands; spawning 0 children.');
    return;
  }

  const seen = new Set();
  for (const cmd of commands) {
    if (!cmd || typeof cmd.name !== 'string' || cmd.name.length === 0) continue;

    let id = slugify(cmd.name);
    if (!id) continue;

    // Disambiguate in the unlikely event two command names slugify
    // to the same id. Keeps determinism: order is fixed by manifest.
    let unique = id;
    let n = 2;
    while (seen.has(unique)) {
      unique = `${id}-${n++}`;
    }
    seen.add(unique);

    await ctx.spawn({
      id: unique,
      title: cmd.name,
      template: 'command-view',
      vars: {
        commandName: cmd.name,
        args: JSON.stringify(cmd.args ?? []),
        options: JSON.stringify(cmd.options ?? []),
        description: cmd.description ?? '',
        examples: JSON.stringify(cmd.examples ?? []),
      },
    });
  }
}

function slugify(s) {
  return String(s)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 64);
}
