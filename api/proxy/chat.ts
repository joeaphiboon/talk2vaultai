import { GoogleGenerativeAI } from '@google/generative-ai';
import type { IncomingMessage, ServerResponse } from 'http';
import { sql } from '../../lib/db';
import crypto from 'crypto';

export const config = { runtime: 'nodejs20.x' } as const;

// Environment
const AI_API_KEY = process.env.AI_API_KEY as string;
const RATE_LIMIT_PER_MINUTE = parseInt(process.env.RATE_LIMIT_PER_MINUTE || '5', 10); // default 5/min
// Quota mode: set FREE_QUOTA_WINDOW_MINUTES > 0 for time-window access. Otherwise use FREE_QUOTA_TOTAL.
const FREE_QUOTA_WINDOW_MINUTES = parseInt(process.env.FREE_QUOTA_WINDOW_MINUTES || '0', 10); // e.g., 10
const FREE_QUOTA_TOTAL = parseInt(process.env.FREE_QUOTA_TOTAL || '30', 10); // e.g., 30 total
const GUEST_COOKIE_NAME = 'guest_id';

// Prefer POSTGRES_URL if present (Vercel), otherwise fall back to DATABASE_URL (e.g., Supabase)
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

// Ensure schema exists once per cold start
let schemaEnsured = false;
async function ensureSchema() {
  if (schemaEnsured) return;
  await sql`
    CREATE TABLE IF NOT EXISTS rate_limiter_buckets (
      key TEXT PRIMARY KEY,
      tokens DOUBLE PRECISION NOT NULL,
      last_refill TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      capacity INTEGER NOT NULL,
      refill_rate DOUBLE PRECISION NOT NULL -- tokens per second
    );
  `;
  // Note: Guest quota uses your existing "GuestUsage" table
  schemaEnsured = true;
}

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

function newGuestId(): string {
  return crypto.randomUUID();
}

function setGuestCookie(res: ServerResponse, value: string) {
  const maxAge = 60 * 60 * 24 * 365; // 1 year
  const cookie = `${GUEST_COOKIE_NAME}=${encodeURIComponent(value)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}` + (process.env.NODE_ENV === 'production' ? '; Secure' : '');
  res.setHeader('Set-Cookie', cookie);
}

function getClientIp(req: IncomingMessage): string {
  const xf = (req.headers['x-forwarded-for'] || '') as string;
  const ip = xf.split(',')[0].trim() || (req.socket as any)?.remoteAddress || 'unknown';
  return ip;
}

async function enforceRateLimit(key: string) {
  const capacity = RATE_LIMIT_PER_MINUTE; // max tokens
  const refill = capacity / 60; // tokens per second
  const result = await sql`
    WITH params AS (
      SELECT ${key}::text AS k, ${capacity}::int AS cap, ${refill}::float8 AS rf
    ), upsert AS (
      INSERT INTO rate_limiter_buckets (key, tokens, last_refill, capacity, refill_rate)
      SELECT k, cap::float8, NOW(), cap, rf FROM params
      ON CONFLICT (key) DO UPDATE
        SET tokens = LEAST(rate_limiter_buckets.capacity::float8,
                           rate_limiter_buckets.tokens + EXTRACT(EPOCH FROM (NOW() - rate_limiter_buckets.last_refill)) * rate_limiter_buckets.refill_rate),
            last_refill = NOW(),
            capacity = EXCLUDED.capacity,
            refill_rate = EXCLUDED.refill_rate
      RETURNING key, tokens, capacity, refill_rate
    ), consume AS (
      UPDATE rate_limiter_buckets r
      SET tokens = r.tokens - 1
      FROM upsert u
      WHERE r.key = u.key AND u.tokens >= 1
      RETURNING r.tokens, r.capacity, r.refill_rate, TRUE AS allowed
    ), state AS (
      SELECT * FROM consume
      UNION ALL
      SELECT u.tokens, u.capacity, u.refill_rate, FALSE AS allowed FROM upsert u WHERE NOT EXISTS (SELECT 1 FROM consume)
    )
    SELECT tokens, capacity, refill_rate, allowed,
           CASE WHEN allowed THEN 0
                ELSE CEIL(GREATEST(0, (1 - tokens) / refill_rate))::int END AS retry_after
    FROM state;
  `;
  const row = result.rows[0] as { tokens: number; capacity: number; refill_rate: number; allowed: boolean; retry_after: number };
  const remaining = Math.max(0, Math.floor(row.tokens));
  const retryAfter = row.retry_after || 0;
  const allowed = !!row.allowed;
  return { allowed, remaining, retryAfter, limit: capacity };
}

