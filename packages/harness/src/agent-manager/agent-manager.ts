import { ChildProcess } from 'node:child_process';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { writeFileSync, readFileSync, existsSync, mkdirSync } from 'node:fs';

export interface ProcessInfo {
  pid: number;
  sessionId: string;
  command: string;
  args: string[];
  cwd: string;
  startedAt: number;
  lastActivityAt: number;
  status: 'starting' | 'running' | 'idle' | 'hung' | 'exiting' | 'dead';
  logPath: string;
  parentPid: number;
  exitCode?: number | null;
  signal?: string;
  retryCount: number;

  // Harness-specific metadata
  harnessMetadata: {
    projectDir: string;
    epicId?: string;
    taskId?: string;
    phase?: 'analysis' | 'execution' | 'verification';
    strategyType?: string;
  };

  // Generic metadata for additional context
  metadata?: Record<string, any>;
}

export interface ProcessMetrics {
  totalSpawned: number;
  currentlyRunning: number;
  hung: number;
  leaked: number;
  avgLifetimeMs: number;
  avgIdleMs: number;

  // Harness-specific metrics
  byPhase: Record<string, number>;
  byStrategy: Record<string, number>;
  successRate: number;
}

export type NodeSignals = 'SIGTERM' | 'SIGKILL' | 'SIGINT';

export class AgentManager {
  // Dual-index: track by both PID and sessionId
  private agentsByPid = new Map<number, ProcessInfo>();
  private agentsBySession = new Map<string, ProcessInfo>();

  private stateFilePath = join(homedir(), '.harness', 'agent-registry.json');
  private healthCheckInterval?: NodeJS.Timeout;
  private healthCheckIntervalMs = 30000; // 30 seconds
  private hangThresholdMs = 5 * 60 * 1000; // 5 minutes

  // Singleton pattern
  private static instance?: AgentManager;

  private constructor() {
    this.ensureStateDir();
    this.loadState();
    this.startHealthMonitor();
  }

  static getInstance(): AgentManager {
    if (!AgentManager.instance) {
      AgentManager.instance = new AgentManager();
    }
    return AgentManager.instance;
  }

  // Core API - register process
  register(proc: ChildProcess, metadata: Partial<ProcessInfo>): void {
    if (!proc.pid) {
      console.warn('⚠️  Cannot register process without PID');
      return;
    }

    const info: ProcessInfo = {
      pid: proc.pid,
      sessionId: metadata.sessionId ?? `session-${proc.pid}`,
      command: metadata.command ?? 'claude',
      args: metadata.args ?? [],
      cwd: metadata.cwd ?? process.cwd(),
      startedAt: Date.now(),
      lastActivityAt: Date.now(),
      status: 'starting',
      logPath: metadata.logPath ?? '',
      parentPid: process.pid,
      retryCount: metadata.retryCount ?? 0,
      harnessMetadata: metadata.harnessMetadata ?? {
        projectDir: process.cwd(),
      },
      metadata: metadata.metadata,
    };

    // Dual-index tracking
    this.agentsByPid.set(info.pid, info);
    this.agentsBySession.set(info.sessionId, info);

    console.log(`✅ Registered agent PID=${info.pid} sessionId=${info.sessionId}`);

    // Attach exit handler
    proc.on('exit', (code, signal) => {
      this.handleExit(info.pid, code, signal ?? undefined);
    });

    this.saveState();
  }

  // Unregister by PID
  unregister(pid: number): void {
    const info = this.agentsByPid.get(pid);
    if (info) {
      this.agentsByPid.delete(pid);
      this.agentsBySession.delete(info.sessionId);
      console.log(`🗑️  Unregistered agent PID=${pid} sessionId=${info.sessionId}`);
      this.saveState();
    }
  }

