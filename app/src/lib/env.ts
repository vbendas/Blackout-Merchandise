/**
 * Environment Variable Validation
 *
 * Validates all required environment variables at application startup.
 * Fails fast with clear error messages if any required variable is missing.
 *
 * This is imported at the top of middleware.ts to ensure validation runs
 * before any routes are served.
 */

import { z } from 'zod';

// Define required and optional environment variables
const envSchema = z.object({
  // ─── Required ─────────────────────────────────────────────────────────────
  MISTRAL_API_KEY: z.string().min(1, 'MISTRAL_API_KEY is required for AI chat'),
  OPENROUTER_API_KEY: z.string().min(1, 'OPENROUTER_API_KEY is required for intent classification'),
  CLERK_SECRET_KEY: z.string().min(1, 'CLERK_SECRET_KEY is required for authentication'),
  NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: z.string().min(1, 'NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY is required'),

  // ─── Optional (with defaults) ─────────────────────────────────────────────
  UPSTASH_REDIS_REST_URL: z.string().url().optional().or(z.literal('')),
  UPSTASH_REDIS_REST_TOKEN: z.string().optional().or(z.literal('')),

  // ─── Optional (feature flags) ─────────────────────────────────────────────
  ENABLE_LLM_ROUTING: z.enum(['true', 'false']).default('false'),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
});

// Parse and validate
let env: z.infer<typeof envSchema>;

try {
  env = envSchema.parse(process.env);
} catch (error) {
  if (error instanceof z.ZodError) {
    const issues = error.issues.map((i) => `  - ${i.path.join('.')}: ${i.message}`).join('\n');
    throw new Error(`Environment validation failed:\n${issues}\n\nPlease check your .env.local file.`);
  }
  throw error;
}

// Export typed env
export { env };

// Re-export specific values for convenience
export const MISTRAL_API_KEY = env.MISTRAL_API_KEY;
export const OPENROUTER_API_KEY = env.OPENROUTER_API_KEY;
export const CLERK_SECRET_KEY = env.CLERK_SECRET_KEY;
export const NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY = env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;
export const UPSTASH_REDIS_REST_URL = env.UPSTASH_REDIS_REST_URL;
export const UPSTASH_REDIS_REST_TOKEN = env.UPSTASH_REDIS_REST_TOKEN;
export const ENABLE_LLM_ROUTING = env.ENABLE_LLM_ROUTING === 'true';
export const IS_PRODUCTION = env.NODE_ENV === 'production';
export const IS_DEVELOPMENT = env.NODE_ENV === 'development';
