import express from "express";
import multer from "multer";
import fs from "fs";
import path from "path";
import cors from "cors";
import { spawn } from "child_process";
import fetch from "node-fetch";
import FormData from "form-data";
import dotenv from "dotenv";

dotenv.config();

/* ───── basic setup ───── */
const app = express();
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
const port = 3001;

const uploadsDir = path.join(process.cwd(), "uploads");
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

const upload = multer({ dest: "uploads/" });

/* session = { webm, lastText, busy, queued } */
const sessions = Object.create(null);

/* helper: run ffmpeg and capture stderr */
const ff = (args) => new Promise((ok, bad) => {
  const p = spawn("ffmpeg", ["-loglevel","error", ...args]);
  let err = "";
  p.stderr.on("data", d => err += d);
  p.on("close", c => c === 0 ? ok() : bad(new Error(err.trim() || `ffmpeg ${c}`)));
});

/* ───────── /uploadChunk – append to one .webm file ───────── */
app.post("/uploadChunk", upload.single("chunk"), (req, res) => {
  const { sessionId } = req.body;
  if (!sessionId || !req.file) return res.status(400).end();

  const sess = sessions[sessionId] ||= {
    webm: path.join(uploadsDir, `${sessionId}.webm`),
    lastText: "",
    busy: false,
    queued: false
  };

  fs.appendFileSync(sess.webm, fs.readFileSync(req.file.path));
  fs.unlinkSync(req.file.path);
  res.end();                             // 200
});

/* ───────── /flush – incremental transcription ───────── */
app.post("/flush", async (req, res) => {
  console.log("body",req.body);
  const { sessionId } = req.body;
  const sess = sessions[sessionId];
  if (!sess) return res.status(204).end();

  if (sess.busy) { sess.queued = true; return res.status(202).end(); }
  if (!fs.existsSync(sess.webm) || fs.statSync(sess.webm).size === 0)
    return res.status(204).end();

  sess.busy = true; sess.queued = false;
  const wav = path.join(uploadsDir, `${sessionId}.wav`);

  try {
    await ff(["-i", sess.webm, "-ac","1","-ar","16000","-c:a","pcm_s16le", wav, "-y"]);

    /* Whisper */
    const form = new FormData();
    form.append("file", fs.readFileSync(wav), { filename: "audio.wav" });
    form.append("model", "whisper-1");
    form.append("language", "ar");

    const apiKey = req.get("X-OPENAI-KEY");

    console.log("api key:",apiKey)

    const r = await fetch("https://api.openai.com/v1/audio/transcriptions", {
      method : "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        ...form.getHeaders()
      },
      body   : form
    });
    if (!r.ok) throw new Error(await r.text());
    const { text } = await r.json();

    fs.unlinkSync(wav);

    /* delta = new part only */
    const delta = text.startsWith(sess.lastText)
      ? text.slice(sess.lastText.length).trim()
      : text;                        // fallback if mismatch
    sess.lastText = text;

    res.json({ delta });             // can be empty string
  } catch (e) {
    console.error("flush", e);
    res.status(500).json({ error: e.toString() });
  } finally {
    sess.busy = false;
    if (sess.queued) setImmediate(() =>
      fetch("http://localhost:3001/flush", {
        method:"POST",
        headers:{ "Content-Type":"application/json" },
        body: JSON.stringify({ sessionId })
      }).catch(() => {})
    );
  }
});

/* ───────── /endSession – clean up ───────── */
app.post("/endSession", (req, res) => {
  const { sessionId } = req.body;
  const sess = sessions[sessionId];
  if (sess) {
    if (fs.existsSync(sess.webm)) fs.unlinkSync(sess.webm);
    delete sessions[sessionId];
  }
  res.end();
});

app.listen(port, () => console.log(`API  ➜  http://localhost:${port}`));
