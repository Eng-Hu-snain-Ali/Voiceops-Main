// server.mjs — VoiceOps app server + Speechmatics/LLM proxy. Zero external deps; Node >= 18.
// Serves the web app (./public) AND a tiny CORS-enabled API from one origin:
//
//   GET  /                   -> the VoiceOps web app (public/index.html)
//   POST /transcribe        body = raw audio bytes; optional header "X-Meeting-Date: 2026-08-10"
//                           -> { jobId }
//   GET  /result/:jobId     -> { status, speechmaticsStatus, transcript, summary, sentiment, structured }
//   GET  /health            -> { ok: true }
//
// The proxy submits audio to Speechmatics, and on completion fetches the transcript and runs the LLM
// extraction (if an LLM key is configured). Results are cached in memory per job id. Because the app is
// served from the same origin as the API, no CORS/tunnel gymnastics are needed for the happy path.

import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join, normalize, extname } from 'node:path';
import { submitJob, getJob, getTranscript, diarizedText, extractExtras } from './speechmatics.mjs';
import * as llm from './llm.mjs';

const PORT = Number(process.env.PORT || 8787);
const __dirname = dirname(fileURLToPath(import.meta.url));
const PUBLIC_DIR = join(__dirname, 'public');
const meta = new Map();   // jobId -> { meetingDate }
const cache = new Map();  // jobId -> finished result object

const MIME = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml', '.ico': 'image/x-icon',
  '.png': 'image/png', '.json': 'application/json',
};

const server = createServer(async (req, res) => {
  try {
    if (req.method === 'OPTIONS') return send(res, 204, '');

    const url = new URL(req.url, `http://localhost:${PORT}`);

    if (req.method === 'GET' && url.pathname === '/health') return json(res, 200, { ok: true });

    if (req.method === 'POST' && url.pathname === '/transcribe') {
      const audio = await readBody(req);
      if (!audio.length) return json(res, 400, { error: 'empty body: POST the raw audio bytes' });
      const meetingDate = req.headers['x-meeting-date'] || new Date().toISOString().slice(0, 10);
      const filename = url.searchParams.get('filename') || 'call.wav';
      const jobId = await submitJob(audio, filename);
      meta.set(jobId, { meetingDate });
      return json(res, 202, { jobId });
    }

    if (req.method === 'GET' && url.pathname.startsWith('/result/')) {
      const jobId = decodeURIComponent(url.pathname.slice('/result/'.length));
      const fresh = url.searchParams.get('fresh') === '1';  // Retry: re-run extraction, bypassing the cache
      if (fresh) cache.delete(jobId);
      if (cache.has(jobId)) return json(res, 200, cache.get(jobId));

      const job = await getJob(jobId);
      const status = job.status || 'unknown';
      if (status !== 'done') return json(res, 200, { status: 'running', speechmaticsStatus: status });

      // First time we see 'done' for this job: fetch transcript + run extraction, then cache.
      const transcript = await getTranscript(jobId);
      const diarized = diarizedText(transcript);
      const { summary, sentiment } = extractExtras(transcript);
      const meetingDate = meta.get(jobId)?.meetingDate || new Date().toISOString().slice(0, 10);

      let structured = null;
      let extractionError = null;
      if (llm.isConfigured()) {
        try {
          structured = await llm.extract({ transcript: diarized, meetingDate, speechmaticsSummary: typeof summary === 'string' ? summary : '' });
        } catch (e) { extractionError = e.message; }
      }

      const result = { status: 'done', speechmaticsStatus: status, meetingDate, transcript: diarized, summary, sentiment, structured, extractionError };
      cache.set(jobId, result);
      return json(res, 200, result);
    }

    // Static: serve the VoiceOps web app from ./public (so the whole app runs from one origin).
    if (req.method === 'GET') {
      const rel = url.pathname === '/' ? '/index.html' : url.pathname;
      const filePath = normalize(join(PUBLIC_DIR, rel));
      if (filePath.startsWith(PUBLIC_DIR)) {
        try {
          const buf = await readFile(filePath);
          return send(res, 200, buf, MIME[extname(filePath)] || 'application/octet-stream');
        } catch { /* fall through to 404 */ }
      }
    }

    return json(res, 404, { error: 'not found', routes: ['GET /', 'POST /transcribe', 'GET /result/:jobId', 'GET /health'] });
  } catch (err) {
    return json(res, 500, { error: err.message });
  }
});

server.listen(PORT, () => {
  console.log(`VoiceOps app + proxy on http://localhost:${PORT}`);
  console.log(`  Open the app     : http://localhost:${PORT}/`);
  console.log(`  Speechmatics key : ${process.env.SPEECHMATICS_API_KEY ? 'set ✅' : 'MISSING ❌'}`);
  console.log(`  LLM extraction   : ${llm.isConfigured() ? 'enabled ✅' : 'disabled (set LLM_API_KEY)'}`);
});

// --- helpers ---
function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', (c) => chunks.push(c));
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}
function cors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Meeting-Date');
}
function send(res, status, body, type = 'text/plain') {
  cors(res);
  res.writeHead(status, { 'Content-Type': type });
  res.end(body);
}
function json(res, status, obj) { send(res, status, JSON.stringify(obj), 'application/json'); }