  // Unregister by sessionId
  unregisterBySession(sessionId: string): void {
    const info = this.agentsBySession.get(sessionId);
    if (info) {
      this.agentsByPid.delete(info.pid);
      this.agentsBySession.delete(sessionId);
      console.log(`🗑️  Unregistered agent sessionId=${sessionId} PID=${info.pid}`);
      this.saveState();
    }
  }

  // Update activity timestamp
  updateActivity(pid: number): void {
    const info = this.agentsByPid.get(pid);
    if (info) {
      info.lastActivityAt = Date.now();
      if (info.status === 'idle' || info.status === 'hung') {
        info.status = 'running';
      }
    }
  }

  updateActivityBySession(sessionId: string): void {
    const info = this.agentsBySession.get(sessionId);
    if (info) {
      info.lastActivityAt = Date.now();
      if (info.status === 'idle' || info.status === 'hung') {
        info.status = 'running';
      }
    }
  }

  // Update status
  updateStatus(pid: number, status: ProcessInfo['status']): void {
    const info = this.agentsByPid.get(pid);
    if (info) {
      info.status = status;
      this.saveState();
    }
  }

  updateStatusBySession(sessionId: string, status: ProcessInfo['status']): void {
    const info = this.agentsBySession.get(sessionId);
    if (info) {
      info.status = status;
      this.saveState();
    }
  }

  // Monitoring - query by PID or sessionId
  getProcess(pid: number): ProcessInfo | undefined {
    return this.agentsByPid.get(pid);
  }

  getProcessBySession(sessionId: string): ProcessInfo | undefined {
    return this.agentsBySession.get(sessionId);
  }

  getAllProcesses(): ProcessInfo[] {
    return Array.from(this.agentsByPid.values());
  }

  getHungProcesses(): ProcessInfo[] {
    const now = Date.now();
    return this.getAllProcesses().filter(p => {
      const idleMs = now - p.lastActivityAt;
      return p.status !== 'dead' && idleMs > this.hangThresholdMs;
    });
  }

  getLeakedProcesses(): ProcessInfo[] {
    return this.getAllProcesses().filter(p => {
      // Leaked = parent no longer running but process still alive
      if (p.status === 'dead') return false;

      // Check if parent process exists
      try {
        process.kill(p.parentPid, 0);
        return false; // Parent exists
      } catch {
        // Parent doesn't exist, check if child is still alive
        return this.isProcessAlive(p.pid);
      }
    });
  }

  // Harness-specific queries
  getProcessesByTask(taskId: string): ProcessInfo[] {
    return this.getAllProcesses().filter(
      p => p.harnessMetadata.taskId === taskId
    );
  }

  getProcessesByEpic(epicId: string): ProcessInfo[] {
    return this.getAllProcesses().filter(
      p => p.harnessMetadata.epicId === epicId
    );
  }

  getProcessesByPhase(phase: string): ProcessInfo[] {
    return this.getAllProcesses().filter(
      p => p.harnessMetadata.phase === phase
    );
  }

  // Cleanup - kill by PID or sessionId
  async killProcess(pid: number, signal: NodeSignals = 'SIGTERM'): Promise<void> {
    const info = this.agentsByPid.get(pid);
    if (!info) {
      console.warn(`⚠️  Cannot kill PID=${pid}: not found in registry`);
      return;
    }

    if (!this.isProcessAlive(pid)) {
      this.updateStatus(pid, 'dead');
      return;
    }

    try {
      process.kill(pid, signal);
      console.log(`🔪 Sent ${signal} to PID=${pid}`);
      this.updateStatus(pid, 'exiting');
    } catch (error: any) {
      if (error.code === 'ESRCH') {
        // Process not found - already dead
        this.updateStatus(pid, 'dead');
      } else {
        console.error(`❌ Failed to kill PID=${pid}:`, error.message);
      }
    }
  }

  async killSession(sessionId: string, signal: NodeSignals = 'SIGTERM'): Promise<void> {
    const info = this.agentsBySession.get(sessionId);
    if (!info) {
      console.warn(`⚠️  Cannot kill sessionId=${sessionId}: not found in registry`);
      return;
    }
    await this.killProcess(info.pid, signal);
  }

