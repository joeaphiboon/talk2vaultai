
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
    recognition.maxAlternatives = 1;
    
    // Support both Thai and English with better configuration
    if (options.autoDetectLanguage) {
      // Use a more comprehensive language list for better detection
      recognition.lang = 'th-TH,en-US,en-GB,en-AU'; // Thai first, then multiple English variants
    } else {
      recognition.lang = options.lang || 'en-US';
    }

    recognition.onresult = (event: any) => {
      let finalTranscript = '';
      let interimTranscript = '';
      
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        const result = event.results[i];
        const transcript = result[0].transcript.trim();
        
        if (result.isFinal) {
          finalTranscript += transcript + ' ';
          setIsInterim(false);
        } else {
          interimTranscript = transcript;
          setIsInterim(true);
        }
      }
      
      // Update transcript with final results and current interim
      if (finalTranscript) {
        setTranscript(prev => prev + finalTranscript);
      }
      
      // Show interim results in real-time
      if (interimTranscript) {
        setTranscript(prev => {
          // Remove previous interim results and add new ones
          const withoutInterim = prev.replace(/\s*\[.*?\]\s*$/, '');
          return withoutInterim + (interimTranscript ? ` [${interimTranscript}]` : '');
        });
      }
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognition.onerror = (event: any) => {
      console.error('Speech recognition error', event.error);
      setIsListening(false);
      
      // Auto-restart on certain errors for better user experience
      if (event.error === 'no-speech' || event.error === 'audio-capture') {
        setTimeout(() => {
          if (recognitionRef.current && !isListening) {
            try {
              recognitionRef.current.start();
              setIsListening(true);
            } catch (error) {
              console.error('Error restarting speech recognition:', error);
            }
          }
        }, 1000);
      }
    };

    recognition.onstart = () => {
      console.log('Speech recognition started');
      setIsListening(true);
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
