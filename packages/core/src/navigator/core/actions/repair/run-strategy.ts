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

  // Circuit breaker integration: every strategy invocation increments
  // a per-(taskId, gapKind) counter. After N=3 consecutive failures,
  // the circuit trips and further attempts are skipped — preventing
  // the infinite-repair-loop hazard (AI emits malformed fix → gap
  // re-detected → AI emits malformed fix again).
  const { isCircuitTripped, recordRepairAttempt } = await import(
    "../../../repair/circuit-breaker.ts"
  );
  const playbookName = process.env.CONVERGE_PLAYBOOK ?? "default";

  for (const [, group] of groups) {
    const gap = pickRepresentative(group);
    const gapKind =
      (gap.metadata?.gapKind as string | undefined) ?? gap.type ?? "unknown";
    const taskId = (gap.metadata?.taskId as string | undefined) ?? gap.scope;

    if (taskId && isCircuitTripped(snap.projectDir, playbookName, taskId, gapKind)) {
      console.log(
        `   ⛔ ${strategyName} skipped: circuit tripped for ${taskId} (${gapKind}). ` +
          `Run \`converge doctor --fix\` to re-arm after manual investigation.`,
      );
      continue;
    }

    if (descriptor.type === "builtin" && descriptor.strategy) {
      if (!descriptor.strategy.canHandle(gap)) continue;
      // Run preTask hook (creates attempt directory, etc.)
      if (descriptor.strategy.preTask) {
        try { await descriptor.strategy.preTask(gap, sCtx, []); } catch {}
      }
      const start = Date.now();
      let success = false;
      let errorMessage: string | undefined;
      try {
        const outcome = await descriptor.strategy.tryFix(gap, sCtx);
        const elapsed = ((Date.now() - start) / 1000).toFixed(1);
        if (outcome.success) {
          console.log(`   ✅ ${strategyName} (${elapsed}s)`);
          success = true;
        } else {
          console.log(`   ↩  ${strategyName}: ${outcome.reason} (${elapsed}s)`);
          errorMessage = outcome.reason;
        }
        // Run postTask hook
        if (descriptor.strategy.postTask) {
          try { await descriptor.strategy.postTask(gap, sCtx, outcome); } catch {}
        }
      } catch (err: any) {
        console.log(`   ↩  ${strategyName}: Uncaught: ${err.message}`);
        errorMessage = err.message;
      }
      // Record this attempt (whether success or failure). Success
      // clears the counter; failure increments and may trip the
      // circuit.
      if (taskId) {
        const result = recordRepairAttempt({
          projectDir: snap.projectDir,
          playbookName,
          taskId,
          gapKind,
          success,
          errorMessage,
        });
        if (result.justTripped) {
          console.log(
            `   🔌 circuit tripped for ${taskId} (${gapKind}) after ${result.attempts} failed repair attempt(s). ` +
              `Run \`converge doctor\` for details.`,
          );
        }
      }
    } else if (descriptor.skillPath) {
      // Skill-based strategy execution
      const gathered = await gatherContext(
        descriptor.contextSteps,
        gap,
        snap.projectDir,
      );
      await executeSkillStrategy(descriptor, gap, gathered, snap);
      // Note: skill-based strategies don't expose a single success/failure
      // signal yet — they emit gaps that the next loop iteration evaluates.
      // The circuit breaker can be threaded through them in a follow-up
      // when the executeSkillStrategy contract returns an outcome.
    }
  }

  return { action: "continue", executionCount: snap.executionCount + 1 };
};
