"use client";

import { useEffect, useState } from "react";
import { speak, stopSpeaking, isSpeechSupported } from "@/lib/voice/speech";
import { cn } from "@/lib/utils";

/** Small button that reads text aloud via the Web Speech API. Hidden if
 *  speech synthesis is not supported (SSR-safe). */
export function SpeakButton({
  text,
  className,
}: {
  text: string;
  className?: string;
}) {
  const [supported, setSupported] = useState(false);
  const [speaking, setSpeaking] = useState(false);

  useEffect(() => {
    setSupported(isSpeechSupported());
  }, []);

  useEffect(() => {
    if (!speaking) return;
    const check = setInterval(() => {
      if (!window.speechSynthesis.speaking) {
        setSpeaking(false);
        clearInterval(check);
      }
    }, 200);
    return () => clearInterval(check);
  }, [speaking]);

  if (!supported) return null;

  function onClick() {
    if (speaking) {
      stopSpeaking();
      setSpeaking(false);
    } else {
      speak(text);
      setSpeaking(true);
    }
  }

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={speaking ? "Stop reading aloud" : "Read aloud"}
      className={cn(
        "inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium transition-colors",
        speaking
          ? "bg-brand-100 text-brand-700"
          : "text-brand-600 hover:bg-brand-50",
        className,
      )}
    >
      {speaking ? (
        <span className="flex items-center gap-1">
          <span className="animate-pulse-soft">◼</span> Stop
        </span>
      ) : (
        <span className="flex items-center gap-1">🔊 Read aloud</span>
      )}
    </button>
  );
}
