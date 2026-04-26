-- Managed channels/messages for the in-house Discord embed editor.
-- Replaces external Discohook usage for FAQ, Rank Up, and TAQ Roles channels.

CREATE TABLE IF NOT EXISTS managed_channels (
    id          SERIAL       PRIMARY KEY,
    channel_id  BIGINT       NOT NULL UNIQUE,
    guild_id    BIGINT       NOT NULL,
    label       TEXT         NOT NULL,
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS managed_messages (
    id              SERIAL       PRIMARY KEY,
    channel_id      BIGINT       NOT NULL REFERENCES managed_channels(channel_id) ON DELETE CASCADE,
    message_id      BIGINT       UNIQUE,
    position        INT          NOT NULL DEFAULT 0,
    content         TEXT,
    embeds          JSONB        NOT NULL DEFAULT '[]'::jsonb,
    attachments     JSONB        NOT NULL DEFAULT '[]'::jsonb,
    dirty           BOOLEAN      NOT NULL DEFAULT FALSE,
    is_new          BOOLEAN      NOT NULL DEFAULT FALSE,
    pending_delete  BOOLEAN      NOT NULL DEFAULT FALSE,
    last_synced_at  TIMESTAMPTZ,
    updated_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_by      TEXT
);

CREATE INDEX IF NOT EXISTS idx_managed_messages_dirty
    ON managed_messages (dirty) WHERE dirty = TRUE;

CREATE INDEX IF NOT EXISTS idx_managed_messages_channel
    ON managed_messages (channel_id, position);

-- Seed the 3 production channels currently managed via Discohook.
-- For test/dev databases, run `seed_managed_channels_test.sql` afterwards
-- (or instead) to swap in the test-mode channel IDs.
INSERT INTO managed_channels (channel_id, guild_id, label) VALUES
    (1386413126697877626, 729147655875199017, 'FAQ'),
    (1220853844364234802, 729147655875199017, 'Rank Up'),
    (752917987853467669,  729147655875199017, 'TAQ Roles')
ON CONFLICT (channel_id) DO NOTHING;
