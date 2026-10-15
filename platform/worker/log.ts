// Structured logs for the print worker: one JSON object per line on stdout,
// which every container host's log viewer can filter on. Never log job inputs
// or file contents; ids, counts and timings are enough.

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface Logger {
  debug(event: string, fields?: Record<string, unknown>): void;
  info(event: string, fields?: Record<string, unknown>): void;
  warn(event: string, fields?: Record<string, unknown>): void;
  error(event: string, fields?: Record<string, unknown>): void;
  /** the same logger with more fields on every line */
  child(fields: Record<string, unknown>): Logger;
}

const ORDER: Record<LogLevel, number> = { debug: 10, info: 20, warn: 30, error: 40 };

export function parseLogLevel(value: string | undefined): LogLevel {
  const level = (value ?? '').trim().toLowerCase();
  return level === 'debug' || level === 'info' || level === 'warn' || level === 'error' ? level : 'info';
}

export function createLogger(
  base: Record<string, unknown> = {},
  opts: { level?: LogLevel; write?: (line: string) => void } = {},
): Logger {
  const threshold = ORDER[opts.level ?? 'info'];
  const write = opts.write ?? ((line: string) => void process.stdout.write(`${line}\n`));

  function make(fields: Record<string, unknown>): Logger {
    const emit = (level: LogLevel) => (event: string, extra?: Record<string, unknown>) => {
      if (ORDER[level] < threshold) return;
      write(JSON.stringify({ ts: new Date().toISOString(), level, event, ...fields, ...extra }));
    };
    return {
      debug: emit('debug'),
      info: emit('info'),
      warn: emit('warn'),
      error: emit('error'),
      child: (more) => make({ ...fields, ...more }),
    };
  }
  return make(base);
}

/** Log lines stay readable: drizzle puts the whole SQL statement in its message. */
function clip(text: string, max = 400): string {
  return text.length > max ? `${text.slice(0, max)}...` : text;
}

/** An error as log fields: the message, the underlying cause (drizzle wraps the
 * driver's error, and the cause is where "connection refused" lives), and the
 * first lines of the stack. */
export function errorFields(err: unknown): Record<string, unknown> {
  if (err instanceof Error) {
    return {
      error: clip(err.message),
      ...(err.cause instanceof Error ? { cause: clip(err.cause.message) } : {}),
      errorName: err.name,
      stack: err.stack?.split('\n').slice(0, 8).join('\n'),
    };
  }
  return { error: clip(String(err)) };
}
