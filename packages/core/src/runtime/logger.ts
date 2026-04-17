/**
 * Structured Logger
 *
 * Creates a concrete `LoggerAPI` implementation driven by the
 * `RuntimeConfig.logLevel` and `jsonLogs` settings from `converge.ts`.
 *
 * Log levels (ascending severity):
 *   debug → info → warn → error
 *
 * JSON output mode (`jsonLogs: true`) emits newline-delimited JSON
 * suitable for log aggregators (Datadog, Loki, CloudWatch, etc.).
 *
 * @example
 * const log = createLogger({ logLevel: 'info', jsonLogs: false });
 * log.info('Task started', { taskId: 'my-task' });
 */

import type { LoggerAPI } from '../context/types.ts';

/* ------------------------------------------------------------------ */
/*  Level Hierarchy                                                    */
/* ------------------------------------------------------------------ */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const LEVEL_VALUES: Record<LogLevel, number> = {
  debug: 0,
  info:  1,
  warn:  2,
  error: 3,
};

const LEVEL_LABELS: Record<LogLevel, string> = {
  debug: 'DEBUG',
  info:  ' INFO',
  warn:  ' WARN',
  error: 'ERROR',
};

/* ------------------------------------------------------------------ */
/*  Logger Implementation                                              */
/* ------------------------------------------------------------------ */

interface LoggerConfig {
  logLevel?: LogLevel;
  jsonLogs?: boolean;
  prefix?: string;
}

class StructuredLogger implements LoggerAPI {
  private minLevel: number;
  private jsonLogs: boolean;
  private prefix: string;

  constructor(config: LoggerConfig = {}) {
    this.minLevel = LEVEL_VALUES[config.logLevel ?? 'info'];
    this.jsonLogs = config.jsonLogs ?? false;
    this.prefix = config.prefix ? `[${config.prefix}] ` : '';
  }

  debug(message: string, meta?: Record<string, unknown>): void {
    this.emit('debug', message, meta);
  }

  info(message: string, meta?: Record<string, unknown>): void {
    this.emit('info', message, meta);
  }

  warn(message: string, meta?: Record<string, unknown>): void {
    this.emit('warn', message, meta);
  }

  error(message: string, meta?: Record<string, unknown>): void {
    this.emit('error', message, meta);
  }

  child(prefix: string): LoggerAPI {
    return new StructuredLogger({
      logLevel: levelFromValue(this.minLevel),
      jsonLogs: this.jsonLogs,
      prefix: this.prefix ? `${this.prefix.slice(1, -2)}:${prefix}` : prefix,
    });
  }

  private emit(level: LogLevel, message: string, meta?: Record<string, unknown>): void {
    if (LEVEL_VALUES[level] < this.minLevel) return;

    if (this.jsonLogs) {
      const entry: Record<string, unknown> = {
        ts:      new Date().toISOString(),
        level,
        message: this.prefix + message,
      };
      if (meta && Object.keys(meta).length > 0) {
        Object.assign(entry, meta);
      }
      (level === 'error' || level === 'warn' ? console.error : console.log)(
        JSON.stringify(entry)
      );
    } else {
      const ts = new Date().toISOString().slice(11, 23); // HH:MM:SS.mmm
      const label = LEVEL_LABELS[level];
      const text = `${ts} ${label} ${this.prefix}${message}`;
      if (level === 'error') {
        console.error(text);
        if (meta) console.error('         ', meta);
      } else if (level === 'warn') {
        console.warn(text);
        if (meta) console.warn('         ', meta);
      } else {
        console.log(text);
        if (meta) console.log('         ', meta);
      }
    }
  }
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function levelFromValue(value: number): LogLevel {
  for (const [k, v] of Object.entries(LEVEL_VALUES) as [LogLevel, number][]) {
    if (v === value) return k;
  }
  return 'info';
}

/* ------------------------------------------------------------------ */
/*  Factory                                                            */
/* ------------------------------------------------------------------ */

/**
 * Create a structured logger driven by runtime config.
 *
 * @param config - `logLevel` and `jsonLogs` from `ConvergeConfig.runtime`
 * @param prefix - Optional prefix string (e.g., 'project', 'epic:setup')
 */
export function createLogger(
  config: Pick<LoggerConfig, 'logLevel' | 'jsonLogs'> = {},
  prefix?: string
): LoggerAPI {
  return new StructuredLogger({ ...config, prefix });
}

/**
 * Create a default console logger (info level, no JSON).
 * Used as a fallback when no converge.ts config is present.
 */
export function createDefaultLogger(prefix?: string): LoggerAPI {
  return new StructuredLogger({ logLevel: 'info', jsonLogs: false, prefix });
}
