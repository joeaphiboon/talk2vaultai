import type { IncomingMessage } from 'http';
import { Pool, PoolClient, QueryResult } from 'pg';

// Database module inlined to avoid import issues
let pool: Pool | null = null;

function getConnectionString(): string {
  const raw = process.env.POSTGRES_URL || process.env.DATABASE_URL || '';
  if (!raw) return '';
  try {
    const u = new URL(raw);
    if (!u.searchParams.has('sslmode')) u.searchParams.set('sslmode', 'require');
    return u.toString();
  } catch {
    return raw.includes('sslmode=') ? raw : raw + (raw.includes('?') ? '&' : '?') + 'sslmode=require';
  }
}

function getPool(): Pool {
  if (pool) return pool;
  const connectionString = getConnectionString();
  if (!connectionString) throw new Error('Database URL missing');
  console.log('Creating DB pool with connection string (redacted):', connectionString.replace(/:\/\/([^:]+):([^@]+)@/, '://***:***@'));
  pool = new Pool({ connectionString });
  return pool;
}

async function sql(strings: TemplateStringsArray, ...values: any[]): Promise<QueryResult<any>> {
  const textParts: string[] = [];
  const params: any[] = [];
  strings.forEach((s, i) => {
    textParts.push(s);
    if (i < values.length) {
      params.push(values[i]);
      textParts.push(`$${params.length}`);
    }
  });
  const text = textParts.join('');
  console.log('Attempting DB connection and query');
  const client: PoolClient = await getPool().connect();
  try {
    return await client.query(text, params);
  } finally {
    client.release();
  }
}

export const config = { runtime: 'nodejs20.x' } as const;

const RATE_LIMIT_PER_MINUTE = parseInt(process.env.RATE_LIMIT_PER_MINUTE || '100', 10);
const FREE_QUOTA_WINDOW_MINUTES = parseInt(process.env.FREE_QUOTA_WINDOW_MINUTES || '0', 10);
const FREE_QUOTA_TOTAL = parseInt(process.env.FREE_QUOTA_TOTAL || '30', 10);
const GUEST_COOKIE_NAME = 'guest_id';

const RAW_DB_URL = process.env.POSTGRES_URL || process.env.DATABASE_URL || '';
function ensureSslmode(url: string) {
  try {
    const u = new URL(url);
    u.searchParams.set('sslmode', 'disable');
    return u.toString();
  } catch {
    if (!url) return url;
    return url.replace(/sslmode=[^&]*/, 'sslmode=disable') || url + (url.includes('?') ? '&' : '?') + 'sslmode=disable';
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
    await sql`
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

let schemaEnsured = false;
async function ensureSchema() {
  if (schemaEnsured) return;
  await sql`
    CREATE TABLE IF NOT EXISTS "GuestUsage" (
      guest_id TEXT PRIMARY KEY,
      requests_made INTEGER NOT NULL,
      first_request_at TIMESTAMPTZ NOT NULL,
      last_request_at TIMESTAMPTZ NOT NULL
    );
  `;
  schemaEnsured = true;
}

export default async function handler(req: any, res: any) {
  try {
    if (req.method !== 'GET') return res.status(405).json({ message: 'Method Not Allowed' });

    if (!DB_URL && !process.env.POSTGRES_URL) {
      return res.status(503).json({ message: 'Database not configured' });
    }

    await ensureRateLimiterSchema();
    await ensureSchema();

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
      const rlQuery = await sql`
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
    } catch (e: any) {
      console.error('usage rate limit query error', {
        message: e.message,
        stack: e.stack,
        details: e,
      });
      rlRemaining = capacity;
    }

    // quota
    if (FREE_QUOTA_WINDOW_MINUTES > 0) {
      console.log('Reading window quota for guestId:', guestId);
      try {
        const q = await sql`
          SELECT first_request_at
          FROM "GuestUsage"
          WHERE guest_id = ${guestId};
        `;
        const first = q.rows[0]?.first_request_at as string | undefined;
        let windowRemainingSeconds: number | undefined = undefined;
        if (first) {
          const r = await sql`
            SELECT GREATEST(0, EXTRACT(EPOCH FROM ((${FREE_QUOTA_WINDOW_MINUTES}::INT || ' minutes')::INTERVAL - (NOW() - ${first}::timestamptz))))::INT AS remain;
          `;
          windowRemainingSeconds = (r.rows[0] as any)?.remain ?? 0;
        }
        return res.status(200).json({
          rateLimit: { limit: RATE_LIMIT_PER_MINUTE, remaining: rlRemaining },
          quota: { type: 'guest', mode: 'window', windowMinutes: FREE_QUOTA_WINDOW_MINUTES, windowRemainingSeconds }
        });
      } catch (e: any) {
        console.error('usage window quota read error', {
          message: e.message,
          stack: e.stack,
          details: e,
        });
        return res.status(200).json({
          rateLimit: { limit: RATE_LIMIT_PER_MINUTE, remaining: rlRemaining },
          quota: { type: 'guest', mode: 'window', windowMinutes: FREE_QUOTA_WINDOW_MINUTES, windowRemainingSeconds: undefined },
          warning: 'window quota read error',
          detail: e?.message || String(e)
        });
      }
    }

    console.log('Reading count quota for guestId:', guestId);
    try {
      const q2 = await sql`
        SELECT requests_made FROM "GuestUsage" WHERE guest_id = ${guestId};
      `;
      const used = (q2.rows[0]?.requests_made as number) || 0;
      const remaining = Math.max(0, FREE_QUOTA_TOTAL - used);
      return res.status(200).json({
        rateLimit: { limit: RATE_LIMIT_PER_MINUTE, remaining: rlRemaining },
        quota: { type: 'guest', mode: 'count', total: FREE_QUOTA_TOTAL, used, remaining }
      });
    } catch (e: any) {
      console.error('usage count quota read error', {
        message: e.message,
        stack: e.stack,
        details: e,
      });
      return res.status(200).json({
        rateLimit: { limit: RATE_LIMIT_PER_MINUTE, remaining: rlRemaining },
        quota: { type: 'guest', mode: 'count', total: FREE_QUOTA_TOTAL, used: 0, remaining: FREE_QUOTA_TOTAL },
        warning: 'quota read error',
        detail: e?.message || String(e)
      });
    }
  } catch (e: any) {
    console.error('usage handler fatal', e);
    return res.status(500).json({ message: 'Usage endpoint error', detail: e?.message || String(e) });
  }
}
