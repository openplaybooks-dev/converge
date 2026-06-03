/**
 * Strategy User Question Resume Action
 *
 * User question resume strategy.
 */

import type { ActionHandler } from "../../types.ts";
import { runStrategy } from "../helpers/strategy-helpers.ts";

export const strategyUserQuestionResume: ActionHandler = async (snap) => {
  const { UserQuestionResumeStrategy } =
    await import("../../../repair/strategies/user-question-resume.ts");
  return runStrategy(
    "user-question-resume",
    () => new UserQuestionResumeStrategy(),
    snap,
  );
};
