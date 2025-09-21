
import { useState, useEffect, useRef } from 'react';

// Fix: Add type declarations for the Web Speech API to resolve TypeScript errors.
declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}

interface SpeechToTextOptions {
  lang?: string;
  autoDetectLanguage?: boolean;
}

interface SpeechToTextResult {
  isListening: boolean;
  transcript: string;
  startListening: () => void;
  stopListening: () => void;
  hasRecognitionSupport: boolean;
  detectedLanguage: string;
  isInterim: boolean;
}

const useSpeechToText = (options: SpeechToTextOptions = {}): SpeechToTextResult => {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [detectedLanguage, setDetectedLanguage] = useState('en-US');
  const [isInterim, setIsInterim] = useState(false);
  // Fix: Use 'any' for the recognition object reference as the specific type isn't globally available.
  const recognitionRef = useRef<any | null>(null);

  const hasRecognitionSupport =
    typeof window !== 'undefined' &&
    ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window);

  useEffect(() => {
    if (!hasRecognitionSupport) {
      console.warn('Speech recognition is not supported in this browser.');
      return;
    }

    try {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      const recognition = recognitionRef.current;

    recognition.continuous = true;
    recognition.interimResults = true;
    
    // Support both Thai and English
    if (options.autoDetectLanguage) {
      recognition.lang = 'th-TH,en-US'; // Try Thai first, fallback to English
    } else {
      recognition.lang = options.lang || 'en-US';
    }

    recognition.onresult = (event: any) => {
      let finalTranscript = '';
      let interimTranscript = '';
      
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        const result = event.results[i];
        const transcript = result[0].transcript;
        
        if (result.isFinal) {
          finalTranscript += transcript;
          setIsInterim(false);
        } else {
          interimTranscript += transcript;
          setIsInterim(true);
        }
      }
      
      if (finalTranscript) {
        setTranscript(t => t + finalTranscript);
      }
      
      // Update interim transcript for real-time display
      if (interimTranscript) {
        setTranscript(t => t + interimTranscript);
      }
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognition.onerror = (event: any) => {
      console.error('Speech recognition error', event.error);
      setIsListening(false);
    };

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
    } catch (error) {
      console.error('Error initializing speech recognition:', error);
    }
  }, [hasRecognitionSupport, options.lang]);

  const startListening = () => {
    if (recognitionRef.current && !isListening) {
      try {
        setTranscript('');
        recognitionRef.current.start();
        setIsListening(true);
      } catch (error) {
        console.error('Error starting speech recognition:', error);
        setIsListening(false);
      }
    }
  };

  const stopListening = () => {
    if (recognitionRef.current && isListening) {
      try {
        recognitionRef.current.stop();
        setIsListening(false);
      } catch (error) {
        console.error('Error stopping speech recognition:', error);
        setIsListening(false);
      }
    }
  };

  return { 
    isListening, 
    transcript, 
    startListening, 
    stopListening, 
    hasRecognitionSupport, 
    detectedLanguage, 
    isInterim 
  };
};

export default useSpeechToText;
