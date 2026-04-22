/**
 * Repair Loop Action
 * 
 * Unified repair action using GapRepairPredicate.decide() to determine the next strategy.
 */

import type { ActionHandler } from "../../types.ts";
import { groupGaps, pickRepresentative } from "../helpers/gap-helpers.ts";

export const repairLoop: ActionHandler = async (snap, graph) => {
  const { prepareFeedback, resetFeedbackDedupe } = await import(
    "../../../repair/feedback-writer.ts"
  );
  const { GapRepairPredicate } = await import("../../../repair/predicate.ts");
  const { UnifiedStrategyRegistry, getBuiltinDescriptors } =
    await import("../../../repair/strategy-catalog.ts");
  const { buildTsStrategies } = await import("../helpers/strategy-helpers.ts");
  const { join, dirname } = await import("node:path");

  const jCtx = { epicId: snap.epicId, taskId: snap.unit.id };

  // Write FEEDBACK.md for gaps that need it. The writer dedupes internally
  // per attempt dir + gap kind, so many gaps of the same kind collapse to
  // one write. Reset the dedupe cache at the start of each repair pass so
  // stale entries don't leak across attempts.
  resetFeedbackDedupe();
  for (const gap of snap.gaps) {
    await prepareFeedback(gap, snap.projectDir);
  }

  // Build unified strategy registry
  const reg = new UnifiedStrategyRegistry();
  const strategies = await buildTsStrategies();

  for (const { descriptor, strategyClass } of getBuiltinDescriptors()) {
    const strategy = strategies.find(
      (s) => s.constructor.name === strategyClass || s.name === descriptor.name,
    );
    if (strategy) reg.registerBuiltin(strategy, descriptor);
  }

  const repairDir = join(snap.projectDir, ".converge", "skills", "repair");
  const count = await reg.scanAndRegisterSkills(repairDir);
  if (count > 0) console.log(`   📦 ${count} repair skill(s) loaded`);

  const { fileURLToPath } = await import("node:url");
  const builtinDir = join(
    dirname(fileURLToPath(import.meta.url)),
    "..",
    "..",
    "skill-templates",
  );
  await reg.scanAndRegisterSkills(builtinDir);

  // Group gaps and process each group
  const groups = groupGaps(snap.gaps);

  for (const [, group] of groups) {
    const gap = pickRepresentative(group);
    const gapKind = (gap.metadata?.gapKind as string) ?? gap.type;
    const allDescriptors = reg.getEligible(gapKind);
    const tsEligible = strategies.filter((s) => s.canHandle(gap));

    if (allDescriptors.length === 0 && tsEligible.length === 0) continue;

    const registryNames = new Set(allDescriptors.map((d) => d.name));
    const extraTs = tsEligible.filter((s) => !registryNames.has(s.name));

    const predicate = new GapRepairPredicate(snap.projectDir, jCtx);

    const result = await predicate.decide({
      gap,
      tried: [],
      descriptors: allDescriptors,
      tsEligible,
      extraTs,
      attempts: [],
    });

    if (result) {
      // Write planned strategy nodes directly into the graph
      for (const node of result.nodes) {
        graph.addNode(node);
      }
    }
  }

  return { action: "continue" };
};
