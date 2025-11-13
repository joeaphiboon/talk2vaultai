
import { GoogleGenAI, Chat } from "@google/genai";
import { v4 as uuidv4 } from 'uuid'; // For generating guest IDs if needed client-side

// --- Constants ---
const GUEST_COOKIE_NAME = 'guest_id'; // Should match backend

// --- Client-side AI Service ---
// This service will now act as a client to the backend proxy,
// not directly to the Gemini API.

// Function to get guest ID from cookie or generate a new one
// This is needed for the frontend to send the guest_id to the backend
export const getOrCreateGuestId = (): string => {
    // In a real app, you'd access cookies via document.cookie or a library.
    // For simplicity here, we'll assume a mechanism to get/set it.
    // This part might need more robust cookie handling in a full frontend app.
    let guestId = localStorage.getItem(GUEST_COOKIE_NAME);
    if (!guestId) {
        guestId = uuidv4();
        localStorage.setItem(GUEST_COOKIE_NAME, guestId); // Store temporarily client-side for this session if cookie isn't set yet
        // Note: The backend will set the httpOnly cookie. This client-side storage is a fallback/session helper.
    }
    return guestId;
};

// This function will now call the backend proxy endpoint
export const getStreamingResponse = async (
  prompt: string,
  context: string, // Context from vault files
) => {
  const guestId = getOrCreateGuestId();
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    // If user is logged in, include Authorization header here
    // 'Authorization': `Bearer ${userToken}`, 
    // For guests, send the guest_id cookie (handled by browser for httpOnly cookies)
    // Or explicitly pass it if not using httpOnly cookies for guest_id
    // 'X-Guest-ID': guestId, // If not using httpOnly cookies
  };

  // If you have a JWT for logged-in users, add it here:
  // const userToken = localStorage.getItem('authToken'); // Example: get token from local storage
  // if (userToken) {
  //   headers['Authorization'] = `Bearer ${userToken}`;
  // }

  try {
    const response = await fetch('/api/proxy/chat', {
      method: 'POST',
      headers: headers,
      body: JSON.stringify({ prompt, context }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      // Handle quota exceeded (403) or other errors
      if (response.status === 403) {
        throw new Error(errorData.message || 'Quota exceeded. Please sign up or contact support.');
      }
      throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
    }

    // The response is a stream
    return response.body?.getReader();

  } catch (error: any) {
    console.error("Error calling backend proxy:", error);
    // Rethrow or handle specific errors
    throw new Error(error.message || "Failed to connect to the AI service.");
  }
};

// Remove all client-side Gemini initialization, verification, and usage tracking.
// The actual Gemini client and API key management will be on the server.

