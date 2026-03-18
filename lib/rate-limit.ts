import { getServerConfig } from "@/lib/config";
import { getDb, writeLog } from "@/lib/db";

export function checkRateLimit(ipAddress: string) {
  const db = getDb();
  const config = getServerConfig();
  const now = new Date();
  const windowMs = config.rateLimitWindowMinutes * 60 * 1000;
  const current = db
    .prepare("SELECT ip, window_started_at, count FROM rate_limits WHERE ip = ?")
    .get(ipAddress) as { ip: string; window_started_at: string; count: number } | undefined;

  if (!current) {
    db.prepare("INSERT INTO rate_limits (ip, window_started_at, count) VALUES (?, ?, 1)").run(ipAddress, now.toISOString());
    return { allowed: true, retryAfterSeconds: 0 };
  }

  const windowStarted = new Date(current.window_started_at);
  if (now.getTime() - windowStarted.getTime() > windowMs) {
    db.prepare("UPDATE rate_limits SET window_started_at = ?, count = 1 WHERE ip = ?").run(now.toISOString(), ipAddress);
    return { allowed: true, retryAfterSeconds: 0 };
  }

  if (current.count >= config.rateLimitMaxSubmissions) {
    const retryAfterSeconds = Math.max(1, Math.ceil((windowMs - (now.getTime() - windowStarted.getTime())) / 1000));
    writeLog("warn", "Rate limit blocked submission.", undefined, { ipAddress, retryAfterSeconds });
    return { allowed: false, retryAfterSeconds };
  }

  db.prepare("UPDATE rate_limits SET count = count + 1 WHERE ip = ?").run(ipAddress);
  return { allowed: true, retryAfterSeconds: 0 };
}
