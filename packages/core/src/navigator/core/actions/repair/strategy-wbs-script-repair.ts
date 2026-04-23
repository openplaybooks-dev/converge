/**
 * Strategy WBS Script Repair Action
 * 
 * WBS script repair strategy.
 */

import type { ActionHandler } from "../../types.ts";
import { runStrategy } from "../helpers/strategy-helpers.ts";

export const strategyWbsScriptRepair: ActionHandler = async (snap) => {
  const { WbsScriptRepairStrategy } =
    await import("../../../repair/strategies/wbs-script-repair.ts");
  return runStrategy(
    "wbs-script-repair",
    () => new WbsScriptRepairStrategy(),
    snap,
  );
};
