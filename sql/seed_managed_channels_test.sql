-- Test-mode (dev guild 1369134564450107412) seed for managed_channels.
-- Run this INSTEAD of the prod seed in create_managed_messages_tables.sql
-- when setting up a fresh dev database. Safe to re-run.

INSERT INTO managed_channels (channel_id, guild_id, label) VALUES
    (1369134566295732334, 1369134564450107412, 'FAQ'),
    (1369134566295732333, 1369134564450107412, 'Rank Up'),
    (1369134566295732335, 1369134564450107412, 'TAQ Roles')
ON CONFLICT (channel_id) DO UPDATE SET
    guild_id = EXCLUDED.guild_id,
    label    = EXCLUDED.label;
