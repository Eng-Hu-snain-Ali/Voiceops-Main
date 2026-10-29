# VoiceOps

**Turn call audio into action in about a minute.**

VoiceOps takes a recorded meeting or sales call and produces a speaker-diarized transcript, an action board (action items, ranked risks, decisions), a sentiment read, and a drafted follow-up email. Every extracted item is required to carry a verbatim quote from the transcript, so the output stays traceable to what was actually said.

Built for the **AI Factory Hackathon** (NativelyAI × lablab.ai), category *Data-driven apps with integrations*.

[![Node.js](https://img.shields.io/badge/node-%3E%3D18-339933?logo=node.js&logoColor=white)](https://nodejs.org/)
[![Dependencies](https://img.shields.io/badge/dependencies-0-brightgreen)](proxy/package.json)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue)](LICENSE)

---

## Table of Contents

- [Features](#features)
- [How It Works](#how-it-works)
- [Architecture](#architecture)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
- [Configuration](#configuration)
- [API Reference](#api-reference)
- [Output Schema](#output-schema)
- [Deployment](#deployment)
- [Verifying the Speechmatics Integration](#verifying-the-speechmatics-integration)
- [Demo Material](#demo-material)
- [Integrating with native.builder](#integrating-with-nativebuilder)
- [Security](#security)
- [Known Limitations](#known-limitations)
- [Roadmap](#roadmap)
- [Tech Stack](#tech-stack)
- [License](#license)

---

## Features

- **Speaker-diarized transcript** with an automatic summary and per-speaker sentiment counts (via Speechmatics).
- **Action board** with:
  - action items (task, owner, due date),
  - risks ranked `low` / `medium` / `high`,
  - decisions.
- **Quote grounding:** the extraction prompt requires a short verbatim quote for every action item, risk, and decision, and instructs the model to return `null` rather than guess an owner or date.
- **Follow-up email** (150 words or fewer), drafted from the extracted action items and decisions.
- **In-browser recording or file upload.**
- **Demo mode:** a "Load demo meeting" button renders a seeded result with no API calls.
- **Graceful degradation:** if no LLM key is configured, or extraction fails, the transcript, summary, and sentiment are still returned, and the UI offers a **Retry extraction** action (`?fresh=1`).
- **Zero runtime dependencies:** the engine uses only Node's built-in `http`, `fetch`, `FormData`, and `fs`.

## How It Works

| Step | Stage | What happens | Implemented in |
|------|-------|--------------|----------------|
| 1 | **Ingest** | The user uploads an audio file or records in the browser. | `proxy/public/app.html` |
| 2 | **Transcribe** | The audio is submitted to the [Speechmatics](https://www.speechmatics.com/) batch API with speaker diarization, summarization, and sentiment analysis enabled. | `proxy/speechmatics.mjs` |
| 3 | **Extract** | The diarized transcript is sent to an OpenAI-compatible LLM (default: [AI/ML API](https://aimlapi.com/), model `gpt-4o-mini`) in JSON mode. One repair attempt is made if the response is not valid JSON. | `proxy/llm.mjs` |
| 4 | **Act** | The dashboard shows the action board and a copyable follow-up email. | `proxy/public/app.html` |

Processing is asynchronous: `POST /transcribe` returns a job ID immediately, and the client polls `GET /result/:jobId` until the job is done. On the first poll that finds the Speechmatics job complete, the server fetches the transcript, runs the LLM extraction, and caches the result in memory.

## Architecture

```text
Browser (standalone UI served by the engine, or the native.builder React component)
        |
        |  POST /transcribe   GET /result/:jobId
        v
VoiceOps engine  —  proxy/server.mjs  (Node >= 18, no dependencies)
        |-- Speechmatics  ->  transcription, diarization, summary, sentiment
        '-- LLM provider  ->  action items, risks, decisions, follow-up email
```

The engine serves the web UI from `proxy/public/` and the API from the **same origin**, so no CORS or tunnel setup is needed for local use. It also sends permissive CORS headers (`Access-Control-Allow-Origin: *`) so a separately hosted front end, such as a native.builder page, can call it from the browser.

API keys are read from environment variables on the server and are never sent to the browser.

## Project Structure

```text
voiceops/
├── proxy/                       The engine and the served web app
│   ├── server.mjs               HTTP server: static files + API (/transcribe, /result, /health)
│   ├── speechmatics.mjs         Submit / poll / fetch transcript; diarized-text and sentiment helpers
│   ├── llm.mjs                  OpenAI-compatible extraction (JSON mode + repair retry)
│   ├── verify.mjs               CLI to verify the Speechmatics flow with your own key
│   ├── package.json             Scripts: start, verify (no dependencies)
│   └── public/                  index, features, about, contact, app (the tool), CSS/JS assets
├── native-builder/              React UI for a native.builder custom-code block
│   ├── VoiceOpsApp.jsx
│   ├── HeroBackground.jsx
│   └── INTEGRATION.md
├── demo-call-script.md          Two-speaker script for recording demo audio
├── llm-extraction-prompt.md     Extraction prompt and schema documentation
├── pitch-deck.html              Submission pitch deck (open in a browser, export to PDF)
├── cover-image.html             Cover image source (open in a browser, export to PNG)
├── SUBMISSION.md                Hackathon submission write-up
└── LICENSE                      MIT
```

## Getting Started

### Prerequisites

- **Node.js 18 or later** (built-in `fetch` and `FormData` are required).
- A **Speechmatics API key** (required).
- An **LLM API key** for an OpenAI-compatible endpoint (optional; without it you still get the transcript, summary, and sentiment).

### Run locally

1. **Set environment variables.**

   macOS / Linux:

   ```bash
   export SPEECHMATICS_API_KEY="your-speechmatics-key"
   export LLM_API_KEY="your-llm-key"
   export LLM_BASE_URL="https://api.aimlapi.com/v1"
   export LLM_MODEL="gpt-4o-mini"
   ```

   Windows PowerShell:

   ```powershell
   $env:SPEECHMATICS_API_KEY="your-speechmatics-key"
   $env:LLM_API_KEY="your-llm-key"
   $env:LLM_BASE_URL="https://api.aimlapi.com/v1"
   $env:LLM_MODEL="gpt-4o-mini"
   ```

2. **Start the server.** No `npm install` is needed.

   ```bash
   cd proxy
   node server.mjs      # or: npm start
   ```

   The startup log reports whether the Speechmatics key and LLM extraction are configured.

3. **Open the app** at <http://localhost:8787/>.

   - Click **Load demo meeting** to see a finished result with zero API calls.
   - Or upload or record a two-speaker audio clip to run the full pipeline.

## Configuration

All configuration is through environment variables, read in `proxy/server.mjs`, `proxy/speechmatics.mjs`, and `proxy/llm.mjs`.

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `SPEECHMATICS_API_KEY` | Yes | none | Speechmatics API key (Bearer auth). Requests fail with a clear error if unset. |
| `LLM_API_KEY` | No | none | Key for the LLM provider. If unset, LLM extraction is skipped. |
| `LLM_BASE_URL` | No | `https://api.aimlapi.com/v1` | Base URL of any OpenAI-compatible Chat Completions API. |
| `LLM_MODEL` | No | `gpt-4o-mini` | Model name sent to the provider. |
| `SPEECHMATICS_BASE_URL` | No | `https://asr.api.speechmatics.com/v2` | Override the Speechmatics API base URL. |
| `PORT` | No | `8787` | Port the server listens on. |

### Speechmatics job configuration

Defined in `defaultConfig()` in `proxy/speechmatics.mjs`:

- language `en`, operating point `enhanced`
- `diarization: "speaker"`
- `summarization_config` and `sentiment_analysis_config` enabled
- a custom vocabulary (`DEMO_VOCAB`) containing names and terms from the demo call script (for example *Northwind Analytics*, *Meridian Retail*, *DataBridge*). **Edit or remove this list for your own content.**

## API Reference

All routes are served by `proxy/server.mjs`.

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/` | The web app (static files from `proxy/public/`). |
| `GET` | `/health` | Liveness check. Returns `{ "ok": true }`. |
| `POST` | `/transcribe` | Submit audio. Body is the **raw audio bytes**. Returns `202` with `{ "jobId": "..." }`. |
| `GET` | `/result/:jobId` | Poll for the result. Add `?fresh=1` to discard the cached result and re-run extraction. |

**`POST /transcribe`**

- Optional header `X-Meeting-Date: YYYY-MM-DD`. It is used to resolve relative dates such as "by Thursday". Defaults to today's date.
- Optional query `?filename=call.mp3`. Defaults to `call.wav`.
- An empty body returns `400`.

**`GET /result/:jobId`**

- While Speechmatics is still working: `{ "status": "running", "speechmaticsStatus": "<status>" }`.
- When finished:

  ```json
  {
    "status": "done",
    "speechmaticsStatus": "done",
    "meetingDate": "2026-08-10",
    "transcript": "S1: ...\nS2: ...",
    "summary": "<bulleted string from Speechmatics>",
    "sentiment": { "overall": { "positive_count": 0, "neutral_count": 0, "negative_count": 0 }, "speakers": [] },
    "structured": { },
    "extractionError": null
  }
  ```

  `structured` is `null` if no LLM key is configured or extraction failed; in that case `extractionError` holds the error message when extraction was attempted.

**Example**

```bash
JOB=$(curl -s -X POST \
  -H "X-Meeting-Date: 2026-08-10" \
  --data-binary @call.mp3 \
  "http://localhost:8787/transcribe?filename=call.mp3" | jq -r .jobId)

curl -s "http://localhost:8787/result/$JOB" | jq
```

## Output Schema

The `structured` object returned by the LLM step (system prompt in `proxy/llm.mjs`, documented in `llm-extraction-prompt.md`):

```json
{
  "call_summary": "string",
  "sentiment": "positive | neutral | negative | positive-conditional | negative-conditional",
  "action_items": [
    { "task": "string", "owner": "string | null", "due_date": "YYYY-MM-DD | null", "quote": "string" }
  ],
  "risks": [
    { "risk": "string", "severity": "low | medium | high", "quote": "string" }
  ],
  "decisions": [
    { "decision": "string", "quote": "string" }
  ],
  "follow_up_email": "string"
}
```

Extraction rules enforced by the prompt: only extract what is said; use `null` for unknown owners and dates; `due_date` must be an ISO date derived from the meeting date; every item needs a verbatim quote. The model runs at `temperature: 0.2` with `response_format: json_object`.

## Deployment

The engine is a plain Node service and can run on any host that supports Node 18+.

For a platform such as Render or Railway:

- **Root directory:** `proxy/`
- **Start command:** `npm start`
- **Environment variables:** `SPEECHMATICS_API_KEY`, `LLM_API_KEY`, `LLM_BASE_URL`, `LLM_MODEL`

**HTTPS is required when called from an HTTPS page.** Browsers block HTTPS pages from calling `http://` endpoints (mixed content). If you embed the front end in an HTTPS host such as native.builder, the engine must also be served over HTTPS. For local demos, a tunnel works, for example `cloudflared tunnel --url http://localhost:8787` (or `ngrok http 8787`).

## Verifying the Speechmatics Integration

`proxy/verify.mjs` runs the Speechmatics flow end to end against a real audio file with your own key: it submits a batch job, polls until done, prints the top-level keys of the transcript payload, the diarized transcript, the summary, and the sentiment, and, if `LLM_API_KEY` is set, also runs the extraction step.

```bash
cd proxy
SPEECHMATICS_API_KEY="your-key" node verify.mjs ./Client_Discovery_Call.mp3
# or: npm run verify -- ./Client_Discovery_Call.mp3
```

## Demo Material

- **`demo-call-script.md`:** a roughly three-minute B2B discovery-call script (characters Sarah and Marcus) seeded with action items, risks, and decisions. Record it with two distinct voices for clean diarization. The script assumes a meeting date of 2026-08-10.
- **`pitch-deck.html`** and **`cover-image.html`:** open in a browser and export to PDF or PNG.
- **`SUBMISSION.md`:** the hackathon submission write-up.

## Integrating with native.builder

`native-builder/VoiceOpsApp.jsx` and `HeroBackground.jsx` are a React UI intended for a native.builder custom-code block. Set `ENGINE_URL` at the top of `VoiceOpsApp.jsx` (or pass an `engineUrl` prop) to your HTTPS engine URL. If only an iframe is available, you can embed the engine's own UI instead.

See [`native-builder/INTEGRATION.md`](native-builder/INTEGRATION.md) for the full guide.

## Security

- API keys are read from environment variables on the server and are not exposed to the browser.
- Static file serving normalizes paths and restricts them to `proxy/public/`.
- **Do not commit keys.** The repository as provided does not include a `.gitignore`; add one that excludes `.env`, key files, and audio recordings before publishing a fork.
- The API has **no authentication or rate limiting** and allows any origin (`Access-Control-Allow-Origin: *`). Anyone who can reach a deployed instance can submit audio and consume your Speechmatics and LLM credits. Add authentication, origin restrictions, and rate limiting before exposing it beyond a demo.

## Known Limitations

These follow directly from the current code:

- **In-memory state.** Job metadata and cached results live in process memory (`Map` objects in `server.mjs`) and are lost on restart. There is no database in the engine.
- **No request size limit on the server.** `POST /transcribe` buffers the full body in memory. The 150 MB limit shown in the UI is enforced client-side only.
- **English only.** The Speechmatics config is fixed to `language: "en"`.
- **Demo vocabulary.** The custom vocabulary targets the demo script's names and terms.
- **Model-dependent extraction.** Quote grounding and `null`-for-unknown are instructions in the prompt; the engine does not programmatically verify that each returned quote appears in the transcript.
- **No automated tests** are included in the repository.

## Roadmap

- **Firmographic enrichment** via [Bright Data](https://brightdata.com/) to add company and person context to the follow-up. *Planned; not implemented.* No code in this repository calls Bright Data.
- Persisting meetings and action items to a database (the native.builder integration guide describes an optional approach).

## Tech Stack

- **Backend:** Node.js (≥ 18), zero dependencies
- **Transcription:** Speechmatics batch API (diarization, summary, sentiment)
- **LLM:** any OpenAI-compatible Chat Completions API (AI/ML API by default)
- **Frontend:** vanilla HTML/CSS/JS (standalone app) and React + Canvas (native.builder component)
- **Build and hosting surface:** native.builder

## License

Released under the [MIT License](LICENSE).
