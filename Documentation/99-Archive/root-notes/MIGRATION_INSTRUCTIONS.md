-- Migration instructions for staging database:

-- Option 1: Use Drizzle CLI (after setting DATABASE_URL in .env.staging):
-- export $(grep -v '^#' .env.staging | xargs)
-- bunx drizzle-kit migrate

-- Option 2: Run SQL directly in Neon dashboard:
-- Copy and paste the SQL from drizzle/0000_flaky_rogue.sql

-- Option 3: Use the manual GDPR migration SQL from drizzle/migrations/0001_gdpr_compliance.sql

-- After migration, verify these tables exist:
-- - consents
-- - data_subject_requests  
-- - data_breach_logs

-- And these enums:
-- - consent_type
-- - request_type
-- - request_status
-- - consent_method
-- - breach_severity