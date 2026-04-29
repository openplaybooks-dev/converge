export interface CycleCheckTask {
  id: string;
  dependencies: string[];
}

/**
 * Would adding the directed edge `source → target` (i.e. making `target`
 * depend on `source`) create a cycle, given the current set of tasks?
 *
 * `tag:` dependencies are ignored — they are not direct task→task edges.
 */
export function wouldCreateCycle(
  tasks: CycleCheckTask[],
  source: string,
  target: string,
): boolean {
  if (source === target) return true;

  const adj = new Map<string, string[]>();
  for (const t of tasks) {
    for (const dep of t.dependencies) {
      if (!dep || dep.startsWith("tag:")) continue;
      const list = adj.get(dep);
      if (list) list.push(t.id);
      else adj.set(dep, [t.id]);
    }
  }

  // Adding source → target creates a cycle iff target can already reach source.
  const seen = new Set<string>();
  const stack: string[] = [target];
  while (stack.length > 0) {
    const cur = stack.pop()!;
    if (cur === source) return true;
    if (seen.has(cur)) continue;
    seen.add(cur);
    const next = adj.get(cur);
    if (next) stack.push(...next);
  }
  return false;
}
