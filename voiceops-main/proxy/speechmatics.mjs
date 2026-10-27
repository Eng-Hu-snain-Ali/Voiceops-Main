// speechmatics.mjs — shared Speechmatics batch-transcription helpers (zero external deps; Node >= 18).
//
// ✅ SPEC VERIFIED end-to-end on 2026-08-09 via verify.mjs (job 189z34jg7h). Confirmed real:
//   - Base URL https://asr.api.speechmatics.com/v2 · Bearer auth
//   - POST /jobs (multipart: data_file + config) -> GET /jobs/{id} (status running->done)
//     -> GET /jobs/{id}/transcript?format=json-v2
//   - Flags accepted & working: transcription_config.diarization:"speaker", summarization_config:{}, sentiment_analysis_config:{}
//   - json-v2 top-level keys: format, job, metadata, results, sentiment_analysis, summary
//   - summary  = a bulleted STRING
//   - sentiment_analysis = { overall:{positive_count,neutral_count,negative_count}, speakers:[{speaker,...counts}] }
//   - .ogg accepted; ~12s for a ~500KB clip.

const BASE_URL = process.env.SPEECHMATICS_BASE_URL || 'https://asr.api.speechmatics.com/v2'; // CONFIRMED

function authHeaders() {
  const key = process.env.SPEECHMATICS_API_KEY;
  if (!key) throw new Error('SPEECHMATICS_API_KEY is not set in the environment.');
  return { Authorization: `Bearer ${key}` };
}

// Custom dictionary — fixes the exact brand/name ASR errors seen in verify.mjs
// ("Databricks"->DataBridge, "Cisco"->CISO, "go for"->Q4). Genuine Speechmatics feature; name it in the write-up.
// NOTE: re-run verify.mjs after changing this to confirm the config is still accepted.
export const DEMO_VOCAB = [
  'Q4', 'SOC 2',
  { content: 'DataBridge', sounds_like: ['data bridge'] },
  { content: 'CISO', sounds_like: ['sigh so', 'see so'] },
  'Northwind Analytics', 'Meridian Retail', 'Elena', 'Marcus', 'Sarah',
];

// The 3 features we deliberately enable: speaker diarization + summarization + sentiment. All CONFIRMED working.
export function defaultConfig({ additionalVocab = DEMO_VOCAB } = {}) {
  return {
    type: 'transcription',
    transcription_config: {
      language: 'en',
      operating_point: 'enhanced', // most accurate; swap to 'standard' if latency ever matters
      diarization: 'speaker',
      ...(additionalVocab?.length ? { additional_vocab: additionalVocab } : {}),
    },
    summarization_config: {},       // meeting summary (returns a bulleted string)
    sentiment_analysis_config: {},  // per-speaker sentiment counts
  };
}

// Submit an audio buffer as a batch job. Returns the Speechmatics job id.
export async function submitJob(audioBuffer, filename = 'call.wav', config = defaultConfig()) {
  const form = new FormData();
  form.append('data_file', new Blob([audioBuffer]), filename); // CONFIRMED field name
  form.append('config', JSON.stringify(config));               // CONFIRMED field name

  const res = await fetch(`${BASE_URL}/jobs`, { method: 'POST', headers: authHeaders(), body: form });
  const text = await res.text();
  if (!res.ok) throw new Error(`submitJob ${res.status}: ${text}`);
  const data = safeJson(text);
  const id = data.id || data.job?.id;
  if (!id) throw new Error(`submitJob: could not find job id in response: ${text}`);
  return id;
}

// Poll status. Returns the raw job object; caller reads .status ('running' | 'done' | 'rejected'). CONFIRMED
export async function getJob(jobId) {
  const res = await fetch(`${BASE_URL}/jobs/${jobId}`, { headers: authHeaders() });
  const text = await res.text();
  if (!res.ok) throw new Error(`getJob ${res.status}: ${text}`);
  const data = safeJson(text);
  return data.job || data;
}

// Fetch the finished transcript as json-v2 (words + speaker labels + summary + sentiment_analysis). CONFIRMED
export async function getTranscript(jobId) {
  const res = await fetch(`${BASE_URL}/jobs/${jobId}/transcript?format=json-v2`, { headers: authHeaders() });
  const text = await res.text();
  if (!res.ok) throw new Error(`getTranscript ${res.status}: ${text}`);
  return safeJson(text);
}

// Poll until done or timeout. onTick(status) lets callers log progress.
export async function waitForJob(jobId, { intervalMs = 3000, timeoutMs = 300000, onTick } = {}) {
  const start = Date.now();
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const job = await getJob(jobId);
    const status = job.status || 'unknown';
    if (onTick) onTick(status, job);
    if (status === 'done') return job;
    if (status === 'rejected' || status === 'error')
      throw new Error(`Job ${jobId} ${status}: ${JSON.stringify(job.errors || job)}`);
    if (Date.now() - start > timeoutMs) throw new Error(`Job ${jobId} timed out after ${timeoutMs}ms (last status: ${status})`);
    await sleep(intervalMs);
  }
}

// Reconstruct a diarized "S1: ... / S2: ..." transcript from a json-v2 payload. Defensive about shape.
export function diarizedText(transcript) {
  const results = transcript?.results || [];
  const lines = [];
  let curSpeaker = null;
  let buf = '';
  const flush = () => { if (buf.trim()) lines.push(`${curSpeaker ?? 'S?'}: ${buf.trim()}`); buf = ''; };
  for (const r of results) {
    const alt = (r.alternatives && r.alternatives[0]) || {};
    const isPunct = r.type === 'punctuation';
    const speaker = alt.speaker || curSpeaker || 'S?';
    if (!isPunct && speaker !== curSpeaker) { flush(); curSpeaker = speaker; }
    const content = alt.content ?? '';
    buf += isPunct ? content : (buf ? ' ' : '') + content;
  }
  flush();
  return lines.join('\n');
}

// Pull summary (string) + sentiment_analysis (counts object) out of a json-v2 payload. CONFIRMED shapes.
export function extractExtras(transcript) {
  const s = transcript?.summary;
  const summary = typeof s === 'string' ? s : (s?.content ?? null);
  const sentiment = transcript?.sentiment_analysis ?? null;
  return { summary, sentiment };
}

// Derive a simple "call temperature" label from Speechmatics' sentiment counts (a genuine, non-LLM metric).
export function sentimentLabel(sentimentAnalysis) {
  const o = sentimentAnalysis?.overall;
  if (!o) return null;
  const pos = o.positive_count || 0, neg = o.negative_count || 0, neu = o.neutral_count || 0;
  const total = pos + neg + neu || 1;
  if (pos / total > (neg / total) * 1.5) return 'positive';
  if (neg / total > pos / total) return 'negative';
  return 'neutral';
}

function safeJson(text) { try { return JSON.parse(text); } catch { return { _raw: text }; } }
function sleep(ms) { return new Promise((r) => setTimeout(r, ms)); }

export { BASE_URL };