async function enforceGuestQuota(guestId: string) {
  if (FREE_QUOTA_WINDOW_MINUTES > 0) {
    // Time window: use your GuestUsage(first_request_at) as the session start
    const result = await sql`
      INSERT INTO "GuestUsage" (guest_id, requests_made, first_request_at, last_request_at)
      VALUES (${guestId}, 1, NOW(), NOW())
      ON CONFLICT (guest_id)
      DO UPDATE SET
        requests_made = CASE WHEN NOW() - COALESCE("GuestUsage".first_request_at, NOW()) <= (${FREE_QUOTA_WINDOW_MINUTES}::INT || ' minutes')::INTERVAL
                             THEN "GuestUsage".requests_made + 1
                             ELSE 1 END,
        first_request_at = CASE WHEN NOW() - COALESCE("GuestUsage".first_request_at, NOW()) <= (${FREE_QUOTA_WINDOW_MINUTES}::INT || ' minutes')::INTERVAL
                             THEN "GuestUsage".first_request_at
                             ELSE NOW() END,
        last_request_at = NOW()
      RETURNING requests_made, first_request_at;
    `;
    const row = result.rows[0] as { requests_made: number; first_request_at: string };
    // We allow within the window (bounded by rate limit). Provide window info.
    return { allowed: true, remaining: undefined, mode: 'window', windowMinutes: FREE_QUOTA_WINDOW_MINUTES } as const;
  }

  // Total count mode against GuestUsage(requests_made)
  const up = await sql`
    INSERT INTO "GuestUsage" (guest_id, requests_made, first_request_at, last_request_at)
    VALUES (${guestId}, 1, NOW(), NOW())
    ON CONFLICT (guest_id)
    DO UPDATE SET requests_made = "GuestUsage".requests_made + 1, last_request_at = NOW()
    RETURNING requests_made;
  `;
  const count = (up.rows[0] as { requests_made: number }).requests_made;
  const allowed = count <= FREE_QUOTA_TOTAL;
  return { allowed, remaining: Math.max(0, FREE_QUOTA_TOTAL - count) } as const;
}

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  if (!AI_API_KEY) {
    return res.status(500).json({ message: 'Server not configured: AI_API_KEY is missing.' });
  }
  if (!DB_URL && !process.env.POSTGRES_URL) {
    return res.status(500).json({ message: 'Database not configured: set DATABASE_URL (or POSTGRES_URL).' });
  }

  // Support JSON bodies only
  const { prompt, model: requestedModel, context } = req.body || {};
  if (!prompt || typeof prompt !== 'string') {
    return res.status(400).json({ message: 'Prompt is required' });
  }

  try {
    await ensureSchema();
  } catch (e: any) {
    // Do not block chat if schema creation fails; rate limiter will fail-open below.
    console.error('ensureSchema error (continuing without RL schema)', e);
  }

  // Identify caller (guest cookie + IP fallback)
  const cookies = parseCookies(req);
  let guestId = cookies[GUEST_COOKIE_NAME];
  if (!guestId) {
    guestId = newGuestId();
    setGuestCookie(res, guestId);
  }
  const ip = getClientIp(req);
  const rlKey = `g:${guestId}:ip:${ip}`;

  // Rate limit
  let rl;
  try {
    rl = await enforceRateLimit(rlKey);
  } catch (e: any) {
    console.error('enforceRateLimit error', {
      message: e.message,
      stack: e.stack,
      details: e,
    });
    // Fail-open on RL to avoid blocking users due to transient DB issues
    rl = { allowed: true, remaining: RATE_LIMIT_PER_MINUTE, retryAfter: 0, limit: RATE_LIMIT_PER_MINUTE };
  }
  res.setHeader('X-RateLimit-Limit', (rl.limit ?? RATE_LIMIT_PER_MINUTE).toString());
  res.setHeader('X-RateLimit-Remaining', Math.max(0, rl.remaining).toString());
  if (!rl.allowed) {
    res.setHeader('Retry-After', rl.retryAfter.toString());
    return res.status(429).json({ message: 'Too Many Requests. Try again later.', retryAfter: rl.retryAfter });
  }

  // Guest quota
  let quota;
  try {
    quota = await enforceGuestQuota(guestId);
  } catch (e: any) {
    console.error('enforceGuestQuota error', {
      message: e.message,
      stack: e.stack,
      details: e,
    });
    return res.status(503).json({ message: 'Database error enforcing guest quota', detail: e?.message || String(e) });
  }
  if (!quota.allowed) {
    return res.status(403).json({ message: 'Free quota exceeded. Please sign up to continue.', remaining: quota.remaining });
  }

  // TODO: This is a temporary fix for large contexts.
  // For a more robust solution, consider implementing Retrieval-Augmented Generation (RAG)
  // to intelligently select relevant parts of the context instead of truncating it.
  const MAX_CONTEXT_LENGTH = 15000;
  let truncatedContext = context;
  if (typeof context === 'string' && context.length > MAX_CONTEXT_LENGTH) {
    truncatedContext = context.substring(0, MAX_CONTEXT_LENGTH) + '... [context truncated]';
  }

  // Build a combined prompt that includes the vault context if provided
  const combinedPrompt = typeof truncatedContext === 'string' && truncatedContext.trim().length > 0
    ? `You are an assistant answering based on the provided vault notes context below. If the answer is not in the context, say you don't know.

CONTEXT START
${truncatedContext}
CONTEXT END

QUESTION: ${prompt}`
    : prompt;

  try {
    const genAI = new GoogleGenerativeAI(AI_API_KEY);

    // Default to "Gemini Flash Lite latest" (8B variant)
    const defaultModel = 'gemini-1.5-flash-8b-latest';

    // Try requested model first (if provided), then common fallbacks
    const candidates = Array.from(new Set([
      requestedModel,
      defaultModel,
      'gemini-1.5-flash-8b',
      'gemini-1.5-flash-8b-exp',
      'gemini-1.5-flash-latest',
      'gemini-1.5-flash',
      'gemini-pro',
    ].filter(Boolean)));

    let lastErr: any = null;
    for (const name of candidates) {
      try {
        const model = genAI.getGenerativeModel({ model: name });
        const result = await model.generateContent(combinedPrompt);
        const response = await result.response;
        const text = await response.text();
        return res.status(200).json({
          response: text,
          model: name,
          rateLimit: { limit: RATE_LIMIT_PER_MINUTE, remaining: Math.max(0, rl.remaining) },
          quota: {
            type: 'guest',
            mode: FREE_QUOTA_WINDOW_MINUTES > 0 ? 'window' : 'count',
            total: FREE_QUOTA_WINDOW_MINUTES > 0 ? undefined : FREE_QUOTA_TOTAL,
            remaining: 'remaining' in quota ? (quota as any).remaining : undefined,
            windowMinutes: FREE_QUOTA_WINDOW_MINUTES > 0 ? FREE_QUOTA_WINDOW_MINUTES : undefined,
          }
        });
      } catch (e: any) {
        lastErr = e;
        if (!(e?.message && /not found|unsupported|404/i.test(e.message))) {
          break;
        }
      }
    }

    const msg = lastErr?.message || 'Failed to get response from AI. Please try again later.';
    if (/api key|unauthorized|invalid key|permission/i.test(msg)) {
      return res.status(403).json({ message: 'AI service authentication failed. Verify AI_API_KEY in project settings.' });
    }
    if (/request is too large|token limit/i.test(msg)) {
      return res.status(413).json({ message: 'The vault content is too large to process. Please reduce the number of files or their size.' });
    }
    return res.status(500).json({ message: `AI service error: ${msg}` });
  } catch (err: any) {
    console.error('chat handler error', err);
    const msg = err?.message || 'Unexpected server error.';
    return res.status(500).json({ message: `Server error: ${msg}` });
  }
}
