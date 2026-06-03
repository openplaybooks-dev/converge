/**
 * Signal Done Action
 *
 * Signal convergence completion.
 */

import type { ActionHandler } from "../../types.ts";

export const signalDone: ActionHandler = async (snap) => {
  console.log("\n✅ Converged — all gaps resolved");
  return { action: "done", success: true, reason: "Converged" };
};
