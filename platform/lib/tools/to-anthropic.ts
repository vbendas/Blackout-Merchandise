import { z } from 'zod';
import type Anthropic from '@anthropic-ai/sdk';
import type { Tool } from '@/lib/tools/types';

/**
 * Converts a tool's zod input schema into the strict JSON Schema the API
 * expects. Tool zod objects must be `.strict()` so `additionalProperties:
 * false` and `required` are already correct; this just drops the `$schema`
 * key zod adds (not part of Anthropic's input_schema) and guarantees
 * `required` is present even for schemas with no properties.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function toAnthropicTool(tool: Tool<any, any>): Anthropic.Tool {
  const raw = z.toJSONSchema(tool.input as z.ZodType) as Record<string, unknown>;
  delete raw.$schema;
  if (!('required' in raw)) raw.required = [];

  return {
    name: tool.name,
    description: tool.description,
    input_schema: raw as unknown as Anthropic.Tool.InputSchema,
    strict: true,
  };
}

/** Deterministic order matters for prompt-cache stability (see prompt-caching.md). */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function toAnthropicTools(tools: Tool<any, any>[]): Anthropic.Tool[] {
  return [...tools].sort((a, b) => a.name.localeCompare(b.name)).map(toAnthropicTool);
}
