import { useState, useRef, useCallback, useEffect } from "react";
import { Mic, MicOff, Square } from "lucide-react";

interface SpeechInputProps {
  onTranscript: (text: string) => void;
  onFinalTranscript: (text: string) => void;
  isEnabled: boolean;
}

const SpeechInput = ({ onTranscript, onFinalTranscript, isEnabled }: SpeechInputProps) => {
  const [isListening, setIsListening] = useState(false);
  const [supported, setSupported] = useState(true);
  const recognitionRef = useRef<any>(null);
  const fullTranscriptRef = useRef("");

  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setSupported(false);
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-US";

    recognition.onresult = (event: any) => {
      let interim = "";
      let final = "";
      for (let i = 0; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          final += result[0].transcript + " ";
        } else {
          interim += result[0].transcript;
        }
      }
      if (final) {
        fullTranscriptRef.current += final;
        onFinalTranscript(fullTranscriptRef.current.trim());
      }
      onTranscript((fullTranscriptRef.current + interim).trim());
    };

    recognition.onerror = (event: any) => {
      console.error("Speech recognition error:", event.error);
      if (event.error !== "no-speech") {
        setIsListening(false);
      }
    };

    recognition.onend = () => {
      // Auto-restart if still supposed to be listening
      if (recognitionRef.current?._shouldListen) {
        try { recognition.start(); } catch {}
      } else {
        setIsListening(false);
      }
    };

    recognitionRef.current = recognition;

    return () => {
      recognition.onend = null;
      try { recognition.stop(); } catch {}
    };
  }, [onTranscript, onFinalTranscript]);

  const startListening = useCallback(() => {
    if (!recognitionRef.current || !isEnabled) return;
    fullTranscriptRef.current = "";
    recognitionRef.current._shouldListen = true;
    try {
      recognitionRef.current.start();
      setIsListening(true);
    } catch {}
  }, [isEnabled]);

  const stopListening = useCallback(() => {
    if (!recognitionRef.current) return;
    recognitionRef.current._shouldListen = false;
    try { recognitionRef.current.stop(); } catch {}
    setIsListening(false);
  }, []);

  if (!supported) return null;
  if (!isEnabled) return null;

  return (
    <button
      onClick={isListening ? stopListening : startListening}
      className={`p-3 rounded-lg transition-all ${
        isListening
          ? "bg-destructive text-destructive-foreground animate-pulse"
          : "bg-primary/20 text-primary hover:bg-primary/30"
      }`}
      title={isListening ? "Stop recording" : "Speak your argument"}
    >
      {isListening ? <Square className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
    </button>
  );
};

export default SpeechInput;
