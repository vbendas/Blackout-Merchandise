import { config } from 'dotenv';
import { defineConfig } from 'drizzle-kit';

config({ path: '.env.local', quiet: true });

// The platform app owns a fresh migration history against the clean
// `blackoutmerch_platform` database; the legacy /drizzle folder belongs to /app.
export default defineConfig({
  schema: '../src/db/schema.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: { url: process.env.DATABASE_URL! },
});
