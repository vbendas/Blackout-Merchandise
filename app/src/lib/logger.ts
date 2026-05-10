/**
 * Structured Logger
 *
 * Replaces console.log with a proper logging utility that:
 * - Sanitizes sensitive data
 * - Includes timestamps and context
 * - Can be swapped for production logging service (Sentry, Datadog, etc.)
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogMeta {
  [key: string]: unknown;
}

const isDev = process.env.NODE_ENV === 'development';
const isTest = process.env.NODE_ENV === 'test';

function formatLog(level: LogLevel, message: string, meta?: LogMeta): string {
  const timestamp = new Date().toISOString();
  const metaStr = meta ? ` ${JSON.stringify(sanitizeMeta(meta))}` : '';
  return `[${timestamp}] [${level.toUpperCase()}] ${message}${metaStr}`;
}

/**
 * Sanitize metadata to prevent leaking sensitive data in logs
 */
function sanitizeMeta(meta: LogMeta): LogMeta {
  const sensitiveKeys = ['password', 'token', 'secret', 'apiKey', 'authorization', 'cookie'];
  const sanitized: LogMeta = {};

  for (const [key, value] of Object.entries(meta)) {
    if (sensitiveKeys.some((sk) => key.toLowerCase().includes(sk))) {
      sanitized[key] = '[REDACTED]';
    } else {
      sanitized[key] = value;
    }
  }

  return sanitized;
}

export const logger = {
  debug: (message: string, meta?: LogMeta) => {
    if (isDev && !isTest) {
      console.debug(formatLog('debug', message, meta));
    }
  },

  info: (message: string, meta?: LogMeta) => {
    if (isDev || isTest) {
      console.info(formatLog('info', message, meta));
    }
    // TODO: In production, send to logging service
  },

  warn: (message: string, meta?: LogMeta) => {
    if (isDev || isTest) {
      console.warn(formatLog('warn', message, meta));
    }
    // TODO: In production, send to logging service
  },

  error: (message: string, error?: Error, meta?: LogMeta) => {
    const errorMeta = error
      ? { ...meta, errorName: error.name, errorMessage: error.message, stack: error.stack }
      : meta;

    if (isDev || isTest) {
      console.error(formatLog('error', message, errorMeta));
    }
    // TODO: In production, send to error tracking service
  },
};
