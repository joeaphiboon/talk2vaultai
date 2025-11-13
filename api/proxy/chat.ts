import { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import { GoogleGenAI } from '@google/generative-ai';
import { v4 as uuidv4 } from 'uuid';
import { serialize } from 'cookie';
import jwt from 'jsonwebtoken';

// --- Configuration ---
const SUPABASE_URL = process.env.SUPABASE_URL as string;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY as string;
const AI_API_KEY = process.env.AI_API_KEY as string; // Master API Key for server-side proxy
const JWT_SECRET = process.env.JWT_SECRET as string; // Secret for JWT verification

const GUEST_COOKIE_NAME = 'guest_id';
const GUEST_REQUEST_QUOTA = 30; // Total requests for guests
const INSTITUTION_FREE_PLAN_DAILY_QUOTA = 1000; // Default daily quota for free tier institutions

if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !AI_API_KEY || !JWT_SECRET) {
  // Log once during cold start to help diagnose misconfiguration
  console.warn('[api/proxy/chat] Missing environment variables. Ensure SUPABASE_URL, SUPABASE_ANON_KEY, AI_API_KEY, and JWT_SECRET are set.');
}

// --- Supabase Client ---
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// --- AI Provider Client ---
const ai = new GoogleGenAI({ apiKey: AI_API_KEY });
const model = ai.getGenerativeModel({ model: 'gemini-flash-latest' });

// --- Helpers ---
const getCookie = (req: VercelRequest, name: string): string | undefined => {
  if (req.cookies && name in req.cookies) return req.cookies[name];
  const raw = req.headers.cookie;
  if (!raw) return undefined;
  const parts = raw.split(';').map((p) => p.trim());
  for (const part of parts) {
    const [k, v] = part.split('=');
    if (k === name) return decodeURIComponent(v || '');
  }
  return undefined;
};

const setGuestCookie = (res: VercelResponse, value: string) => {
  res.setHeader(
    'Set-Cookie',
    serialize(GUEST_COOKIE_NAME, value, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 60 * 60 * 24 * 365, // 1 year
      path: '/',
      sameSite: 'lax',
    })
  );
};

const getOrCreateGuestId = (req: VercelRequest, res: VercelResponse): string => {
  const existing = getCookie(req, GUEST_COOKIE_NAME);
  if (existing) return existing;
  const id = uuidv4();
  setGuestCookie(res, id);
  return id;
};

const checkAndUpdateGuestQuota = async (
  guestId: string
): Promise<{ allowed: boolean; remaining: number; error?: string }> => {
  try {
    const { data: guestData, error: fetchError } = await supabase
      .from('guest_usage')
      .select('request_count, created_at')
      .eq('guest_id', guestId)
      .single();

    // PGRST116 = no rows found
    if (fetchError && (fetchError as any).code !== 'PGRST116') {
      console.error('Error fetching guest usage:', fetchError);
      return { allowed: false, remaining: 0, error: 'Database error fetching guest usage.' };
    }

    const currentCount = guestData?.request_count || 0;
    if (currentCount >= GUEST_REQUEST_QUOTA) {
      return { allowed: false, remaining: 0, error: 'Guest quota exceeded.' };
    }

    if (!guestData) {
      const { error: insertError } = await supabase
        .from('guest_usage')
        .insert({ guest_id: guestId, request_count: 1, session_start_at: new Date() });
      if (insertError) {
        console.error('Error inserting guest usage:', insertError);
        return { allowed: false, remaining: 0, error: 'Database error creating guest record.' };
      }
      return { allowed: true, remaining: GUEST_REQUEST_QUOTA - 1 };
    } else {
      const { error: updateError } = await supabase
        .from('guest_usage')
        .update({ request_count: currentCount + 1, updated_at: new Date() })
        .eq('guest_id', guestId);
      if (updateError) {
        console.error('Error updating guest usage:', updateError);
        return { allowed: false, remaining: 0, error: 'Database error updating guest record.' };
      }
      return { allowed: true, remaining: GUEST_REQUEST_QUOTA - (currentCount + 1) };
    }
  } catch (error) {
    console.error('Unexpected error in checkAndUpdateGuestQuota:', error);
    return { allowed: false, remaining: 0, error: 'An unexpected error occurred.' };
  }
};

