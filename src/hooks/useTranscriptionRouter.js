// src/hooks/useTranscriptionRouter.js
import useSpeechRecognition   from "./useSpeechRecognition";
import useOpenAITranscription from "./useOpenAITranscription";

export default function useTranscriptionRouter(engine, opts) {
  // MUST call hooks unconditionally (rules‑of‑hooks)
  const browser = useSpeechRecognition(opts);     // { recording, startRecording, stopRecording }
  const whisper = useOpenAITranscription(opts);   // same shape

  // Pick which one to expose
  return engine === "whisper" ? whisper : browser;
}
