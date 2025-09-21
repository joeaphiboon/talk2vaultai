
import { GoogleGenAI, Chat } from "@google/genai";

let ai: GoogleGenAI | null = null;
let chat: Chat | null = null;
let currentApiKey: string | null = null;

const initializeGemini = (apiKey: string) => {
  ai = new GoogleGenAI({ apiKey });
  chat = ai.chats.create({
    model: 'gemini-2.5-flash',
    config: {
      systemInstruction: `You are an intelligent assistant for a user's personal notes from their Obsidian vault. Your task is to answer the user's questions based ONLY on the context provided from their notes.
- Analyze the user's question and the provided context carefully.
- Formulate your answer strictly from the information within the notes.
- If the answer is not found in the context, you MUST explicitly state that you couldn't find the information in the notes. Do not use external knowledge or make assumptions.
- Respond in the same language as the user's question (the app supports both English and Thai).
- Keep your answers concise and directly relevant to the question.`,
    },
  });
  currentApiKey = apiKey;
};

export const getStreamingResponse = async (
  prompt: string,
  context: string,
  apiKey: string,
) => {
  // Initialize or reinitialize if API key has changed
  if (!chat || currentApiKey !== apiKey) {
    initializeGemini(apiKey);
  }

  if (!chat) {
    throw new Error("Gemini chat is not initialized.");
  }

  const fullPrompt = `CONTEXT FROM NOTES:\n---\n${context}\n---\n\nQUESTION: ${prompt}`;

  try {
    const response = await chat.sendMessageStream({ message: fullPrompt });
    return response;
  } catch (error) {
    console.error("Error sending message to Gemini:", error);
    // Reset on error to allow re-initialization on the next call.
    ai = null; 
    chat = null;
    if (error instanceof Error) {
        throw new Error(`Gemini API Error: ${error.message}`);
    }
    throw new Error("An unknown error occurred with the Gemini API.");
  }
};