const checkAndUpdateUserQuota = async (
  userId: string
): Promise<{ allowed: boolean; remaining: number; error?: string }> => {
  try {
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('institution_id')
      .eq('id', userId)
      .single();

    if (userError || !userData) {
      console.error('Error fetching user:', userError || 'User not found');
      return { allowed: false, remaining: 0, error: 'User not found or database error.' };
    }

    const { data: institutionData, error: institutionError } = await supabase
      .from('institutions')
      .select('daily_request_limit, plan_type')
      .eq('id', userData.institution_id)
      .single();

    if (institutionError || !institutionData) {
      console.error('Error fetching institution:', institutionError || 'Institution not found');
      return { allowed: false, remaining: 0, error: 'Institution not found or database error.' };
    }

    const dailyLimit = institutionData.daily_request_limit || INSTITUTION_FREE_PLAN_DAILY_QUOTA;

    const { data: dailyUsageResult, error: dailyUsageError } = await supabase.rpc(
      'get_user_daily_request_count',
      { p_user_id: userId }
    );

    if (dailyUsageError) {
      console.error('Error fetching user daily usage:', dailyUsageError);
      return { allowed: false, remaining: 0, error: 'Database error checking daily usage.' };
    }

    const currentDailyCount = (dailyUsageResult as any)?.[0]?.count || 0;

    if (currentDailyCount >= dailyLimit) {
      return { allowed: false, remaining: 0, error: 'Daily quota exceeded.' };
    }

    return { allowed: true, remaining: dailyLimit - (currentDailyCount + 1) };
  } catch (error) {
    console.error('Unexpected error in checkAndUpdateUserQuota:', error);
    return { allowed: false, remaining: 0, error: 'An unexpected error occurred.' };
  }
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  const { prompt, context } = req.body || {};
  if (!prompt) {
    return res.status(400).json({ message: 'Prompt is required' });
  }

  let userId: string | null = null;
  let guestId: string | null = null;
  let quotaAllowed = false;
  let remainingQuota = 0;
  let quotaError = '';

  const authHeader = req.headers['authorization'];
  if (authHeader && typeof authHeader === 'string' && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as { userId: string };
      userId = decoded.userId;

      const quotaCheck = await checkAndUpdateUserQuota(userId);
      quotaAllowed = quotaCheck.allowed;
      remainingQuota = quotaCheck.remaining;
      quotaError = quotaCheck.error || '';

      if (!quotaAllowed) {
        return res.status(403).json({ message: quotaError || 'Daily quota exceeded. Please contact your administrator or upgrade your plan.' });
      }
    } catch (jwtError) {
      console.error('JWT Verification Error:', jwtError);
      return res.status(401).json({ message: 'Invalid or expired authentication token.' });
    }
  } else {
    // Guest
    guestId = getOrCreateGuestId(req, res);
    const quotaCheck = await checkAndUpdateGuestQuota(guestId);
    quotaAllowed = quotaCheck.allowed;
    remainingQuota = quotaCheck.remaining;
    quotaError = quotaCheck.error || '';

    if (!quotaAllowed) {
      return res.status(403).json({ message: quotaError || 'Free tier quota exceeded. Please sign up for an account to continue.' });
    }
  }

  try {
    // Simple text generation (non-streaming)
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = await response.text();

    if (userId) {
      const { error: incrementError } = await supabase.rpc('increment_user_daily_request_count', { p_user_id: userId });
      if (incrementError) {
        console.error('Error incrementing user daily request count:', incrementError);
      }
    }

    return res.status(200).json({
      response: text,
      remainingQuota: quotaAllowed ? remainingQuota - 1 : 0,
    });
  } catch (error: any) {
    console.error('Error calling AI provider:', error);

    if (
      (error?.message &&
        (error.message.includes('API key') || error.message.includes('quota') || error.message.includes('limit')))
      || error?.status === 401
      || error?.status === 403
    ) {
      return res.status(403).json({ message: 'AI service limit reached or invalid API key. Please contact support.' });
    }

    return res.status(500).json({ message: 'Failed to get response from AI. Please try again later.' });
  }
}
