/**
 * Seed: 03-implementation
 *
 * Reads catalog.json and spawns one child per entry. Each child
 * receives `id` and `vars` (the catalog item's fields, available
 * for interpolation in the spawned TASK.md template).
 *
 * TODO: populate catalog.json. The planner couldn't extract a
 *       fan-out list from PLAN.md. List one object per child:
 *       [{ "id": "home", "title": "Home" }, ...]
 */
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

export default async function run(ctx) {
  const here = dirname(fileURLToPath(import.meta.url))
  const catalog = JSON.parse(readFileSync(join(here, 'catalog.json'), 'utf-8'))
  for (const item of catalog) {
    await ctx.spawn({
      id: item.id,
      title: item.title ?? item.id,
      vars: item,
    })
  }
}
