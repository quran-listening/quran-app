import express from "express";
import multer from "multer";
import fs from "fs";
import path from "path";
import cors from "cors";
import { spawn } from "child_process";
import fetch from "node-fetch";
import FormData from "form-data";
import dotenv from "dotenv";
import { corsOptions } from "./corsOptions.js";
import { BetaAnalyticsDataClient } from "@google-analytics/data";

dotenv.config();

/* ───── basic setup ───── */
const app = express();
app.use(cors({origin:'*'}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));


/* ---------- Google-Analytics client ---------- */
const analytics = new BetaAnalyticsDataClient(
  process.env.GA_KEY_JSON
    ? { credentials: JSON.parse(process.env.GA_KEY_JSON) }
    : { keyFile: process.env.GA_KEY_FILE }
);

const PROPERTY = `properties/${process.env.GA_PROPERTY_ID}`;
if (!process.env.GA_PROPERTY_ID) {
  throw new Error("GA_PROPERTY_ID env var is missing");
}

/* ---------- GA routes (MUST come AFTER analytics!) ---------- */

// realtime: activeUsers + eventCount
app.get("/api/ga/realtime", async (_, res) => {
  try {
    const [resp] = await analytics.runRealtimeReport({
      property: PROPERTY,
      dimensions: [{ name: "eventName" }],
      metrics: [{ name: "eventCount" }, { name: "activeUsers" }],
    });
    res.set("Cache-Control", "public,max-age=10");
    res.json(resp);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message });
  }
});

// last 7-days event counts
app.get("/api/ga/events", async (_, res) => {
  try {
    const [resp] = await analytics.runReport({
      property: PROPERTY,
      dateRanges: [{ startDate: "7daysAgo", endDate: "today" }],
      dimensions: [{ name: "eventName" }],
      metrics: [{ name: "eventCount" }],
      orderBys: [{ metric: { metricName: "eventCount" }, desc: true }],
    });
    res.set("Cache-Control", "public,max-age=300");
    res.json(resp);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message });
  }
});

/* ----- mini "overview" report (last-7-days) ----------------- */
app.get("/api/ga/overview", async (_, res) => {
  try {
    const [r] = await analytics.runReport({
      property: PROPERTY,                       // "properties/398765432"
      dateRanges: [{ startDate: "7daysAgo", endDate: "today" }],
      dimensions: [{ name: "date" }],           // yyyyMMdd string
      metrics: [
        { name: "activeUsers" },
        { name: "eventCount" },
        { name: "newUsers" }
      ],
      metricAggregations: ["TOTAL"],            // give us totals as well
      orderBys: [{ dimension: { dimensionName: "date" } }]
    });
    res.json(r);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message });
  }
});

const host  = process.env.HOST || '0.0.0.0';

const { FRONTEND_BASE_URL } = process.env

const port = process.env.PORT || 9091;




const uploadsDir = path.join(process.cwd(), "uploads");
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

const upload = multer({ dest: "uploads/" });

/* session = { webm, lastText, busy, queued } */
const sessions = Object.create(null);

/* helper: run ffmpeg and capture stderr */
const ff = (args) => new Promise((ok, bad) => {
  const p = spawn("ffmpeg", ["-loglevel", "error", ...args]);
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
  res.end(); // 200
});

/* ───────── /flush – incremental transcription ───────── */
app.post("/flush", async (req, res) => {
  console.log("body", req.body);
  const { sessionId,prompt } = req.body;
  const sess = sessions[sessionId];
  if (!sess) return res.status(204).end();

  if (sess.busy) { sess.queued = true; return res.status(202).end(); }
  if (!fs.existsSync(sess.webm) || fs.statSync(sess.webm).size === 0)
    return res.status(204).end();

  sess.busy = true; sess.queued = false;
  const wav = path.join(uploadsDir, `${sessionId}.wav`);

  try {
    await ff(["-i", sess.webm, "-ac", "1", "-ar", "16000", "-c:a", "pcm_s16le", wav, "-y"]);

    /* Whisper */
    const form = new FormData();
    form.append("file", fs.readFileSync(wav), { filename: "audio.wav" });
    form.append("model", "whisper-1");
    form.append("language", "ar");
    if (prompt) form.append("prompt", prompt);

    const apiKey = req.get("X-OPENAI-KEY");

    console.log("api key:", apiKey)

    const r = await fetch("https://api.openai.com/v1/audio/transcriptions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        ...form.getHeaders()
      },
      body: form
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
      fetch(`${FRONTEND_BASE_URL}/flush`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId })
      }).catch(() => { })
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

/* ───────── /deleteAudio – delete audio files ───────── */
app.post("/deleteAudio", (req, res) => {
  const { sessionId } = req.body;
  if (!sessionId) return res.status(400).json({ error: "sessionId is required" });

  const sess = sessions[sessionId];
  if (!sess) return res.status(404).json({ error: "Session not found" });

  try {
    // Delete webm file if it exists
    if (fs.existsSync(sess.webm)) {
      fs.unlinkSync(sess.webm);
    }

    // Delete wav file if it exists
    const wav = path.join(uploadsDir, `${sessionId}.wav`);
    if (fs.existsSync(wav)) {
      fs.unlinkSync(wav);
    }

    // Remove session from sessions object
    delete sessions[sessionId];

    res.json({ message: "Audio files deleted successfully" });
  } catch (e) {
    console.error("deleteAudio", e);
    res.status(500).json({ error: e.toString() });
  }
});

app.listen(port, () => console.log(`API  ➜  http://${host}:${port}`));

