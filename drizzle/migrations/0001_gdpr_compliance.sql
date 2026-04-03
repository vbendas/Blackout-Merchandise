-- GDPR Compliance Migration
-- Creates tables for consent management, data subject requests, and breach logging

-- Consents Table
CREATE TABLE IF NOT EXISTS consents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    consent_type TEXT NOT NULL CHECK (consent_type IN ('essential', 'analytics', 'marketing')),
    granted BOOLEAN NOT NULL,
    granted_at TIMESTAMP,
    withdrawn_at TIMESTAMP,
    ip_address TEXT,
    user_agent TEXT,
    consent_version TEXT NOT NULL DEFAULT '1.0',
    method TEXT NOT NULL CHECK (method IN ('explicit_opt_in', 'implicit', 'withdrawn')),
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Data Subject Requests Table
CREATE TABLE IF NOT EXISTS data_subject_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    request_type TEXT NOT NULL CHECK (request_type IN ('access', 'deletion', 'portability')),
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'rejected')),
    requested_at TIMESTAMP NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMP,
    notes TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Data Breach Logs Table
CREATE TABLE IF NOT EXISTS data_breach_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    severity TEXT NOT NULL CHECK (severity IN ('low', 'medium', 'high')),
    affected_count INTEGER NOT NULL,
    data_types TEXT NOT NULL,
    description TEXT NOT NULL,
    notified_at TIMESTAMP,
    resolved_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_consents_user_id ON consents(user_id);
CREATE INDEX IF NOT EXISTS idx_consents_consent_type ON consents(consent_type);
CREATE INDEX IF NOT EXISTS idx_consents_granted_at ON consents(granted_at);

CREATE INDEX IF NOT EXISTS idx_data_subject_requests_user_id ON data_subject_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_data_subject_requests_status ON data_subject_requests(status);
CREATE INDEX IF NOT EXISTS idx_data_subject_requests_requested_at ON data_subject_requests(requested_at);

CREATE INDEX IF NOT EXISTS idx_data_breach_logs_severity ON data_breach_logs(severity);
CREATE INDEX IF NOT EXISTS idx_data_breach_logs_created_at ON data_breach_logs(created_at);

-- Table comments for documentation
COMMENT ON TABLE consents IS 'Stores user consent records for GDPR compliance including consent type, timestamp, and proof of consent';
COMMENT ON TABLE data_subject_requests IS 'Tracks GDPR data subject requests (access, deletion, portability) and their processing status';
COMMENT ON TABLE data_breach_logs IS 'Records data breach incidents for GDPR reporting requirements';

-- Column comments for clarity
COMMENT ON COLUMN consents.ip_address IS 'IP address at time of consent for proof of consent';
COMMENT ON COLUMN consents.user_agent IS 'Browser/user agent string at time of consent';
COMMENT ON COLUMN consents.consent_version IS 'Version of consent policy/privacy notice';
COMMENT ON COLUMN data_breach_logs.data_types IS 'JSON array of affected data types (e.g., ["email", "name", "orders"])';
COMMENT ON COLUMN data_subject_requests.notes IS 'Admin notes about request processing or rejection reasons';