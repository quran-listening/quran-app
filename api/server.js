// server.js
import express from "express";
import multer from "multer";
import fs from "fs";
import path from "path";
import { spawn } from "child_process";
import fetch from "node-fetch";

const app = express();
const port = 3001;

// Set up Multer to save uploaded chunks into a temporary directory
const upload = multer({ dest: "uploads/" });

// In-memory session storage for simplicity (in production, use persistent storage)
const sessions = {};

// Endpoint to receive an audio chunk (POST /uploadChunk)
// Client must provide a sessionId parameter (e.g., as a query parameter or field)
app.post("/uploadChunk", upload.single("chunk"), (req, res) => {
  const sessionId = req.body.sessionId;
  if (!sessionId) {
    return res.status(400).send("sessionId is required");
  }
  if (!sessions[sessionId]) {
    sessions[sessionId] = [];
  }
  // Save the file path in the session’s array
  sessions[sessionId].push(req.file.path);
  res.send("Chunk received");
});

// Endpoint to flush (combine) and transcribe the buffered audio chunks for a session
app.post("/flush", async (req, res) => {
  const { sessionId } = req.body;
  if (!sessionId || !sessions[sessionId] || sessions[sessionId].length === 0) {
    return res.status(400).send("No chunks to flush for given sessionId");
  }

  // Combine files using FFmpeg
  // Create a temporary text file listing all chunks:
  const listFile = `uploads/${sessionId}_list.txt`;
  const filesList = sessions[sessionId]
    .map((filePath) => `file '${path.resolve(filePath)}'`)
    .join("\n");
  fs.writeFileSync(listFile, filesList);

  // Output file
  const outputFile = `uploads/${sessionId}_combined.webm`;

  // FFmpeg command to concatenate WebM files (assumes same encoding and header)
  // Note: Concatenation may require re-encoding if the WebM files don’t line up exactly.
  // For a more robust solution, you might re-encode to WAV or another lossless format.
  const ffmpegArgs = [
    "-f",
    "concat",
    "-safe",
    "0",
    "-i",
    listFile,
    "-c",
    "copy",
    outputFile,
  ];

  const ffmpeg = spawn("ffmpeg", ffmpegArgs);

  ffmpeg.stderr.on("data", (data) => {
    console.log(`FFmpeg stderr: ${data}`);
  });

  ffmpeg.on("close", async (code) => {
    console.log(`FFmpeg process exited with code ${code}`);
    if (code !== 0) {
      return res.status(500).send("Failed to combine audio chunks");
    }

    // Now call OpenAI Whisper API with the combined file.
    const formData = new FormData();
    const combinedFileStream = fs.createReadStream(outputFile);
    formData.append("file", combinedFileStream, "audio.webm");
    formData.append("model", "whisper-1");
    formData.append("language", "ar");

    try {
      const response = await fetch("https://api.openai.com/v1/audio/transcriptions", {
        method: "POST",
        headers: {
          Authorization: `Bearer YOUR_OPENAI_API_KEY_HERE`,
        },
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.text();
        console.error("Whisper API error:", errorData);
        return res.status(response.status).send(errorData);
      }

      const data = await response.json();
      // Cleanup: remove the chunks, list file, and combined file
      sessions[sessionId].forEach((filePath) => fs.unlinkSync(filePath));
      fs.unlinkSync(listFile);
      fs.unlinkSync(outputFile);
      // Clear session buffer
      sessions[sessionId] = [];
      res.json({ transcription: data.text });
    } catch (err) {
      console.error("Error calling Whisper API:", err);
      res.status(500).send(err.toString());
    }
  });
});

app.listen(port, () => {
  console.log(`Local transcription service listening at http://localhost:${port}`);
});
