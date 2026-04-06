-- Expand audit_log with structured data for comprehensive exec action tracking
-- Adds target context, old values for reconstruction, and IP tracking

ALTER TABLE audit_log ADD COLUMN IF NOT EXISTS target_table VARCHAR(50);
ALTER TABLE audit_log ADD COLUMN IF NOT EXISTS target_id TEXT;
ALTER TABLE audit_log ADD COLUMN IF NOT EXISTS http_method VARCHAR(10);
ALTER TABLE audit_log ADD COLUMN IF NOT EXISTS old_values JSONB;
ALTER TABLE audit_log ADD COLUMN IF NOT EXISTS ip_address VARCHAR(45);

CREATE INDEX IF NOT EXISTS idx_audit_log_target ON audit_log(target_table, target_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_actor ON audit_log(actor_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_created ON audit_log(created_at);
