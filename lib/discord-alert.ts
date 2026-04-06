/**
 * Send an alert to a Discord channel, pinging the configured user.
 * Used for security-critical events like rate limit violations on destructive operations.
 *
 * Requires env vars:
 *   DISCORD_ALERT_CHANNEL_ID / TEST_DISCORD_ALERT_CHANNEL_ID — channel to post in
 *   DISCORD_ALERT_PING_ID / TEST_DISCORD_ALERT_PING_ID — user ID to ping
 *   DISCORD_BOT_TOKEN / TEST_DISCORD_BOT_TOKEN — bot auth
 */

function isTestMode(): boolean {
  const v = process.env.TEST_MODE;
  if (!v) return false;
  const s = v.toLowerCase().trim();
  return s === '1' || s === 'true' || s === 'yes' || s === 'on';
}

function pick(prod: string, test: string): string | undefined {
  return isTestMode() ? process.env[test] : process.env[prod];
}

// Deduplication: track recent alerts so we don't spam the same message
const recentAlerts = new Map<string, number>();
const DEDUP_WINDOW = 60_000; // 1 minute

export async function sendSecurityAlert(message: string): Promise<void> {
  // Deduplicate — don't send the same alert within 1 minute
  const now = Date.now();
  const lastSent = recentAlerts.get(message);
  if (lastSent && now - lastSent < DEDUP_WINDOW) return;
  recentAlerts.set(message, now);

  // Clean old entries
  for (const [key, ts] of recentAlerts) {
    if (now - ts > DEDUP_WINDOW) recentAlerts.delete(key);
  }

  const botToken = pick('DISCORD_BOT_TOKEN', 'TEST_DISCORD_BOT_TOKEN');
  const channelId = pick('DISCORD_ALERT_CHANNEL_ID', 'TEST_DISCORD_ALERT_CHANNEL_ID');
  const pingId = pick('DISCORD_ALERT_PING_ID', 'TEST_DISCORD_ALERT_PING_ID');

  if (!botToken || !channelId) {
    console.error('Discord alert not configured (missing DISCORD_ALERT_CHANNEL_ID or DISCORD_BOT_TOKEN)');
    return;
  }

  const userPing = pingId ? `<@${pingId}> ` : '';
  const content = `${userPing}${message}`;

  try {
    const res = await fetch(`https://discord.com/api/v10/channels/${channelId}/messages`, {
      method: 'POST',
      headers: {
        Authorization: `Bot ${botToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ content }),
    });

    if (!res.ok) {
      const errBody = await res.text();
      console.error('Discord alert failed:', res.status, errBody);
    }
  } catch (err) {
    console.error('Discord alert error:', err);
  }
}
