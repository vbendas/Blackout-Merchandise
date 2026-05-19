/**
 * Error formatting utility for TUI screens.
 * Converts raw errors into user-friendly messages while logging
 * full details to the console for debugging.
 *
 * Never exposes SQL queries, connection strings, or stack traces to the UI.
 */

/** Patterns that indicate sensitive data in error messages */
const SENSITIVE_PATTERNS = [
  /postgresql:\/\/[^\s]+/gi,        // Connection strings
  /neondb_owner:[^\s]+@/gi,          // DB credentials
  /npg_[a-zA-Z0-9]+/gi,             // Neon API keys
  /select\s+.*?\s+from\s+/gi,        // SQL SELECT queries
  /insert\s+into\s+/gi,              // SQL INSERT
  /update\s+.*?\s+set\s+/gi,         // SQL UPDATE
  /delete\s+from\s+/gi,              // SQL DELETE
  /params:\s*\[/gi,                  // Query parameters
  /at\s+.*\(.+:\d+:\d+\)/gi,        // Stack traces
  /node:internal/gi,
  /at\s+Object\./gi,
  /at\s+eval/gi,
  /at\s+loadAndEvaluateModule/gi,
];

/**
 * Format an error for display in the TUI.
 * Logs the full error to console.error and returns a user-friendly message.
 */
export function formatDbError(err: unknown, context = 'operation'): string {
  // Log full error for debugging
  console.error(`[DB Error] ${context}:`, err);

  if (err instanceof Error) {
    let message = err.message;

    // Strip sensitive patterns
    for (const pattern of SENSITIVE_PATTERNS) {
      message = message.replace(pattern, '[REDACTED]');
    }

    // Clean up the redacted message
    message = message
      .replace(/\[REDACTED\]\s*\[REDACTED\]/g, '[REDACTED]')
      .replace(/\s+/g, ' ')
      .trim();

    // If the message is still too long or contains technical jargon, simplify
    if (message.length > 120 || /relation|column|constraint|violates|syntax/i.test(message)) {
      return `Failed to ${context}. Press R to retry.`;
    }

    return message;
  }

  return `Failed to ${context}. Press R to retry.`;
}
