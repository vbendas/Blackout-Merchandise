/**
 * Prompt Injection Sanitizer
 *
 * Escapes user input before inserting it into LLM prompts.
 * Prevents injection attacks through quote escaping, delimiter manipulation,
 * and control character neutralization.
 *
 * This is defense-in-depth. The primary defense is using structured message
 * arrays (messages: [{role, content}]) rather than string concatenation.
 * This sanitizer handles cases where user input must appear inside a prompt string.
 */

const CONTROL_CHARS = /[\x00-\x08\x0b-\x0c\x0e-\x1f\x7f-\x9f]/g;

/**
 * Sanitize user input for safe inclusion in LLM prompts.
 *
 * Strategy:
 * 1. Remove control characters (null bytes, bells, etc.)
 * 2. Escape backslashes FIRST (prevents escaping our escapes)
 * 3. Escape quotes (double and single) and backticks
 * 4. Escape newlines/carriage returns/tabs
 * 5. Truncate to max length
 *
 * @param input - Raw user input
 * @param maxLength - Maximum allowed length (default: 2000)
 * @returns Sanitized string safe for prompt insertion
 */
export function sanitizePromptInput(input: string, maxLength: number = 2000): string {
  if (!input || typeof input !== 'string') {
    return '';
  }

  return (
    input
      // Remove control characters (keep newlines/tabs for now)
      .replace(CONTROL_CHARS, '')
      // Escape backslashes FIRST so they don't escape subsequent replacements
      .replace(/\\/g, '\\\\')
      // Escape double quotes
      .replace(/"/g, '\\"')
      // Escape single quotes
      .replace(/'/g, "\\'")
      // Escape backticks (used in markdown/code blocks)
      .replace(/`/g, '\\`')
      // Escape newlines to literal \n
      .replace(/\n/g, '\\n')
      // Escape carriage returns
      .replace(/\r/g, '\\r')
      // Escape tabs
      .replace(/\t/g, '\\t')
      // Hard length limit
      .slice(0, maxLength)
  );
}

/**
 * Sanitize with NO newlines preserved.
 * Use when the input must be a single line in the prompt.
 */
export function sanitizePromptInputSingleLine(input: string, maxLength: number = 500): string {
  return sanitizePromptInput(input.replace(/\n/g, ' '), maxLength);
}

/**
 * Validate that sanitized input doesn't contain known injection patterns.
 * Returns the input if clean, throws if injection detected.
 */
export function validateNoInjection(input: string): string {
  const injectionPatterns = [
    /ignore\s+(previous|all|prior)\s+instructions?/i,
    /forget\s+(everything|all|previous)/i,
    /you\s+are\s+now\s+/i,
    /system\s*:\s*/i,
    /\{\{.*system.*\}\}/i,
    /\[\s*system\s*\]/i,
    /new\s+role\s*:/i,
    /override\s+(instructions?|prompt)/i,
  ];

  for (const pattern of injectionPatterns) {
    if (pattern.test(input)) {
      // Log the specific pattern server-side only
      console.error('[PromptSanitizer] Injection pattern matched:', pattern.source);
      // Return generic error to client (don't leak pattern details)
      throw new Error('Invalid input: potentially harmful content detected.');
    }
  }

  return input;
}
