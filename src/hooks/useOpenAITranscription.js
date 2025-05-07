import { useState, useRef } from 'react';

const useOpenAITranscription = ({
  onTranscriptionResult,
  quranDataRef,
  whisperKey,
  prompt = "",
  language = 'ar', // Default to Arabic
  isMicMutedRef,
}) => {
  const [lines, setLines] = useState([]);   // [{ar,en}]
  const [recording, setRecording] = useState(false);
  const sessionId = useRef(null);
  const mediaRec = useRef(null);

  const BASE_URL = process.env.NODE_ENV === 'production'
    ? 'https://api.goquran.app'
    : 'http://localhost:9091';

  const TRANSCRIPTION_PROMPT = `
بِسْمِ اللّٰهِ الرَّحْمٰنِ الرَّحِيمِ(Arabic only. Ignore any non‑Arabic speech, background voices, music, or noise.)
`;

  const genId = () =>
    `session-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

  const flush = async () => {
    if (isMicMutedRef && isMicMutedRef.current) return;
    if (!sessionId.current) return;
    const apiKey = localStorage.getItem("whisperKey") || whisperKey || "";
    const r = await fetch(`${BASE_URL}/flush`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-OPENAI-KEY": apiKey || "",
      },
      body: JSON.stringify({ sessionId: sessionId.current, prompt: TRANSCRIPTION_PROMPT })
    });
    console.log("body", JSON.stringify({ sessionId: sessionId.current }))
    if (!r.ok || r.status === 204 || r.status === 202) return;
    const { delta } = await r.json();
    if (!delta) return;

    /* split on Arabic comma / stop marks if you like; here we push raw */
    onTranscriptionResult?.(delta.trim());
  };

  const startRecognition = async () => {
    sessionId.current = genId();
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

    mediaRec.current = new MediaRecorder(stream, { mimeType: "audio/webm;codecs=opus" });
    mediaRec.current.ondataavailable = async (e) => {
      if (e.data.size === 0) return;
      const fd = new FormData();
      fd.append("chunk", e.data, "chunk.webm");
      fd.append("sessionId", sessionId.current);
      await fetch(`${BASE_URL}/uploadChunk`, { method: "POST", body: fd });
    };
    mediaRec.current.start(3000);        // 3‑s chunks

    /* flush every 8 s */
    flush.timer = setInterval(flush, 6000);
    setRecording(true);
  };

  const stopRecognition = async () => {
    mediaRec.current?.stop();
    mediaRec.current?.stream.getTracks().forEach(t => t.stop());
    clearInterval(flush.timer);
    await flush();                       // final flush

    await fetch(`${BASE_URL}/endSession`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId: sessionId.current })
    });
    sessionId.current = null;
    setRecording(false);
  };

  return {
    recording,
    startRecognition,
    stopRecognition,
  };
};

export default useOpenAITranscription;