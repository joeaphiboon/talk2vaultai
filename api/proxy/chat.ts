import { GoogleGenerativeAI } from '@google/genai';

// Minimal serverless function for Vercel (Node-based) without external quotas/auth
// Expects env var AI_API_KEY to be set in Vercel Project settings

const AI_API_KEY = process.env.AI_API_KEY as string;

if (!AI_API_KEY) {
  console.warn('[api/proxy/chat] Missing AI_API_KEY environment variable.');
}

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method Not Allowed' });
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
    console.error('[api/proxy/chat] Error:', error);
    return res.status(500).json({ message: 'Failed to get response from AI. Please try again later.' });
  }
}
