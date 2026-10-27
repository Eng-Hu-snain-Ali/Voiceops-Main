# VoiceOps — AI Factory Hackathon Submission

**Turn meeting audio into action in under a minute** — a diarized transcript, an action board of
tasks / risks / decisions, a call-sentiment read, and a ready-to-send follow-up email. Every extracted
item is tied to a **verbatim quote** from the call, so VoiceOps never invents a commitment that wasn't made.

---

## ⭐ Judge's Quick Start (30 seconds, no setup)

> You do **not** need an API key or an upload to evaluate VoiceOps.

1. **Open the app:** `[ live public URL ]`
2. Click **"Load demo meeting."** A complete, real-shaped result renders instantly — action board,
   risk radar, decisions, sentiment, and the drafted follow-up email. This is the exact output of the
   live pipeline, seeded so the app is never blank and never depends on a slow network call on camera.
3. Click the **Risks** tab (or the red risk chip in the signal row) — this is our differentiator: most
   "AI notetakers" stop at a transcript; VoiceOps surfaces ranked risks and decisions, each backed by a quote.
4. Open the **Follow-up email** tab → **Copy email.**

**Want to see it run live?** Drop any 2-speaker audio file onto the uploader (or use
`demo-call-script.md` to record one). Ingest → Speechmatics transcription → LLM extraction runs
end-to-end in ~30s. If AI extraction ever fails, the transcript still shows and a one-click
**Retry extraction** appears — the app degrades gracefully, it never dead-ends.

**Links**
- 🔗 Live app (native.builder): `[ live public URL ]`
- 🎥 Demo video (≤3 min): `[ video URL ]`
- 💻 Public repo: `[ GitHub URL ]`
- 🖼️ Cover image: `proxy/public/og-cover.png` (1600×900)
- 📊 Pitch deck: `pitch-deck.html` → export to PDF

---

## What it is & who it's for

B2B **sales, customer-success, and product** teams lose 15–20 minutes after every call writing notes,
digging out commitments, and drafting the follow-up from memory. VoiceOps closes that gap: audio in,
an action cockpit out, in about a minute.

---

## How we score on the four criteria

| Criterion | How VoiceOps earns it |
|---|---|
| **Application of Technology** | Two integrations doing real work: **Speechmatics** batch API (speaker **diarization** + auto **summary** + **sentiment**) and an OpenAI-compatible LLM via **AI/ML API** that returns **strict JSON** (action items with owner + due date, ranked risks, decisions, follow-up email) with a **quote-grounding** rule and a **JSON-repair retry**. Served from a small zero-dependency Node engine; the app is built and deployed on **native.builder**. |
| **Presentation** | A polished multi-page product site (home / features / about / contact) plus the working tool, consistent brand, an animated hero, and a tight ≤3-min captioned demo. "Load demo meeting" means the demo is never blank or waiting on the network. |
| **Business Value** | Manual ≈20 min/call → ≈60 sec. For a 10-rep team that's **~16 hrs/week back** (≈ **$40k/yr**). Clear primary + secondary users and an obvious CRM-push expansion path. |
| **Originality** | Not another transcript tool. The **risk radar** (ranked low/med/high) and **decisions log**, plus the **quote-grounding** guarantee (no invented commitments), move VoiceOps out of the crowded "AI notetaker" bucket into post-call *intelligence*. |

---

## How native.builder was used

> **VoiceOps was built primarily in native.builder, which powers the application experience, workflows,
> data layer and deployment, while a small external engine handles the integrations that native.builder
> could not directly provide.**

native.builder is the primary build surface and the host the judges see at the public URL. Because
native.builder's no-code actions can't make the outbound HTTP calls the transcription/LLM APIs need, a
small companion **engine** (`proxy/server.mjs`, a zero-dependency Node service) runs those two
integrations and is called from the browser over HTTPS. All API keys live **server-side** in the engine —
never shipped to the browser, never committed.

---

## Integrations — honest status

- ✅ **Speechmatics** — live. Transcription, speaker diarization, summary, sentiment. (Verified end-to-end.)
- ✅ **AI/ML API** (OpenAI-compatible LLM) — live. Strict-JSON extraction + follow-up email, quote-grounded.
- 🛣️ **Bright Data** — **roadmap, not yet wired.** Planned firmographic enrichment for the companies and
  people named on a call. We list it as future work only; it is **not** counted among the working integrations.

> We deliberately claim **two live integrations, done well**, rather than inflate the count. If a judge
> inspects the engine, they'll find exactly `speechmatics.mjs` and `llm.mjs` — and nothing that pretends
> to be more than it is.

---

## Eligibility — built during the hackathon

VoiceOps was designed and built within the AI Factory hackathon window (**Aug 3–10, 2026**). The public
repository's commit history reflects work done during the event, and the integrations run on the
hackathon-provided partner credits (Speechmatics, AI/ML API). Team size meets the 2-person minimum.

---

## Tech & repo layout

**native.builder** (build + deploy) · **Speechmatics** · **AI/ML API** · **Node.js** (zero-dependency
engine) · **React + Canvas** (animated UI).

```
voiceops/
├── proxy/                  the engine + served web app
│   ├── server.mjs          static host + CORS API (one origin)
│   ├── speechmatics.mjs    submit / poll / fetch transcript (diarization+summary+sentiment)
│   ├── llm.mjs             strict-JSON extraction, quote-grounded, repair fallback
│   └── public/             index · features · about · contact · app (the tool)
├── native-builder/         the native.builder React component + integration guide
├── pitch-deck.html         8-slide deck (print → PDF)
├── cover-image.html        1600×900 cover (export → proxy/public/og-cover.png)
├── demo-call-script.md     2-speaker script to record a demo call
└── README.md
```

Run locally: `cd proxy && node server.mjs` → http://localhost:8787/ (see `README.md` for keys/deploy).
