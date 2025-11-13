import { GoogleGenerativeAI } from '@google/generative-ai';

// Minimal serverless function for Vercel (Node-based) without external quotas/auth
// Expects env var AI_API_KEY to be set in Vercel Project settings

const AI_API_KEY = process.env.AI_API_KEY as string;

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  if (!AI_API_KEY) {
    return res.status(500).json({ message: 'Server not configured: AI_API_KEY is missing.' });
  }

  // Support JSON bodies only
  const { prompt } = req.body || {};
  if (!prompt || typeof prompt !== 'string') {
    return res.status(400).json({ message: 'Prompt is required' });
  }

  try {
    const genAI = new GoogleGenerativeAI(AI_API_KEY);
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = await response.text();

    return res.status(200).json({ response: text });
  } catch (error: any) {
    console.error('[api/proxy/chat] Error:', error?.message || error);
    const msg = typeof error?.message === 'string' ? error.message : 'Failed to get response from AI. Please try again later.';
    // If the error likely relates to auth/key, surface a clearer message
    if (/api key|unauthorized|invalid key|permission/i.test(msg)) {
      return res.status(403).json({ message: 'AI service authentication failed. Verify AI_API_KEY in project settings.' });
    }
    return res.status(500).json({ message: msg });
  }
}
