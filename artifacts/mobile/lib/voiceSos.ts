import { Platform } from "react-native";

export const VOICE_TRIGGER_PHRASES = ["help", "sos", "emergency", "save me"];

export type VoiceSOSResult =
  | { type: "trigger_detected"; phrase: string; transcript: string }
  | { type: "no_trigger"; transcript: string }
  | { type: "unavailable"; reason: string }
  | { type: "error"; message: string }
  | { type: "cancelled" };

export interface VoiceSOSSession {
  stop: () => void;
}

function detectTriggerPhrase(transcript: string): string | null {
  const lower = transcript.toLowerCase().trim();
  for (const phrase of VOICE_TRIGGER_PHRASES) {
    if (lower.includes(phrase)) {
      return phrase;
    }
  }
  return null;
}

/**
 * Starts a voice SOS listening session.
 * On web: uses Web Speech API (SpeechRecognition).
 * On native Expo Go: returns unavailable (requires a native development build with expo-speech-recognition).
 *
 * @param onResult   Callback with the result (trigger_detected | no_trigger | unavailable | error | cancelled)
 * @param onInterim  Optional callback with interim transcripts for live display
 * @returns VoiceSOSSession with a stop() function, or null if unavailable
 */
export function startVoiceSOSSession(
  onResult: (result: VoiceSOSResult) => void,
  onInterim?: (text: string) => void
): VoiceSOSSession | null {
  // Native: not available in Expo Go without a development build
  if (Platform.OS !== "web") {
    onResult({
      type: "unavailable",
      reason:
        "Voice SOS requires a native development build. Use the SOS button to send an alert manually.",
    });
    return null;
  }

  // Web: use Web Speech API
  const SpeechRecognitionClass =
    (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

  if (!SpeechRecognitionClass) {
    onResult({
      type: "unavailable",
      reason:
        "Speech recognition is not supported in this browser. Try Chrome or Edge.",
    });
    return null;
  }

  const recognition = new SpeechRecognitionClass();
  recognition.continuous = false;
  recognition.interimResults = true;
  recognition.maxAlternatives = 3;
  recognition.lang = "en-US";

  let finalised = false;

  recognition.onresult = (event: any) => {
    let interimTranscript = "";
    let finalTranscript = "";

    for (let i = event.resultIndex; i < event.results.length; i++) {
      const result = event.results[i];
      const text = result[0].transcript;
      if (result.isFinal) {
        finalTranscript += text;
      } else {
        interimTranscript += text;
      }
    }

    if (interimTranscript && onInterim) {
      onInterim(interimTranscript);
    }

    if (finalTranscript) {
      finalised = true;
      const triggeredPhrase = detectTriggerPhrase(finalTranscript);
      if (triggeredPhrase) {
        onResult({
          type: "trigger_detected",
          phrase: triggeredPhrase,
          transcript: finalTranscript,
        });
      } else {
        onResult({ type: "no_trigger", transcript: finalTranscript });
      }
    }
  };

  recognition.onerror = (event: any) => {
    if (finalised) return;
    if (event.error === "aborted" || event.error === "no-speech") {
      onResult({ type: "cancelled" });
    } else if (event.error === "not-allowed") {
      onResult({
        type: "unavailable",
        reason: "Microphone permission was denied. Please allow microphone access.",
      });
    } else {
      onResult({ type: "error", message: `Speech recognition error: ${event.error}` });
    }
  };

  recognition.onend = () => {
    if (!finalised) {
      onResult({ type: "no_trigger", transcript: "" });
    }
  };

  try {
    recognition.start();
  } catch (e: any) {
    onResult({ type: "error", message: e?.message ?? "Failed to start speech recognition." });
    return null;
  }

  return {
    stop: () => {
      finalised = true;
      try { recognition.stop(); } catch {}
    },
  };
}