  async killAll(): Promise<void> {
    const processes = this.getAllProcesses().filter(p => p.status !== 'dead');
    console.log(`🔪 Killing ${processes.length} processes...`);
    await Promise.all(processes.map(p => this.killProcess(p.pid, 'SIGTERM')));
  }

  cleanupDeadProcesses(): void {
    const deadProcesses = this.getAllProcesses().filter(p => {
      return p.status === 'dead' || !this.isProcessAlive(p.pid);
    });

    for (const proc of deadProcesses) {
      this.unregister(proc.pid);
    }

    if (deadProcesses.length > 0) {
      console.log(`🗑️  Cleaned up ${deadProcesses.length} dead processes`);
    }
  }

  // Task-aware cleanup
  async cleanupTask(taskId: string): Promise<void> {
    const processes = this.getProcessesByTask(taskId);
    console.log(`🗑️  Cleaning up ${processes.length} processes for task ${taskId}`);
    await Promise.all(processes.map(p => this.killProcess(p.pid)));
  }

  async cleanupEpic(epicId: string): Promise<void> {
    const processes = this.getProcessesByEpic(epicId);
    console.log(`🗑️  Cleaning up ${processes.length} processes for epic ${epicId}`);
    await Promise.all(processes.map(p => this.killProcess(p.pid)));
  }

