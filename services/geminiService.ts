
import { GoogleGenAI, Chat } from "@google/genai";
import { incrementRequestCount, addTokenUsage } from "./usageService";

let ai: GoogleGenAI | null = null;
let chat: Chat | null = null;
let currentApiKey: string | null = null;

const initializeGemini = (apiKey: string, model: string = 'gemini-flash-latest') => {
  ai = new GoogleGenAI({ apiKey });
  chat = ai.chats.create({
    model: model,
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

export const verifyApiKey = async (apiKey: string, model: string = 'gemini-flash-latest'): Promise<boolean> => {
  try {
    const testAI = new GoogleGenAI({ apiKey });
    const testChat = testAI.chats.create({
      model: model,
      config: {
        systemInstruction: "You are a test assistant. Respond with 'OK' to verify the API key is working.",
      },
    });
    
    const response = await testChat.sendMessage({ message: "Test" });
    return response.text === "OK";
  } catch (error) {
    console.error("API key verification failed:", error);
    return false;
  }
};

export const getStreamingResponse = async (
  prompt: string,
  context: string,
  apiKey: string,
  model: string = 'gemini-flash-latest',
) => {
  // Initialize or reinitialize if API key has changed
  if (!chat || currentApiKey !== apiKey) {
    initializeGemini(apiKey, model);
  }

  if (!chat) {
    throw new Error("Gemini chat is not initialized.");
  }

  const fullPrompt = `CONTEXT FROM NOTES:\n---\n${context}\n---\n\nQUESTION: ${prompt}`;

  try {
    const response = await chat.sendMessageStream({ message: fullPrompt });
    incrementRequestCount();

    let lastTotalTokenCount = 0;

    async function* usageWrappedStream() {
      for await (const chunk of response) {
        const usageMetadata = (chunk as any)?.usageMetadata;
        if (usageMetadata && typeof usageMetadata.totalTokenCount === 'number') {
          const additionalTokens = usageMetadata.totalTokenCount - lastTotalTokenCount;
          if (additionalTokens > 0) {
            addTokenUsage(additionalTokens);
            lastTotalTokenCount = usageMetadata.totalTokenCount;
          }
        }

        yield chunk;
      }
    }

    return usageWrappedStream();
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
