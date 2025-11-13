import type { IncomingMessage } from 'http';
import { sql } from '../../lib/db';

const RATE_LIMIT_PER_MINUTE = parseInt(process.env.RATE_LIMIT_PER_MINUTE || '5', 10);
const FREE_QUOTA_WINDOW_MINUTES = parseInt(process.env.FREE_QUOTA_WINDOW_MINUTES || '0', 10);
const FREE_QUOTA_TOTAL = parseInt(process.env.FREE_QUOTA_TOTAL || '30', 10);
const GUEST_COOKIE_NAME = 'guest_id';

const RAW_DB_URL = process.env.POSTGRES_URL || process.env.DATABASE_URL || '';
function ensureSslmode(url: string) {
  try {
    const u = new URL(url);
    if (!u.searchParams.has('sslmode')) u.searchParams.set('sslmode', 'require');
    return u.toString();
  } catch {
    if (!url) return url;
    return url.includes('sslmode=') ? url : url + (url.includes('?') ? '&' : '?') + 'sslmode=require';
  }
}
const DB_URL = RAW_DB_URL ? ensureSslmode(RAW_DB_URL) : '';

function parseCookies(req: IncomingMessage): Record<string, string> {
  const header = req.headers['cookie'];
  const out: Record<string, string> = {};
  if (!header) return out;
  for (const part of header.split(';')) {
    const [k, v] = part.split('=');
    if (!k) continue;
    out[k.trim()] = decodeURIComponent((v || '').trim());
  }
  return out;
}

function getClientIp(req: IncomingMessage): string {
  const xf = (req.headers['x-forwarded-for'] || '') as string;
  const ip = xf.split(',')[0].trim() || (req.socket as any)?.remoteAddress || 'unknown';
  return ip;
}

let rlSchemaEnsured = false;
async function ensureRateLimiterSchema() {
  if (rlSchemaEnsured) return;
  try {
    await db`
      CREATE TABLE IF NOT EXISTS rate_limiter_buckets (
        key TEXT PRIMARY KEY,
        tokens DOUBLE PRECISION NOT NULL,
        last_refill TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        capacity INTEGER NOT NULL,
        refill_rate DOUBLE PRECISION NOT NULL
      );
    `;
  } catch (e) {
    // ignore; selection below will handle absence
  }
  rlSchemaEnsured = true;
}

export default async function handler(req: any, res: any) {
  if (req.method !== 'GET') return res.status(405).json({ message: 'Method Not Allowed' });

  if (!DB_URL && !process.env.POSTGRES_URL) {
    return res.status(503).json({ message: 'Database not configured' });
  }

  await ensureRateLimiterSchema();

  // identify
  const cookies = parseCookies(req);
  const guestId = cookies[GUEST_COOKIE_NAME] || 'unknown';
  const ip = getClientIp(req);
  const rlKey = `g:${guestId}:ip:${ip}`;

  // token-bucket remaining (does not consume)
  const capacity = RATE_LIMIT_PER_MINUTE;
  const refill = capacity / 60;
  let rlRemaining = capacity;
  try {
    const rlQuery = await db`
      SELECT
        CASE WHEN rb.key IS NULL THEN ${capacity}::int
             ELSE FLOOR(LEAST(rb.capacity::float8, rb.tokens + EXTRACT(EPOCH FROM (NOW() - rb.last_refill)) * rb.refill_rate))::int
        END AS remaining,
        ${capacity}::int AS limit
      FROM rate_limiter_buckets rb
      WHERE rb.key = ${rlKey}
    `;
    const rlRow = rlQuery.rows[0] as { remaining?: number; limit: number } | undefined;
    rlRemaining = rlRow?.remaining ?? capacity;
  } catch {
    // table might not exist yet; default full capacity
    rlRemaining = capacity;
  }

  // quota
  if (FREE_QUOTA_WINDOW_MINUTES > 0) {
    try {
      const q = await db`
        SELECT first_request_at
        FROM "GuestUsage"
        WHERE guest_id = ${guestId};
      `;
      const first = q.rows[0]?.first_request_at as string | undefined;
      let windowRemainingSeconds: number | undefined = undefined;
      if (first) {
        const r = await db`
          SELECT GREATEST(0, EXTRACT(EPOCH FROM ((${FREE_QUOTA_WINDOW_MINUTES}::INT || ' minutes')::INTERVAL - (NOW() - ${first}::timestamptz))))::INT AS remain;
        `;
        windowRemainingSeconds = (r.rows[0] as any)?.remain ?? 0;
      }
      return res.status(200).json({
        rateLimit: { limit: RATE_LIMIT_PER_MINUTE, remaining: rlRemaining },
        quota: { type: 'guest', mode: 'window', windowMinutes: FREE_QUOTA_WINDOW_MINUTES, windowRemainingSeconds }
      });
    } catch {
      return res.status(200).json({
        rateLimit: { limit: RATE_LIMIT_PER_MINUTE, remaining: rlRemaining },
        quota: { type: 'guest', mode: 'window', windowMinutes: FREE_QUOTA_WINDOW_MINUTES, windowRemainingSeconds: undefined }
      });
    }
  }

  try {
    const q2 = await db`
      SELECT requests_made FROM "GuestUsage" WHERE guest_id = ${guestId};
    `;
    const used = (q2.rows[0]?.requests_made as number) || 0;
    const remaining = Math.max(0, FREE_QUOTA_TOTAL - used);
    return res.status(200).json({
      rateLimit: { limit: RATE_LIMIT_PER_MINUTE, remaining: rlRemaining },
      quota: { type: 'guest', mode: 'count', total: FREE_QUOTA_TOTAL, used, remaining }
    });
  } catch {
    return res.status(200).json({
      rateLimit: { limit: RATE_LIMIT_PER_MINUTE, remaining: rlRemaining },
      quota: { type: 'guest', mode: 'count', total: FREE_QUOTA_TOTAL, used: 0, remaining: FREE_QUOTA_TOTAL }
    });
  }
}
