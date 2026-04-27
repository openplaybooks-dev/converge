import chokidar, { FSWatcher, type ChokidarOptions } from 'chokidar';
import { EventEmitter } from 'node:events';
import * as path from 'node:path';
import { convergeDir } from './paths';

export type FsChangeKind =
  | 'playbook-added' | 'playbook-changed' | 'playbook-removed'
  | 'task-added'     | 'task-changed'     | 'task-removed'
  | 'session-added'  | 'session-changed';

export interface FsChangeEvent {
  kind: FsChangeKind;
  playbook?: string;
  taskPath?: string;
  sessionId?: string;
  filePath: string;
  at: string;
}

export class ConvergeWatcher extends EventEmitter {
  private watcher: FSWatcher | null = null;
  private timers = new Map<string, NodeJS.Timeout>();
  private root: string;

  constructor(root: string) {
    super();
    this.root = root;
  }

  start(): void {
    const root = convergeDir(this.root);
    const globOpts: ChokidarOptions = {
      ignoreInitial: true,
      awaitWriteFinish: { stabilityThreshold: 50 },
      ignored: [
        '**/events.jsonl',
        '**/node_modules/**',
        '**/.*',
      ],
    };

    this.watcher = chokidar.watch(
      [
        'playbooks/*/playbook.yml',
        'playbooks/*/tasks/**/TASK.md',
        'journal/*/sessions/*/metadata.json',
        'journal/*/tasks/**/checkpoint.json',
      ],
      { ...globOpts, cwd: root }
    );

    this.watcher.on('add',    (fp: string) => this.handle('add',    fp, root));
    this.watcher.on('change', (fp: string) => this.handle('change', fp, root));
    this.watcher.on('unlink', (fp: string) => this.handle('unlink', fp, root));
  }

  stop(): Promise<void> {
    this.timers.forEach((t) => clearTimeout(t));
    this.timers.clear();
    return this.watcher?.close() ?? Promise.resolve();
  }

  private handle(
    event: 'add' | 'change' | 'unlink',
    filePath: string,
    root: string
  ): void {
    const absPath = path.join(root, filePath);
    const existing = this.timers.get(absPath);
    if (existing) clearTimeout(existing);
    this.timers.set(
      absPath,
      setTimeout(() => {
        this.timers.delete(absPath);
        this.emitEvent(event, filePath);
      }, 100)
    );
  }

  private emitEvent(event: 'add' | 'change' | 'unlink', filePath: string): void {
    const e: FsChangeEvent = {
      kind: this.classify(event, filePath),
      filePath,
      at: new Date().toISOString(),
    };
    this.parsePath(filePath, e);
    this.emit('fs-change', e);
  }

  private classify(event: 'add' | 'change' | 'unlink', filePath: string): FsChangeKind {
    if (filePath.includes('/sessions/') && filePath.endsWith('/metadata.json')) {
      return event === 'add' ? 'session-added' : 'session-changed';
    }
    if (filePath.includes('/tasks/') && filePath.endsWith('checkpoint.json')) {
      return event === 'add' ? 'task-added' : event === 'change' ? 'task-changed' : 'task-removed';
    }
    if (filePath.endsWith('playbook.yml')) {
      const m = filePath.match(/^playbooks\/([^\/]+)\/playbook\.yml$/);
      if (m) return event === 'add' ? 'playbook-added' : event === 'change' ? 'playbook-changed' : 'playbook-removed';
    }
    if (filePath.includes('/tasks/') && filePath.endsWith('TASK.md')) {
      return event === 'add' ? 'task-added' : event === 'change' ? 'task-changed' : 'task-removed';
    }
    return event === 'add' ? 'task-added' : event === 'change' ? 'task-changed' : 'task-removed';
  }

  private parsePath(filePath: string, e: FsChangeEvent): void {
    const parts = filePath.split('/');
    if (filePath.startsWith('playbooks/')) {
      e.playbook = parts[1];
    } else if (filePath.includes('/sessions/')) {
      e.sessionId = parts[3];
    } else if (filePath.includes('/tasks/')) {
      e.taskPath = '/' + parts.slice(2, -1).join('/');
    }
  }
}