  // Persistence
  private ensureStateDir(): void {
    const dir = join(homedir(), '.harness');
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }
  }

  private saveState(): void {
    try {
      const state = {
        version: 1,
        timestamp: Date.now(),
        processes: Array.from(this.agentsByPid.values()),
      };
      writeFileSync(this.stateFilePath, JSON.stringify(state, null, 2), 'utf-8');
    } catch (error: any) {
      console.error('❌ Failed to save agent state:', error.message);
    }
  }

  private loadState(): void {
    try {
      if (!existsSync(this.stateFilePath)) {
        return;
      }

      const content = readFileSync(this.stateFilePath, 'utf-8');
      const state = JSON.parse(content);

      for (const proc of state.processes || []) {
        // Only reload if process is still alive
        if (this.isProcessAlive(proc.pid)) {
          this.agentsByPid.set(proc.pid, proc);
          this.agentsBySession.set(proc.sessionId, proc);
        }
      }

      console.log(`📥 Loaded ${this.agentsByPid.size} active agents from state file`);
    } catch (error: any) {
      console.error('❌ Failed to load agent state:', error.message);
    }
  }

  // Health monitoring
  private startHealthMonitor(): void {
    this.healthCheckInterval = setInterval(() => {
      this.checkHealth();
    }, this.healthCheckIntervalMs);
  }

  private checkHealth(): void {
    const now = Date.now();

    // Check for hung processes
    for (const proc of this.getAllProcesses()) {
      if (proc.status === 'dead') continue;

      const idleMs = now - proc.lastActivityAt;

      // Update status based on idle time
      if (idleMs > this.hangThresholdMs) {
        if (proc.status !== 'hung') {
          console.warn(`⚠️  Process PID=${proc.pid} appears hung (idle for ${Math.round(idleMs / 1000)}s)`);
          this.updateStatus(proc.pid, 'hung');
        }
      } else if (idleMs > 60000 && proc.status === 'running') {
        // Idle for > 1 minute but not hung yet
        this.updateStatus(proc.pid, 'idle');
      }

      // Check if process is actually alive
      if (!this.isProcessAlive(proc.pid)) {
        this.updateStatus(proc.pid, 'dead');
      }
    }

    // Cleanup dead processes periodically
    this.cleanupDeadProcesses();
  }

  // Metrics
  getMetrics(): ProcessMetrics {
    const processes = this.getAllProcesses();
    const now = Date.now();

    const running = processes.filter(p => p.status !== 'dead');
    const hung = this.getHungProcesses();
    const leaked = this.getLeakedProcesses();

    const lifetimes = processes
      .filter(p => p.exitCode !== undefined)
      .map(p => (p.lastActivityAt || now) - p.startedAt);
    const avgLifetimeMs = lifetimes.length > 0
      ? lifetimes.reduce((a, b) => a + b, 0) / lifetimes.length
      : 0;

    const idleDurations = running.map(p => now - p.lastActivityAt);
    const avgIdleMs = idleDurations.length > 0
      ? idleDurations.reduce((a, b) => a + b, 0) / idleDurations.length
      : 0;

    const byPhase: Record<string, number> = {};
    const byStrategy: Record<string, number> = {};

    for (const proc of processes) {
      const phase = proc.harnessMetadata.phase ?? 'unknown';
      const strategy = proc.harnessMetadata.strategyType ?? 'unknown';

      byPhase[phase] = (byPhase[phase] || 0) + 1;
      byStrategy[strategy] = (byStrategy[strategy] || 0) + 1;
    }

    const successful = processes.filter(p => p.exitCode === 0).length;
    const successRate = processes.length > 0 ? successful / processes.length : 0;

    return {
      totalSpawned: processes.length,
      currentlyRunning: running.length,
      hung: hung.length,
      leaked: leaked.length,
      avgLifetimeMs,
      avgIdleMs,
      byPhase,
      byStrategy,
      successRate,
    };
  }

  getMetricsByTask(taskId: string): ProcessMetrics {
    const processes = this.getProcessesByTask(taskId);
    const now = Date.now();

    const running = processes.filter(p => p.status !== 'dead');
    const hung = processes.filter(p => {
      const idleMs = now - p.lastActivityAt;
      return p.status !== 'dead' && idleMs > this.hangThresholdMs;
    });

    const lifetimes = processes
      .filter(p => p.exitCode !== undefined)
      .map(p => (p.lastActivityAt || now) - p.startedAt);
    const avgLifetimeMs = lifetimes.length > 0
      ? lifetimes.reduce((a, b) => a + b, 0) / lifetimes.length
      : 0;

    const idleDurations = running.map(p => now - p.lastActivityAt);
    const avgIdleMs = idleDurations.length > 0
      ? idleDurations.reduce((a, b) => a + b, 0) / idleDurations.length
      : 0;

    const byPhase: Record<string, number> = {};
    const byStrategy: Record<string, number> = {};

    for (const proc of processes) {
      const phase = proc.harnessMetadata.phase ?? 'unknown';
      const strategy = proc.harnessMetadata.strategyType ?? 'unknown';

      byPhase[phase] = (byPhase[phase] || 0) + 1;
      byStrategy[strategy] = (byStrategy[strategy] || 0) + 1;
    }

    const successful = processes.filter(p => p.exitCode === 0).length;
    const successRate = processes.length > 0 ? successful / processes.length : 0;

    return {
      totalSpawned: processes.length,
      currentlyRunning: running.length,
      hung: hung.length,
      leaked: 0, // Leaked processes are global, not task-specific
      avgLifetimeMs,
      avgIdleMs,
      byPhase,
      byStrategy,
      successRate,
    };
  }

  // Helper: check if process is alive
  private isProcessAlive(pid: number): boolean {
    try {
      process.kill(pid, 0);
      return true;
    } catch {
      return false;
    }
  }

  // Helper: handle process exit
  private handleExit(pid: number, code: number | null, signal?: string): void {
    const info = this.agentsByPid.get(pid);
    if (!info) return;

    info.exitCode = code;
    info.signal = signal;
    info.status = 'dead';

    console.log(`💀 Agent PID=${pid} exited with code=${code} signal=${signal}`);

    this.saveState();
  }

  // Cleanup on shutdown
  destroy(): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }
  }
}
