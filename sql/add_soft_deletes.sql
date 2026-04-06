-- Soft delete columns for all critical tables
-- Adds deleted_at (timestamp) and deleted_by (discord_id of actor)
-- All existing rows remain unaffected (deleted_at defaults to NULL = not deleted)

ALTER TABLE snipe_logs ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;
ALTER TABLE snipe_logs ADD COLUMN IF NOT EXISTS deleted_by BIGINT DEFAULT NULL;
CREATE INDEX IF NOT EXISTS idx_snipe_logs_deleted ON snipe_logs(deleted_at) WHERE deleted_at IS NOT NULL;

ALTER TABLE blacklist ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;
ALTER TABLE blacklist ADD COLUMN IF NOT EXISTS deleted_by BIGINT DEFAULT NULL;
CREATE INDEX IF NOT EXISTS idx_blacklist_deleted ON blacklist(deleted_at) WHERE deleted_at IS NOT NULL;

ALTER TABLE kick_list ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;
ALTER TABLE kick_list ADD COLUMN IF NOT EXISTS deleted_by BIGINT DEFAULT NULL;
CREATE INDEX IF NOT EXISTS idx_kick_list_deleted ON kick_list(deleted_at) WHERE deleted_at IS NOT NULL;

ALTER TABLE tracker_tickets ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;
ALTER TABLE tracker_tickets ADD COLUMN IF NOT EXISTS deleted_by BIGINT DEFAULT NULL;
CREATE INDEX IF NOT EXISTS idx_tracker_tickets_deleted ON tracker_tickets(deleted_at) WHERE deleted_at IS NOT NULL;

ALTER TABLE dashboard_events ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;
ALTER TABLE dashboard_events ADD COLUMN IF NOT EXISTS deleted_by BIGINT DEFAULT NULL;
CREATE INDEX IF NOT EXISTS idx_dashboard_events_deleted ON dashboard_events(deleted_at) WHERE deleted_at IS NOT NULL;

ALTER TABLE dashboard_notes ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;
ALTER TABLE dashboard_notes ADD COLUMN IF NOT EXISTS deleted_by BIGINT DEFAULT NULL;
CREATE INDEX IF NOT EXISTS idx_dashboard_notes_deleted ON dashboard_notes(deleted_at) WHERE deleted_at IS NOT NULL;

ALTER TABLE build_definitions ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;
ALTER TABLE build_definitions ADD COLUMN IF NOT EXISTS deleted_by BIGINT DEFAULT NULL;
CREATE INDEX IF NOT EXISTS idx_build_definitions_deleted ON build_definitions(deleted_at) WHERE deleted_at IS NOT NULL;

ALTER TABLE graid_events ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;
ALTER TABLE graid_events ADD COLUMN IF NOT EXISTS deleted_by BIGINT DEFAULT NULL;
CREATE INDEX IF NOT EXISTS idx_graid_events_deleted ON graid_events(deleted_at) WHERE deleted_at IS NOT NULL;

ALTER TABLE agenda_bau_topics ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;
ALTER TABLE agenda_bau_topics ADD COLUMN IF NOT EXISTS deleted_by BIGINT DEFAULT NULL;
CREATE INDEX IF NOT EXISTS idx_agenda_bau_topics_deleted ON agenda_bau_topics(deleted_at) WHERE deleted_at IS NOT NULL;

ALTER TABLE agenda_requested_topics ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;
ALTER TABLE agenda_requested_topics ADD COLUMN IF NOT EXISTS deleted_by BIGINT DEFAULT NULL;
CREATE INDEX IF NOT EXISTS idx_agenda_requested_topics_deleted ON agenda_requested_topics(deleted_at) WHERE deleted_at IS NOT NULL;

ALTER TABLE promotion_queue ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;
ALTER TABLE promotion_queue ADD COLUMN IF NOT EXISTS deleted_by BIGINT DEFAULT NULL;
CREATE INDEX IF NOT EXISTS idx_promotion_queue_deleted ON promotion_queue(deleted_at) WHERE deleted_at IS NOT NULL;

ALTER TABLE promo_suggestions ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;
ALTER TABLE promo_suggestions ADD COLUMN IF NOT EXISTS deleted_by BIGINT DEFAULT NULL;
CREATE INDEX IF NOT EXISTS idx_promo_suggestions_deleted ON promo_suggestions(deleted_at) WHERE deleted_at IS NOT NULL;
