/**
 * Strategy WBS Generator Repair Action
 * 
 * WBS generator repair strategy.
 */

import type { ActionHandler } from "../../types.ts";
import { runStrategy } from "../helpers/strategy-helpers.ts";

export const strategyWbsGeneratorRepair: ActionHandler = async (snap) => {
  const { WBSGeneratorRepairStrategy } =
    await import("../../../repair/strategies/wbs-generator-repair.ts");
  return runStrategy(
    "wbs-generator-repair",
    () => new WBSGeneratorRepairStrategy(),
    snap,
  );
};
