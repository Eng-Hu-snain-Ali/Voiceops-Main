// llm.mjs — LLM extraction step (OpenAI-compatible Chat Completions; works with AI/ML API, OpenAI, etc.).
// Zero external deps. If no LLM key is configured, callers should skip extraction gracefully.

const LLM_BASE_URL = process.env.LLM_BASE_URL || 'https://api.aimlapi.com/v1'; // AI/ML API is OpenAI-compatible
const LLM_MODEL = process.env.LLM_MODEL || 'gpt-4o-mini';

const SYSTEM_PROMPT = `You are VoiceOps, an assistant that turns a meeting/call transcript into structured, trustworthy output for a busy sales, customer-success, or product team. You extract ONLY what is actually said. You never invent facts, owners, dates, numbers, or commitments. When something is unclear or unstated, use null rather than guessing.

You are given MEETING_DATE (to resolve relative dates like "by Thursday") and a speaker-diarized TRANSCRIPT (lines like "S1: ..."/"S2: ..."). Infer a real name for a speaker ONLY if explicitly stated; otherwise keep the label.

Return a SINGLE valid JSON object and NOTHING else, with exactly this shape:
{
  "call_summary": string,
  "sentiment": "positive" | "neutral" | "negative" | "positive-conditional" | "negative-conditional",
  "action_items": [ { "task": string, "owner": string|null, "due_date": "YYYY-MM-DD"|null, "quote": string } ],
  "risks": [ { "risk": string, "severity": "low"|"medium"|"high", "quote": string } ],
  "decisions": [ { "decision": string, "quote": string } ],
  "follow_up_email": string
}

Rules: due_date must be a real ISO date derived from MEETING_DATE or null (never invented). Every item needs a short verbatim "quote" from the transcript. follow_up_email is from the host/seller to the other party, <=150 words, thanks + agreed next steps as bullets drawn only from action_items/decisions, ending with "[Your name]". If the transcript is empty, return empty arrays/nulls and a polite reconnect email.`;

export function isConfigured() {
  return Boolean(process.env.LLM_API_KEY);
}

export async function extract({ transcript, meetingDate, speechmaticsSummary = '' }) {
  const key = process.env.LLM_API_KEY;
  if (!key) throw new Error('LLM_API_KEY not set.');

  const userMessage =
    `MEETING_DATE: ${meetingDate || 'unknown'}\n\n` +
    `TRANSCRIPT:\n${transcript}\n\n` +
    `SPEECHMATICS_SUMMARY (optional):\n${speechmaticsSummary || '(none)'}\n\n` +
    `Return the JSON object now.`;

  const body = {
    model: LLM_MODEL,
    temperature: 0.2,
    response_format: { type: 'json_object' },
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: userMessage },
    ],
  };

  const res = await fetch(`${LLM_BASE_URL}/chat/completions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`LLM ${res.status}: ${text}`);
  const data = JSON.parse(text);
  const content = data.choices?.[0]?.message?.content ?? '';
  return parseOrRepair(content, key, body);
}

// Parse JSON; if it fails, ask the model once to repair it into valid JSON.
async function parseOrRepair(content, key, originalBody) {
  try { return JSON.parse(content); } catch { /* fall through to repair */ }
  const repair = {
    model: originalBody.model,
    temperature: 0,
    response_format: { type: 'json_object' },
    messages: [
      { role: 'system', content: 'The following was supposed to be a single valid JSON object but did not parse. Return the corrected, valid JSON object only, no other text.' },
      { role: 'user', content },
    ],
  };
  const res = await fetch(`${LLM_BASE_URL}/chat/completions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
    body: JSON.stringify(repair),
  });
  const t = await res.text();
  if (!res.ok) throw new Error(`LLM repair ${res.status}: ${t}`);
  const fixed = JSON.parse(t).choices?.[0]?.message?.content ?? '{}';
  return JSON.parse(fixed);
}

export { LLM_BASE_URL, LLM_MODEL };
