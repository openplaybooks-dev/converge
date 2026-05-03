/**
 * Strategy Seed Script Repair Action
 * 
 * Seed script repair strategy.
 */

import type { ActionHandler } from "../../types.ts";
import { runStrategy } from "../helpers/strategy-helpers.ts";

export const strategySeedScriptRepair: ActionHandler = async (snap) => {
  const { SeedScriptRepairStrategy } =
    await import("../../../repair/strategies/seed-script-repair.ts");
  return runStrategy(
    "seed-script-repair",
    () => new SeedScriptRepairStrategy(),
    snap,
  );
};
