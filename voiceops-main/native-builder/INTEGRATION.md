# VoiceOps × native.builder — integration guide

**Confirmed constraints (2026-08-09):** native.builder ✅ file upload · ✅ database · ✅ deploy to public URL ·
✅ custom code (HTML/JS) + iframe embed · ❌ no-code HTTP action · ❌ can't produce JSON. It IS served over HTTPS.

## Architecture

```
   native.builder app  (the primary build: UI + DB + deploy, HTTPS)
        │  browser fetch()  ← allowed from a custom-code block, even though the no-code HTTP action isn't
        ▼
   VoiceOps engine = voiceops/proxy/server.mjs   (must be HTTPS too — see below)
        ├── Speechmatics   (transcription · diarization · summary · sentiment)   $150 credits
        └── AI/ML API      (LLM extraction → action items / risks / decisions / email)   $10 credits
        ┄┄ Bright Data     (firmographic enrichment — roadmap, not yet wired)   5,000 credits
```

native.builder stays the app the judges see. The engine is a small "AI backend" the page calls from the
browser. Because `server.mjs` sends `Access-Control-Allow-Origin: *`, cross-origin calls work.

## ⚠️ The one hard rule: the engine must be HTTPS

native.builder pages are HTTPS, and a browser will **block** an HTTPS page calling an `http://` URL
(mixed content). So expose the engine over HTTPS:

```powershell
# terminal 1 — run the engine with your keys
cd C:\ZindiAfrica\voiceops\proxy
$env:SPEECHMATICS_API_KEY="sk_..."; $env:LLM_API_KEY="aimlapi_..."; $env:LLM_BASE_URL="https://api.aimlapi.com/v1"
node server.mjs                       # http://localhost:8787

# terminal 2 — give it a public HTTPS URL (either works)
cloudflared tunnel --url http://localhost:8787      # -> https://xxxx.trycloudflare.com
#   or:  ngrok http 8787
```
For a stable demo URL you can instead deploy `proxy/` (server.mjs + public/ + *.mjs) to Render/Railway —
both hand you HTTPS and let you set the keys as env vars. Never commit keys; use env vars only.

## Build steps

### 1. Scaffold the shell in native.builder
Prompt native.builder with something like:
> "Build **VoiceOps**, a SaaS app that turns sales-call audio into action. A dark animated hero, then an
> upload section, then a results dashboard with tabs for Action Items, Risks, Decisions, and a Follow-up
> Email. Add a **Meetings** database (title, date, audio, transcript, summary, sentiment) and an
> **ActionItems** table (meeting, task, owner, due_date, type). Deploy to a public URL."

### 2. Drop in the custom code
Add a **custom-code / React block** and paste `HeroBackground.jsx` + `VoiceOpsApp.jsx`. Render
`<VoiceOpsApp />`. At the top of `VoiceOpsApp.jsx` set:
```js
const ENGINE_URL = 'https://xxxx.trycloudflare.com'; // your HTTPS engine, no trailing slash
```
That's the whole live pipeline: upload → transcribe → action board → email. The **"Load demo meeting"**
button renders a finished result with zero API calls — your safe on-camera fallback (Risk R2).

If native.builder only allows an **iframe** in a given spot, embed the engine's own UI instead:
`https://xxxx.trycloudflare.com/` already serves the full app.

### 3. (Optional, stronger "data-driven" story) persist to native.builder's DB
After `run()` returns `result`, write a `Meetings` row + one `ActionItems` row per
`result.structured.action_items[]` using native.builder's own data binding, so past calls list natively.
This needs native.builder's client-side data API — tell me what that looks like and I'll wire it.

## Demo & submit checklist
- [ ] Engine live over HTTPS; `GET /health` returns `{ok:true}` from the tunnel URL.
- [ ] native.builder app deployed; open the public URL in an incognito window.
- [ ] Record the call from `../demo-call-script.md` with **two distinct voices** (clean diarization).
- [ ] Dry-run: upload the recording, confirm transcript + board + email populate.
- [ ] Keep one seeded demo meeting as the fallback; never show a raw error on camera.
- [ ] ≤3-min video; say **"built on native.builder, transcription by Speechmatics"** out loud.

## Files
- `HeroBackground.jsx` — animated constellation canvas for the hero (zero-dep, reduced-motion aware).
- `VoiceOpsApp.jsx` — the full animated page: hero + upload + processing + results, wired to the engine.
- engine lives in `../proxy/` (`server.mjs`, `speechmatics.mjs`, `llm.mjs`, `public/index.html`).
