/**
 * Production-safe structured logger utility.
 * - DEV mode: prints all levels with full context
 * - PROD mode: only errors are printed (with structured metadata)
 * 
 * Usage:
 *   logger.info('User logged in', { userId: '123' });
 *   logger.error('Failed to fetch', { url, status });
 */

const isDev = import.meta.env.DEV;

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: string;
  data?: Record<string, unknown>;
}

function formatEntry(level: LogLevel, message: string, data?: Record<string, unknown>): LogEntry {
  return {
    level,
    message,
    timestamp: new Date().toISOString(),
    ...(data && Object.keys(data).length > 0 ? { data } : {}),
  };
}

function extractData(args: unknown[]): Record<string, unknown> | undefined {
  if (args.length === 0) return undefined;
  if (args.length === 1 && typeof args[0] === 'object' && args[0] !== null && !(args[0] instanceof Error)) {
    return args[0] as Record<string, unknown>;
  }
  return { details: args };
}

export const logger = {
  debug(message: string, ...args: unknown[]): void {
    if (isDev) {
      const entry = formatEntry('debug', message, extractData(args));
      console.debug(`[DEBUG] ${entry.timestamp}`, message, ...args);
    }
  },

  log(message: string, ...args: unknown[]): void {
    if (isDev) {
      const entry = formatEntry('info', message, extractData(args));
      console.log(`[LOG] ${entry.timestamp}`, message, ...args);
    }
  },

  info(message: string, ...args: unknown[]): void {
    if (isDev) {
      const entry = formatEntry('info', message, extractData(args));
      console.info(`[INFO] ${entry.timestamp}`, message, ...args);
    }
  },

  warn(message: string, ...args: unknown[]): void {
    if (isDev) {
      console.warn(`[WARN] ${new Date().toISOString()}`, message, ...args);
    }
  },

  error(message: string, ...args: unknown[]): void {
    // Always log errors, even in production
    const entry = formatEntry('error', message, extractData(args));
    console.error(`[ERROR] ${entry.timestamp}`, message, ...args);
  },
};
