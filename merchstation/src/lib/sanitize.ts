/**
 * Lightweight text sanitizer for TUI input fields.
 * Strips dangerous HTML patterns to prevent stored XSS if data
 * is later rendered by web applications.
 *
 * Defense-in-depth: web apps should still escape on render.
 */

const DANGEROUS_TAGS = /<\/?(?:script|iframe|object|embed|form|link|meta|style|base|svg|math|details|marquee|applet|bgsound|body|head|html|title|xml)[^>]*>/gi;
const EVENT_HANDLERS = /\bon(?:click|load|error|mouseover|mouseout|mouseenter|mouseleave|keydown|keyup|keypress|submit|change|focus|blur|input|abort|beforeunload|hashchange|message|offline|online|pagehide|pageshow|popstate|resize|scroll|storage|unload|animationstart|animationend|animationiteration|transitionend|dblclick|contextmenu|drag|dragend|dragenter|dragleave|dragover|dragstart|drop|wheel|copy|cut|paste|touchstart|touchmove|touchend|touchcancel)\s*=/gi;
const JAVASCRIPT_URI = /javascript\s*:/gi;
const DATA_URI = /data\s*:/gi;
const VBSCRIPT_URI = /vbscript\s*:/gi;

/**
 * Sanitize a text string by removing dangerous HTML patterns.
 * Returns the cleaned string, or null if the input is null/undefined.
 */
export function sanitizeText(input: string | null | undefined): string | null {
  if (input == null) return null;
  if (typeof input !== 'string') return String(input);

  let result = input;

  // Remove dangerous HTML tags entirely
  result = result.replace(DANGEROUS_TAGS, '');

  // Remove event handler attributes
  result = result.replace(EVENT_HANDLERS, '');

  // Neutralize dangerous URI schemes
  result = result.replace(JAVASCRIPT_URI, 'blocked:');
  result = result.replace(VBSCRIPT_URI, 'blocked:');
  // data: URIs are kept (used for legitimate images) but flagged in logs if present

  return result;
}

/**
 * Sanitize an object's string properties recursively.
 * Useful for sanitizing form payloads before DB write.
 */
export function sanitizeObject<T extends Record<string, unknown>>(obj: T): T {
  const result = { ...obj } as T;
  for (const key of Object.keys(result)) {
    const value = result[key];
    if (typeof value === 'string') {
      (result as Record<string, unknown>)[key] = sanitizeText(value);
    } else if (value && typeof value === 'object' && !Array.isArray(value)) {
      (result as Record<string, unknown>)[key] = sanitizeObject(value as Record<string, unknown>);
    }
  }
  return result;
}
