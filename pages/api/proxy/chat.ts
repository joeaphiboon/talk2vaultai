import { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';
import { GoogleGenAI } from '@google/generative-ai';
import { v4 as uuidv4 } from 'uuid';
import { serialize } from 'cookie';
import jwt from 'jsonwebtoken'; // Assuming JWT for user authentication

// --- Configuration ---
const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY!;
const AI_API_KEY = process.env.AI_API_KEY!; // Master API Key for server-side proxy
const JWT_SECRET = process.env.JWT_SECRET!; // Secret for JWT verification

const GUEST_COOKIE_NAME = 'guest_id';
const GUEST_REQUEST_QUOTA = 30; // Total requests for guests
const INSTITUTION_FREE_PLAN_DAILY_QUOTA = 1000; // Default daily quota for free tier institutions

// --- Supabase Client ---
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// --- AI Provider Client ---
// Initialize with the master API key
const ai = new GoogleGenAI({ apiKey: AI_API_KEY });
// Dynamically select model if needed, or use a default.
// For now, using a default. Model selection might depend on user/institution plan.
const model = ai.getGenerativeModel({ model: "gemini-flash-latest" });

// --- Helper Functions ---

// Function to get guest ID from cookie or generate a new one and set cookie
const getOrCreateGuestId = (req: NextApiRequest, res: NextApiResponse): string => {
    const cookie = req.cookies[GUEST_COOKIE_NAME];
    if (cookie) {
        return cookie;
    } else {
        const newGuestId = uuidv4();
        // Set httpOnly cookie
        res.setHeader('Set-Cookie', serialize(GUEST_COOKIE_NAME, newGuestId, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production', // Use secure in production
            maxAge: 60 * 60 * 24 * 365, // Cookie lasts for 1 year (adjust as needed)
            path: '/',
            sameSite: 'lax', // 'lax' is generally a good default for cross-site requests
        }));
        return newGuestId;
    }
};

