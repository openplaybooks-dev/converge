/**
 * Strategy Seed Generator Repair Action
 * 
 * Seed generator repair strategy.
 */

import type { ActionHandler } from "../../types.ts";
import { runStrategy } from "../helpers/strategy-helpers.ts";

export const strategySeedGeneratorRepair: ActionHandler = async (snap) => {
  const { SeedGeneratorRepairStrategy } =
    await import("../../../repair/strategies/seed-generator-repair.ts");
  return runStrategy(
    "seed-generator-repair",
    () => new SeedGeneratorRepairStrategy(),
    snap,
  );
};
