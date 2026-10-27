# VoiceOps app + proxy + verifier

Zero-dependency Node (>= 18) for the AI Factory hackathon build. Three jobs:

1. **`server.mjs` — the full VoiceOps web app.** Serves a polished single-page UI (`public/index.html`)
   **and** the Speechmatics/LLM API from one origin. Upload/record call audio → diarized transcript →
   action board (action items · risks · decisions) → one-click follow-up email. This is a genuinely
   deployable end-to-end app: it is our **R1 contingency** if native.builder can't call external APIs, the
   **blueprint** for what we rebuild inside native.builder, and a safe **demo target**.
2. **`verify.mjs` — self-verify Speechmatics with your own key.** Confirms the endpoints, feature flags, and
   output shape empirically against a real audio file. ✅ This closed plan Task #2.
3. **`speechmatics.mjs` / `llm.mjs`** — the reusable helpers both of the above share.

No `npm install` required (uses Node's built-in `fetch`, `FormData`, `http`, `fs`).

## Setup
```powershell
# PowerShell
cd C:\ZindiAfrica\voiceops\proxy
$env:SPEECHMATICS_API_KEY="sk_your_key"
# optional, to also test extraction:
# $env:LLM_API_KEY="your_aimlapi_key"; $env:LLM_BASE_URL="https://api.aimlapi.com/v1"; $env:LLM_MODEL="gpt-4o-mini"
```

## 1) Run the full VoiceOps app (recommended)
```powershell
node server.mjs   # -> http://localhost:8787/
```
Open **http://localhost:8787/** — upload or record audio, watch it transcribe, and see the action board +
follow-up email. The app is served from the same origin as the API, so there's no CORS/tunnel setup for
local use. Click **"Load demo meeting"** to see the finished UI instantly with no API calls (the R2
on-camera fallback). LLM extraction (action items/risks/email) only runs if `LLM_API_KEY` is set; without
it you still get the diarized transcript, summary, and sentiment from Speechmatics.

To let judges reach it: expose it with a tunnel (`cloudflared tunnel --url http://localhost:8787`) or deploy
`server.mjs` + `public/` to any Node host. **Never commit real keys** — use env vars / `.env` (git-ignored).

## 2) Verify Speechmatics end-to-end (CLI)
```powershell
node verify.mjs "C:\path\to\Client_Discovery_Call.mp3"
```
It submits a batch job, polls until done, prints the **top-level keys** of the transcript payload (so you
see exactly how summary/sentiment are named), the **diarized transcript**, and — if `LLM_API_KEY` is set —
the **structured extraction** JSON. On any error it prints Speechmatics' raw response body.

> No recording yet? Any short English `.mp3`/`.wav` works for a smoke test. For the real demo, record the
> two-person script in `../demo-call-script.md` **with two distinct voices** so diarization separates speakers.

## API endpoints (served by `server.mjs`)
- `GET  /` — the VoiceOps web app.
- `POST /transcribe` — body = raw audio bytes; optional header `X-Meeting-Date: 2026-08-10`;
  optional `?filename=call.mp3` → `{ jobId }`.
- `GET  /result/:jobId` → `{ status, transcript, summary, sentiment, structured }` (lazy-completes + caches).
- `GET  /health` → `{ ok: true }`.

## Files
- `server.mjs` — the VoiceOps app server + Speechmatics/LLM proxy (serves `public/` from the same origin).
- `public/index.html` — the full single-page VoiceOps UI (upload/record · transcript · action board · email).
- `speechmatics.mjs` — submit/poll/fetch + diarized-text + summary/sentiment extraction (spec ✅ verified).
- `llm.mjs` — OpenAI-compatible extraction with JSON mode + a repair fallback.
- `verify.mjs` — end-to-end CLI verifier.
- `.env.example` — copy to `.env`.
