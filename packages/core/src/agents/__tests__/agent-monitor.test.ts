import { describe, it, expect, beforeEach } from "vitest";
import { AgentMonitor } from "../agent-monitor.js";

describe("AgentMonitor", () => {
  let monitor: AgentMonitor;

  beforeEach(() => {
    monitor = new AgentMonitor();
  });

  it("tracks activity timeline", () => {
    monitor.logActivity("stdout", "test output 1");
    monitor.logActivity("stderr", "test error 1");
    monitor.logActivity("tool-call", "test tool 1");

    const allActivity = monitor.getAllActivity();
    expect(allActivity.length).toBe(3);
    expect(allActivity[0].type).toBe("stdout");
    expect(allActivity[1].type).toBe("stderr");
    expect(allActivity[2].type).toBe("tool-call");
  });

  it("calculates idle duration", async () => {
    monitor.logActivity("stdout", "initial activity");

    // Wait 100ms
    await new Promise((resolve) => setTimeout(resolve, 100));

    const idleDuration = monitor.getIdleDuration();
    expect(idleDuration).toBeGreaterThanOrEqual(100);
  });

  it("detects hangs after threshold", async () => {
    monitor.logActivity("stdout", "initial activity");

    // Wait 200ms
    await new Promise((resolve) => setTimeout(resolve, 200));

    const isHung = monitor.isHung(100); // 100ms threshold
    expect(isHung).toBe(true);

    const isNotHung = monitor.isHung(300); // 300ms threshold
    expect(isNotHung).toBe(false);
  });

  it("returns recent activity within time window", async () => {
    monitor.logActivity("stdout", "old activity");

    // Wait 200ms
    await new Promise((resolve) => setTimeout(resolve, 200));

    monitor.logActivity("stdout", "new activity");

    // Get activity from last 100ms (should only include new activity)
    const recentActivity = monitor.getRecentActivity(100);
    expect(recentActivity.length).toBe(1);
    expect(recentActivity[0].content).toBe("new activity");
  });

  it("provides summary stats", () => {
    monitor.logActivity("stdout", "output 1");
    monitor.logActivity("stdout", "output 2");
    monitor.logActivity("stderr", "error 1");
    monitor.logActivity("tool-call", "tool 1");

    const summary = monitor.getSummary();
    expect(summary.totalActivities).toBe(4);
    expect(summary.activityTypes["stdout"]).toBe(2);
    expect(summary.activityTypes["stderr"]).toBe(1);
    expect(summary.activityTypes["tool-call"]).toBe(1);
  });

  it("truncates large content in activity logs", () => {
    const largeContent = "x".repeat(2000);
    monitor.logActivity("stdout", largeContent);

    const allActivity = monitor.getAllActivity();
    expect(allActivity[0].content).toBeUndefined(); // Content > 1000 chars is not stored
    expect(allActivity[0].size).toBe(2000);
  });

  it("clears all data", () => {
    monitor.logActivity("stdout", "test");
    monitor.logActivity("stderr", "test");

    expect(monitor.getAllActivity().length).toBe(2);

    monitor.clear();

    expect(monitor.getAllActivity().length).toBe(0);
  });
});
