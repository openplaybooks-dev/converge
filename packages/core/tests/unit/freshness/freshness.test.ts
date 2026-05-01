import { describe, it, expect } from "vitest";
import { evaluateFreshness } from "../../src/source/freshness.ts";

const NOW = 1714608000000;
const SECOND_MS = 1000;
const MINUTE_MS = 60 * SECOND_MS;
const HOUR_MS = 60 * MINUTE_MS;
const DAY_MS = 24 * HOUR_MS;

describe("evaluateFreshness", () => {
  describe("threshold math", () => {
    const warnAfter: [number, string] = [12, "hour"];
    const errorAfter: [number, string] = [24, "hour"];

    it("pass when delta < warn", () => {
      const loadedAt = NOW - 6 * HOUR_MS;
      expect(
        evaluateFreshness(
          { loaded_at_mtime: loadedAt, warn_after: warnAfter, error_after: errorAfter },
          NOW,
        ),
      ).toBe("pass");
    });

    it("warn when warn <= delta < error", () => {
      const atWarn = NOW - 12 * HOUR_MS;
      expect(
        evaluateFreshness(
          { loaded_at_mtime: atWarn, warn_after: warnAfter, error_after: errorAfter },
          NOW,
        ),
      ).toBe("warn");

      const between = NOW - 18 * HOUR_MS;
      expect(
        evaluateFreshness(
          { loaded_at_mtime: between, warn_after: warnAfter, error_after: errorAfter },
          NOW,
        ),
      ).toBe("warn");
    });

    it("error when delta >= error", () => {
      const atError = NOW - 24 * HOUR_MS;
      expect(
        evaluateFreshness(
          { loaded_at_mtime: atError, warn_after: warnAfter, error_after: errorAfter },
          NOW,
        ),
      ).toBe("error");

      const pastError = NOW - 30 * HOUR_MS;
      expect(
        evaluateFreshness(
          { loaded_at_mtime: pastError, warn_after: warnAfter, error_after: errorAfter },
          NOW,
        ),
      ).toBe("error");
    });
  });

  describe("period units", () => {
    it("parses 'hour'", () => {
      const loadedAt = NOW - 5 * HOUR_MS;
      expect(
        evaluateFreshness(
          { loaded_at_mtime: loadedAt, warn_after: [10, "hour"], error_after: [20, "hour"] },
          NOW,
        ),
      ).toBe("pass");
    });

    it("parses 'minute'", () => {
      const loadedAt = NOW - 10 * MINUTE_MS;
      expect(
        evaluateFreshness(
          { loaded_at_mtime: loadedAt, warn_after: [5, "minute"], error_after: [15, "minute"] },
          NOW,
        ),
      ).toBe("warn");
    });

    it("parses 'day'", () => {
      const loadedAt = NOW - 5 * DAY_MS;
      expect(
        evaluateFreshness(
          { loaded_at_mtime: loadedAt, warn_after: [3, "day"], error_after: [7, "day"] },
          NOW,
        ),
      ).toBe("warn");
    });
  });
});
