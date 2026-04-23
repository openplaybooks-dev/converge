/**
 * Run Children Action
 * 
 * Discover and delegate to child.run().
 */

import type { ActionHandler } from "../../types.ts";

export const runChildren: ActionHandler = async (snap) => {
  const unit = snap.unit;
  if (!unit.children) {
    const { discoverChildren } = await import("../../../../task/unit/children.ts");
    unit.children = await discoverChildren(unit, []);
  }
  if (unit.children.length === 0) return { action: "continue" };

  return {
    action: "delegate",
    delegateChildren: unit.children,
  };
};
