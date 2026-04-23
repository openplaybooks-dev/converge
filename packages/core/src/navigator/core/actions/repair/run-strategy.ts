/**
 * Run Strategy Action
 * 
 * Generic handler that executes a named strategy.
 */

import type { ActionHandler } from "../../types.ts";
import {
  groupGaps,
  pickRepresentative,
  buildStrategyContext,
  buildTsStrategies,
  executeSkillStrategy,
} from "../helpers/strategy-helpers.ts";

/**
 * run-strategy — generic handler that executes a named strategy.
 * Reads the strategy name from the current executing node's data.
 */
export const runStrategyHandler: ActionHandler = async (snap, graph) => {
  // Find the strategy name from the executing node's data
  const currentNode = graph.nodes.find((n) => n.status === "executing");
  const strategyName = currentNode?.data?.strategy as string;
  if (!strategyName)
    return { action: "bail", reason: "run-strategy: no strategy name" };

  const strategies = await buildTsStrategies();
  const tsStrategy = strategies.find((s) => s.name === strategyName);

  if (tsStrategy) {
    const { runStrategy } = await import("../helpers/strategy-helpers.ts");
    return runStrategy(strategyName, () => tsStrategy, snap);
  }

  // Try unified registry (skill-based strategies)
  const { UnifiedStrategyRegistry, getBuiltinDescriptors, gatherContext } =
    await import("../../../repair/strategy-catalog.ts");
  const { join, dirname } = await import("node:path");

  const reg = new UnifiedStrategyRegistry();
  for (const { descriptor, strategyClass } of getBuiltinDescriptors()) {
    const strategy = strategies.find(
      (s) => s.constructor.name === strategyClass || s.name === descriptor.name,
    );
    if (strategy) reg.registerBuiltin(strategy, descriptor);
  }

  const repairDir = join(snap.projectDir, ".converge", "skills", "repair");
  await reg.scanAndRegisterSkills(repairDir);
  const { fileURLToPath } = await import("node:url");
  const builtinDir = join(
    dirname(fileURLToPath(import.meta.url)),
    "..",
    "..",
    "skill-templates",
  );
  await reg.scanAndRegisterSkills(builtinDir);

  const gapKind = (snap.gaps[0]?.metadata?.gapKind as string) ?? "output";
  const allDescriptors = reg.getEligible(gapKind);
  const descriptor = allDescriptors.find((d) => d.name === strategyName);

  if (!descriptor) {
    console.log(`   ⚠️  Strategy '${strategyName}' not found`);
    return { action: "continue" };
  }

  const groups = groupGaps(snap.gaps);
  const sCtx = buildStrategyContext(snap);

  for (const [, group] of groups) {
    const gap = pickRepresentative(group);
    if (descriptor.type === "builtin" && descriptor.strategy) {
      if (!descriptor.strategy.canHandle(gap)) continue;
      const start = Date.now();
      try {
        const outcome = await descriptor.strategy.tryFix(gap, sCtx);
        const elapsed = ((Date.now() - start) / 1000).toFixed(1);
        if (outcome.success) {
          console.log(`   ✅ ${strategyName} (${elapsed}s)`);
        } else {
          console.log(`   ↩  ${strategyName}: ${outcome.reason} (${elapsed}s)`);
        }
      } catch (err: any) {
        console.log(`   ↩  ${strategyName}: Uncaught: ${err.message}`);
      }
    } else if (descriptor.skillPath) {
      // Skill-based strategy execution
      const gathered = await gatherContext(
        descriptor.contextSteps,
        gap,
        snap.projectDir,
      );
      await executeSkillStrategy(descriptor, gap, gathered, snap);
    }
  }

  return { action: "continue", executionCount: snap.executionCount + 1 };
};
