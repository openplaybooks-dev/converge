/**
 * Navigator Graph — Initial Nodes & Goal Conditions
 *
 * Replaces the old flat node list. Each node is buffered with an applicability
 * predicate (string key into the predicate registry) and a priority. The
 * navigator picks the highest-priority applicable node each pass.
 *
 * Goal conditions are the exit criteria: when all are satisfied, convergence
 * is done.
 */

import type { GraphNode, GoalCondition } from './types.ts';
import type { Unit } from '../../unit/unit.ts';

/* ------------------------------------------------------------------ */
/*  Builder helper                                                     */
/* ------------------------------------------------------------------ */

function buffered(
  id: string,
  handler: string,
  priority: number,
  applicable?: string,
  extra?: Record<string, unknown>,
): GraphNode {
  return {
    id,
    handler,
    status: 'buffered',
    origin: 'initial',
    data: {
      priority,
      ...(applicable ? { applicable } : {}),
      ...(extra ?? {}),
    },
  };
}

/* ------------------------------------------------------------------ */
/*  Goal conditions — exit criteria                                    */
/* ------------------------------------------------------------------ */

export const GOAL_CONDITIONS: GoalCondition[] = [
  { name: 'noGaps', check: s => s.gaps.length === 0 },
];

/* ------------------------------------------------------------------ */
/*  Initial buffered nodes                                             */
/* ------------------------------------------------------------------ */

/**
 * Build the initial set of buffered nodes based on the Unit's capabilities.
 * All nodes start as 'buffered' with origin 'initial'. The navigator picks
 * them based on applicability predicates and priority.
 *
 * Priority ordering (higher = runs first):
 *   100  check-wbs-seeded       (pre-flight)
 *    99  check-outputs-exist    (pre-flight)
 *    98  detect-gaps
 *    97  signal-done            (when noGaps)
 *    90  resolve-plan           (when hasPlan)
 *    85  resolve-wbs            (when hasWbs)
 *    80  resolve-blockers       (when hasBlocker AND isFirst)
 *    79  bail-blockers          (when hasBlocker AND NOT isFirst)
 *    75  strategy-wbs-gen       (when hasSystemic)
 *    70  strategy-wbs-script    (when hasWbsScript)
 *    65  run-executor           (when isFirst)
 *    60  strategy-user-q        (when hasUserQ)
 *    55  repair-loop            (when hasRepairableGap)
 *    50  verify
 *    45  check-stall
 *    40  advance-attempt
 */
export function buildInitialNodes(unit: Unit): GraphNode[] {
  const nodes: GraphNode[] = [];

  // Pre-flight checks (no precondition, run first)
  nodes.push(buffered('check-wbs-seeded', 'check-wbs-seeded', 100));
  nodes.push(buffered('check-outputs-exist', 'check-outputs-exist', 99));

  // Gap detection
  nodes.push(buffered('detect-gaps', 'detect-gaps', 98));

  // Terminal: done when no gaps
  nodes.push(buffered('signal-done', 'signal-done', 97, 'noGaps'));

  // Plan resolution
  if (unit.planConfig) {
    nodes.push(buffered('resolve-plan', 'resolve-plan', 90, 'hasPlan'));
  }

  // WBS resolution
  if (unit.wbsFn) {
    nodes.push(buffered('resolve-wbs', 'resolve-wbs', 85, 'hasWbs'));
    nodes.push(buffered('strategy-wbs-generator-repair', 'strategy-wbs-generator-repair', 75, 'hasSystemic'));
    nodes.push(buffered('strategy-wbs-script-repair', 'strategy-wbs-script-repair', 70, 'hasWbsScript'));
  }

  // Blocker handling — two mutually exclusive actions
  nodes.push(buffered('resolve-blockers', 'resolve-blockers', 80, 'hasBlockerAndIsFirst'));
  nodes.push(buffered('bail-blockers', 'bail-blockers', 79, 'hasBlockerAndNotFirst'));

  // User question handling
  nodes.push(buffered('strategy-user-question-resume', 'strategy-user-question-resume', 60, 'hasUserQ'));

  // Executor dispatch
  nodes.push(buffered('run-executor', 'run-executor', 65, 'isFirst'));

  // Repair loop
  if ((unit.outputs?.length ?? 0) > 0 || unit.checks) {
    nodes.push(buffered('repair-loop', 'repair-loop', 55, 'hasRepairableGap'));
  }

  // Post-action: verify, check stall, advance attempt
  nodes.push(buffered('verify', 'verify', 50));
  nodes.push(buffered('check-stall', 'check-stall', 45));
  nodes.push(buffered('advance-attempt', 'advance-attempt', 40));

  return nodes;
}
