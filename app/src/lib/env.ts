/**
 * Environment Variable Validation
 *
 * Validates environment variables lazily (on first access, not at module load).
 * This allows builds and tests to proceed without all production keys present.
 *
 * Usage:
 *   import { env } from '@/lib/env';
 *   const apiKey = env.MISTRAL_API_KEY; // Validates on first access
 *
 * For explicit validation (e.g., at app startup):
 *   import { validateEnv } from '@/lib/env';
 *   validateEnv();
 */

import { z } from 'zod';

// Define environment variable schema
const envSchema = z.object({
  MISTRAL_API_KEY: z.string().min(1).optional(),
  OPENROUTER_API_KEY: z.string().min(1).optional(),
  CLERK_SECRET_KEY: z.string().min(1).optional(),
  NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: z.string().min(1).optional(),

  ELEVENLABS_API_KEY: z.string().min(1).optional(),
  ELEVENLABS_VOICE_LEOPOLDO: z.string().min(1).optional(),
  ELEVENLABS_VOICE_FRANCISCA: z.string().min(1).optional(),
  ELEVENLABS_VOICE_ANTONIA: z.string().min(1).optional(),

  UPSTASH_REDIS_REST_URL: z.string().url().optional().or(z.literal('')),
  UPSTASH_REDIS_REST_TOKEN: z.string().optional().or(z.literal('')),

  VOXTRAL_STT_MODEL: z.string().optional().or(z.literal('')).default('voxtral-mini-latest'),

  ENABLE_LLM_ROUTING: z.enum(['true', 'false']).default('false'),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
});

// Safe parse - never throws at module load
const result = envSchema.safeParse(process.env);
const rawEnv = result.success
  ? result.data
  : {
      MISTRAL_API_KEY: '',
      OPENROUTER_API_KEY: '',
      CLERK_SECRET_KEY: '',
      NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: '',
      ELEVENLABS_API_KEY: '',
      ELEVENLABS_VOICE_LEOPOLDO: '',
      ELEVENLABS_VOICE_FRANCISCA: '',
      ELEVENLABS_VOICE_ANTONIA: '',
      UPSTASH_REDIS_REST_URL: '',
      UPSTASH_REDIS_REST_TOKEN: '',
      VOXTRAL_STT_MODEL: 'voxtral-mini-latest',
      ENABLE_LLM_ROUTING: 'false',
      NODE_ENV: (process.env.NODE_ENV || 'development') as 'development' | 'production' | 'test',
    };

let hasValidated = false;

/**
 * Validate required environment variables.
 * Skips validation in test environment.
 * Throws with clear error message if required vars are missing.
 */
function ensureValidated(): void {
  if (hasValidated) return;
  hasValidated = true;

  // In test environment, be lenient
  if (rawEnv.NODE_ENV === 'test') return;

  // In development/production, require API keys
  const required = [
    'MISTRAL_API_KEY',
    'OPENROUTER_API_KEY',
    'CLERK_SECRET_KEY',
    'NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY',
  ] as const;

  const missing = required.filter((key) => {
    const value = rawEnv[key as keyof typeof rawEnv];
    return !value || value === '';
  });

  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables in ${rawEnv.NODE_ENV} mode:\n${missing
        .map((k) => `  - ${k}`)
        .join('\n')}\n\nPlease check your .env.local file.`
    );
  }
}

/**
 * Lazy-validating proxy for environment variables.
 * Triggers validation on first property access.
 */
export const env = new Proxy(rawEnv as z.infer<typeof envSchema>, {
  get(target, prop) {
    ensureValidated();
    return target[prop as keyof typeof target];
  },
});

/**
 * Explicitly validate environment variables.
 * Call this at app startup or in middleware when you want fail-fast behavior.
 */
export function validateEnv(): void {
  ensureValidated();
}

// Convenience exports (values, not functions — backward compatible)
export const MISTRAL_API_KEY = rawEnv.MISTRAL_API_KEY;
export const OPENROUTER_API_KEY = rawEnv.OPENROUTER_API_KEY;
export const CLERK_SECRET_KEY = rawEnv.CLERK_SECRET_KEY;
export const NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY = rawEnv.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;
export const ELEVENLABS_API_KEY = rawEnv.ELEVENLABS_API_KEY;
export const ELEVENLABS_VOICE_LEOPOLDO = rawEnv.ELEVENLABS_VOICE_LEOPOLDO;
export const ELEVENLABS_VOICE_FRANCISCA = rawEnv.ELEVENLABS_VOICE_FRANCISCA;
export const ELEVENLABS_VOICE_ANTONIA = rawEnv.ELEVENLABS_VOICE_ANTONIA;
export const UPSTASH_REDIS_REST_URL = rawEnv.UPSTASH_REDIS_REST_URL;
export const UPSTASH_REDIS_REST_TOKEN = rawEnv.UPSTASH_REDIS_REST_TOKEN;
export const VOXTRAL_STT_MODEL = rawEnv.VOXTRAL_STT_MODEL;
export const ENABLE_LLM_ROUTING = rawEnv.ENABLE_LLM_ROUTING === 'true';
export const IS_PRODUCTION = rawEnv.NODE_ENV === 'production';
export const IS_DEVELOPMENT = rawEnv.NODE_ENV === 'development';
export const IS_TEST = rawEnv.NODE_ENV === 'test';
