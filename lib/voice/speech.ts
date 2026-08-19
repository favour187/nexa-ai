/** Client-side text-to-speech using the Web Speech API (SpeechSynthesis).
 *  No external dependencies. SSR-safe (guards window). */

export function isSpeechSupported(): boolean {
  return typeof window !== "undefined" && "speechSynthesis" in window;
}

export function speak(text: string, options?: { rate?: number; pitch?: number }): void {
  if (!isSpeechSupported()) return;
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.rate = options?.rate ?? 1.0;
  utterance.pitch = options?.pitch ?? 1.0;
  utterance.volume = 1.0;
  const voices = window.speechSynthesis.getVoices();
  const preferred =
    voices.find((v) => /natural|google|samantha|aria|jenny/i.test(v.name)) ??
    voices.find((v) => v.lang.startsWith("en"));
  if (preferred) utterance.voice = preferred;
  window.speechSynthesis.speak(utterance);
}

export function stopSpeaking(): void {
  if (isSpeechSupported()) window.speechSynthesis.cancel();
}

export function isCurrentlySpeaking(): boolean {
  return isSpeechSupported() && window.speechSynthesis.speaking;
}
