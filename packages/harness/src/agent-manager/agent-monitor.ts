// pidusage is an optional dependency — dynamically imported at runtime

export interface ActivityLog {
  timestamp: number;
  type: 'stdout' | 'stderr' | 'tool-call' | 'heartbeat';
  size?: number;
  content?: string;
}

export interface ResourceSnapshot {
  timestamp: number;
  cpuPercent?: number;
  memoryMB?: number;
  handles?: number;
}

export class AgentMonitor {
  private activityLog: ActivityLog[] = [];
  private resourceSnapshots: ResourceSnapshot[] = [];
  private maxActivityLogSize = 1000; // Keep last 1000 activity entries
  private maxResourceSnapshots = 100; // Keep last 100 resource snapshots

  logActivity(type: ActivityLog['type'], content?: string): void {
    const entry: ActivityLog = {
      timestamp: Date.now(),
      type,
      size: content?.length,
      content: content && content.length < 1000 ? content : undefined, // Truncate large content
    };

    this.activityLog.push(entry);

    // Trim log if too large
    if (this.activityLog.length > this.maxActivityLogSize) {
      this.activityLog = this.activityLog.slice(-this.maxActivityLogSize);
    }
  }

  getRecentActivity(windowMs: number): ActivityLog[] {
    const cutoff = Date.now() - windowMs;
    return this.activityLog.filter(log => log.timestamp >= cutoff);
  }

  getAllActivity(): ActivityLog[] {
    return [...this.activityLog];
  }

  // Optional: Resource monitoring (if pidusage available)
  async captureResourceSnapshot(pid: number): Promise<void> {
    try {
      // Try to use pidusage if available
      const pidusage = await this.tryImportPidusage();
      if (!pidusage) return;

      const stats = await pidusage(pid);
      const snapshot: ResourceSnapshot = {
        timestamp: Date.now(),
        cpuPercent: stats.cpu,
        memoryMB: stats.memory / 1024 / 1024,
      };

      this.resourceSnapshots.push(snapshot);

      // Trim snapshots if too large
      if (this.resourceSnapshots.length > this.maxResourceSnapshots) {
        this.resourceSnapshots = this.resourceSnapshots.slice(-this.maxResourceSnapshots);
      }
    } catch (error) {
      // Silently ignore - resource monitoring is optional
    }
  }

  getResourceTrend(): { cpu: number[], memory: number[] } {
    return {
      cpu: this.resourceSnapshots.map(s => s.cpuPercent ?? 0),
      memory: this.resourceSnapshots.map(s => s.memoryMB ?? 0),
    };
  }

  getLatestResourceSnapshot(): ResourceSnapshot | undefined {
    return this.resourceSnapshots[this.resourceSnapshots.length - 1];
  }

  // Hang detection
  isIdle(idleThresholdMs: number): boolean {
    if (this.activityLog.length === 0) return true;

    const lastActivity = this.activityLog[this.activityLog.length - 1];
    return Date.now() - lastActivity.timestamp > idleThresholdMs;
  }

  isHung(hangThresholdMs: number): boolean {
    return this.isIdle(hangThresholdMs);
  }

  getIdleDuration(): number {
    if (this.activityLog.length === 0) return Date.now();

    const lastActivity = this.activityLog[this.activityLog.length - 1];
    return Date.now() - lastActivity.timestamp;
  }

  getLastActivityTimestamp(): number {
    if (this.activityLog.length === 0) return 0;
    return this.activityLog[this.activityLog.length - 1].timestamp;
  }

  // Helper: Try to import pidusage (optional dependency)
  private async tryImportPidusage(): Promise<((pid: number) => Promise<any>) | null> {
    try {
      const pidusage = await import(/* webpackIgnore: true */ 'pidusage' as string) as any;
      return pidusage.default || pidusage;
    } catch {
      return null;
    }
  }

  // Clear all data
  clear(): void {
    this.activityLog = [];
    this.resourceSnapshots = [];
  }

  // Get summary stats
  getSummary(): {
    totalActivities: number;
    activityTypes: Record<string, number>;
    lastActivity: number;
    idleDurationMs: number;
    avgCpuPercent?: number;
    avgMemoryMB?: number;
  } {
    const activityTypes: Record<string, number> = {};
    for (const log of this.activityLog) {
      activityTypes[log.type] = (activityTypes[log.type] || 0) + 1;
    }

    const avgCpuPercent = this.resourceSnapshots.length > 0
      ? this.resourceSnapshots.reduce((sum, s) => sum + (s.cpuPercent ?? 0), 0) / this.resourceSnapshots.length
      : undefined;

    const avgMemoryMB = this.resourceSnapshots.length > 0
      ? this.resourceSnapshots.reduce((sum, s) => sum + (s.memoryMB ?? 0), 0) / this.resourceSnapshots.length
      : undefined;

    return {
      totalActivities: this.activityLog.length,
      activityTypes,
      lastActivity: this.getLastActivityTimestamp(),
      idleDurationMs: this.getIdleDuration(),
      avgCpuPercent,
      avgMemoryMB,
    };
  }
}