// Function to check and update guest quota
const checkAndUpdateGuestQuota = async (guestId: string): Promise<{ allowed: boolean; remaining: number; error?: string }> => {
    try {
        // Check if guest exists and if quota is available
        const { data: guestData, error: fetchError } = await supabase
            .from('guest_usage')
            .select('request_count, created_at')
            .eq('guest_id', guestId)
            .single();

        if (fetchError && fetchError.code !== 'PGRST116') { // PGRST116 means no rows found
            console.error('Error fetching guest usage:', fetchError);
            return { allowed: false, remaining: 0, error: 'Database error fetching guest usage.' };
        }

        const currentCount = guestData?.request_count || 0;

        // Implement total request count quota
        if (currentCount >= GUEST_REQUEST_QUOTA) {
            return { allowed: false, remaining: 0, error: 'Guest quota exceeded.' };
        }

        // If guest doesn't exist, create them with count 1
        if (!guestData) {
            const { error: insertError } = await supabase
                .from('guest_usage')
                .insert({ guest_id: guestId, request_count: 1, session_start_at: new Date() }); // Set session start time
            if (insertError) {
                console.error('Error inserting guest usage:', insertError);
                return { allowed: false, remaining: 0, error: 'Database error creating guest record.' };
            }
            return { allowed: true, remaining: GUEST_REQUEST_QUOTA - 1 };
        } else {
            // Increment request count
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

// Function to check and update logged-in user quota
const checkAndUpdateUserQuota = async (userId: string): Promise<{ allowed: boolean; remaining: number; error?: string }> => {
    try {
        // Fetch user and their institution details
        const { data: userData, error: userError } = await supabase
            .from('users')
            .select('institution_id') // Only need institution_id to join
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

        // Check daily quota using the Supabase function
        const { data: dailyUsageResult, error: dailyUsageError } = await supabase.rpc('get_user_daily_request_count', { p_user_id: userId });

        if (dailyUsageError) {
            console.error('Error fetching user daily usage:', dailyUsageError);
            return { allowed: false, remaining: 0, error: 'Database error checking daily usage.' };
        }

        const currentDailyCount = dailyUsageResult?.[0]?.count || 0;

        if (currentDailyCount >= dailyLimit) {
            return { allowed: false, remaining: 0, error: 'Daily quota exceeded.' };
        }

        // If allowed, the actual increment would happen after the AI call is successful.
        // For now, we just return allowed: true. The increment logic would be in the main handler.
        return { allowed: true, remaining: dailyLimit - (currentDailyCount + 1) };

    } catch (error) {
        console.error('Unexpected error in checkAndUpdateUserQuota:', error);
        return { allowed: false, remaining: 0, error: 'An unexpected error occurred.' };
    }
};

// --- Main API Handler ---
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'POST') {
        return res.status(405).json({ message: 'Method Not Allowed' });
    }

    const { prompt, context } = req.body; // Assuming prompt and context are sent in the body

    if (!prompt) {
        return res.status(400).json({ message: 'Prompt is required' });
    }

    let userId: string | null = null;
    let guestId: string | null = null;
    let quotaAllowed = false;
    let remainingQuota = 0;
    let quotaError = '';

    // --- Authentication/Authorization Check ---
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.split(' ')[1];
        try {
            // Verify JWT token to get user ID
            const decoded = jwt.verify(token, JWT_SECRET) as { userId: string }; // Assuming JWT payload has userId
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
        // Guest user
        guestId = getOrCreateGuestId(req, res); // This also sets the cookie if new
        const quotaCheck = await checkAndUpdateGuestQuota(guestId);
        quotaAllowed = quotaCheck.allowed;
        remainingQuota = quotaCheck.remaining;
        quotaError = quotaCheck.error || '';

        if (!quotaAllowed) {
            return res.status(403).json({ message: quotaError || 'Free tier quota exceeded. Please sign up for an account to continue.' });
        }
    }

    // --- Rate Limiting ---
    // Implementing robust rate limiting (e.g., 5 requests per minute) in a stateless serverless environment
    // without an external cache (like Redis) or Vercel's Edge Config is challenging.
    // The current implementation focuses on quota management via the database.
    // For true rate limiting, consider Vercel's built-in features, an edge function, or a distributed cache.
    // A basic check could involve querying a 'request_logs' table for recent requests by IP/guest_id/user_id,
    // but this can be resource-intensive. We'll omit a complex rate limiter here and focus on quotas.

    // --- AI Provider Call ---
    try {
        // The actual AI call logic
        // For chat, you'd typically use model.startChat()
        // The 'context' might be used to build the chat history.
        // For simplicity, let's assume a single turn completion for now.
        // A real chat would involve managing chat history.

        // If using chat:
        // const chat = model.startChat({ history: context ? JSON.parse(context) : [] });
        // const result = await chat.sendMessageStream(prompt);
        // const response = await result.response;
        // const text = await response.text(); // Use await here

        // For a simple text generation example:
        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = await response.text(); // Use await here

        // --- Update Quota After Successful Call ---
        if (userId) {
            // Increment user's daily count using the Supabase function
            const { error: incrementError } = await supabase.rpc('increment_user_daily_request_count', { p_user_id: userId });
            if (incrementError) {
                console.error('Error incrementing user daily request count:', incrementError);
                // Decide how to handle this: maybe return a warning, or retry, or fail the request.
                // For now, we'll log it and proceed.
            }
        }
        // Guest quota was already incremented when the request was allowed.

        res.status(200).json({
            response: text,
            remainingQuota: quotaAllowed ? remainingQuota - 1 : 0, // Decrement remaining quota
            // You might want to send back the updated quota or other relevant info
        });

    } catch (error: any) {
        console.error('Error calling AI provider:', error);

        // If AI call fails, we might not want to consume a quota, or we might have a specific error quota.
        // For now, assume failure doesn't consume quota.
        // If the error is related to the AI provider's own limits or invalid key, return a specific error.
        if (error.message.includes('API key') || error.message.includes('quota') || error.message.includes('limit') || error.status === 401 || error.status === 403) {
             return res.status(403).json({ message: 'AI service limit reached or invalid API key. Please contact support.' });
        }

        res.status(500).json({ message: 'Failed to get response from AI. Please try again later.' });
    }
}

/*
--- Supabase Functions (to be created in Supabase SQL Editor) ---

-- Function to get user's daily request count
CREATE OR REPLACE FUNCTION get_user_daily_request_count(p_user_id UUID)
RETURNS TABLE(count BIGINT)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT COUNT(*)::BIGINT
    FROM chat_completions -- Assuming a table to log chat completions
    WHERE user_id = p_user_id
      AND created_at >= date_trunc('day', NOW())
      AND created_at < date_trunc('day', NOW()) + INTERVAL '1 day';
END;
$$;

-- Function to increment user's daily request count (called after successful AI response)
CREATE OR REPLACE FUNCTION increment_user_daily_request_count(p_user_id UUID)
RETURNS VOID
LANGUAGE plpgsql
AS $$
BEGIN
    -- This function logs the completion. In a real scenario, you'd also store the prompt, response, etc.
    INSERT INTO chat_completions (user_id, created_at)
    VALUES (p_user_id, NOW());
END;
$$;
*/
