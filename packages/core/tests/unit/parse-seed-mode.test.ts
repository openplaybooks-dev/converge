import { describe, expect, it } from "vitest";
import { parseTaskMdString } from "../../src/config/task-md-definition.ts";

describe("parseTaskMdString — legacy seed: { mode: cli } rejection", () => {
  // Contract: any frontmatter containing `seed:` (the legacy block removed by
  // RFCs 0021/0022) throws an Error tagged with errorCode "schema-removed".
  // The tag is what packages/core/src/run/index.ts's resume path uses to
  // distinguish "stale journal entry, re-spawn it" from a real parse bug.

  it("throws with errorCode: schema-removed for seed: { mode: cli }", () => {
    const md = "---\nseed:\n  mode: cli\n---\n# body\n";
    let caught: unknown;
    try {
      parseTaskMdString(md);
    } catch (e) {
      caught = e;
    }
    expect(caught).toBeInstanceOf(Error);
    expect((caught as Error).message).toMatch(
      /`seed: \{ mode: cli \}` is removed/,
    );
    expect((caught as Error & { errorCode?: string }).errorCode).toBe(
      "schema-removed",
    );
  });

  it("throws with errorCode for any non-null seed: block, not just mode: cli", () => {
    // The current parser rejects any non-null seed: input. Confirms callers
    // can rely on the same errorCode for the whole class of removed-schema
    // failures rather than string-matching the message.
    const md = "---\nseed:\n  whatever: yes\n---\n# body\n";
    let caught: unknown;
    try {
      parseTaskMdString(md);
    } catch (e) {
      caught = e;
    }
    expect((caught as Error & { errorCode?: string }).errorCode).toBe(
      "schema-removed",
    );
  });

  it("does not throw on TASK.md without a seed: block", () => {
    const md = "---\nid: ok\ntitle: ok\n---\n# body\n";
    expect(() => parseTaskMdString(md)).not.toThrow();
  });
});
