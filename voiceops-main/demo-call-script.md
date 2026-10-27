# VoiceOps — Demo Call Script (record this as the demo audio)

**Purpose:** a realistic ~3-minute B2B SaaS **discovery call** deliberately seeded with clear
**action items (owner + date)**, **risks**, and **decisions**, so VoiceOps' extraction visibly "pops"
on camera. Two people read it (you + your friend). Speak naturally, don't rush — pauses are fine.

**Recording tips**
- Record as **WAV or MP3**, one shared mic is fine (Speechmatics diarization separates the two voices).
- Say the **names, dates, and numbers clearly** — those are the exact tokens the demo highlights.
- Target 2:30–3:30 of talking. Filename: `Client_Discovery_Call.mp3`.
- Meeting date to assume for the demo = **Monday, Aug 10, 2026** (so "Thursday" = Aug 13, "next Friday" = Aug 21).

**Cast**
- **Sarah** — Account Executive at *Northwind Analytics* (the vendor).
- **Marcus** — VP of Engineering at *Meridian Retail* (the prospect / customer).

---

**Sarah:** Hi Marcus, thanks for making the time. Last we spoke, your team was struggling to get
returns and inventory data into one place before the holiday season. Is that still the top priority?

**Marcus:** It is. Right now our returns analytics live in three different spreadsheets, and every
report is manual. With Q4 coming, that's just not going to scale.

**Sarah:** Got it. So the big one is the **returns-analytics use case** first, then inventory later?

**Marcus:** Exactly. If we can nail returns, that's the win. But I'll be honest — I have two concerns.
First, we're migrating off a **legacy Oracle system**, and I'm worried about how painful that data
migration is going to be.

**Sarah:** That's fair, and it's a common one. I'll **send you our migration guide and the API docs**
so your engineers can see exactly how the connector works.

**Marcus:** That would help. The second concern is budget. Our **budget for this quarter is basically
locked**, so anything we sign has to fit what's already approved, or it waits until Q1.

**Sarah:** Understood. Let me **put together a custom pricing proposal for twenty-five seats**, and I'll
size it to your current approved budget. I'll have that **to you by next Friday**.

**Marcus:** Appreciate it. I should also mention — we are **also evaluating DataBridge**, so you're not
the only option on the table.

**Sarah:** That's good to know, and I think we compare well, especially on the migration side. On
security — since you're retail, I'm guessing SOC 2 and data handling matter a lot?

**Marcus:** Huge. Nothing moves forward without our CISO signing off.

**Sarah:** Then let's get ahead of it. I'll **send over our security whitepaper and SOC 2 report by
Thursday**. Could you **loop in your CISO, Elena, for the technical review**?

**Marcus:** Yes, I'll bring Elena in. One hard line, though: this has to be **live before our Q4 peak in
November**. If it can't be, then honestly it's a no-go for this year.

**Sarah:** Clear. November is the deadline, or we revisit in Q1. So here's what I'd propose: let's
**move forward with a thirty-day pilot**, focused just on that returns use case, so your team sees real
value before any big commitment. How does that sound?

**Marcus:** I like that. Let's **do the thirty-day pilot**, returns first.

**Sarah:** Perfect. To kick it off, let's **schedule a technical deep-dive for next Tuesday at 2pm**
with your engineers and Elena, and we'll walk through the migration live.

**Marcus:** Tuesday at 2 works. I'll get Elena and one of my senior engineers on it.

**Sarah:** Excellent. So to recap — security docs to you Thursday, pricing proposal next Friday, and we
meet Tuesday at 2 for the deep-dive. I'll drive the migration piece from there.

**Marcus:** Sounds like a plan. Thanks, Sarah.

**Sarah:** Thank you, Marcus. Talk Tuesday.

---

## What VoiceOps should extract from this (your on-camera "answer key")

**Action items**
- Sarah → send **security whitepaper + SOC 2 report** — due **Thursday (Aug 13)**.
- Sarah → prepare **custom pricing proposal, 25 seats**, sized to approved budget — due **next Friday (Aug 21)**.
- Sarah → send **migration guide + API docs**.
- Marcus → **loop in CISO Elena** for the technical/security review.
- Both → **technical deep-dive, next Tuesday 2:00pm** (with Elena + a senior engineer).

**Risks**
- **Budget locked this quarter** — deal may slip to Q1 if it doesn't fit approved spend. *(High)*
- **Legacy Oracle migration** — technical risk / main objection. *(Medium–High)*
- **Competitor: DataBridge** also being evaluated. *(Medium)*
- **Hard deadline: live before Q4 peak (November)** or it's a no-go this year. *(High)*

**Decisions**
- Proceed with a **30-day pilot**, **returns-analytics use case first**.
- Deep-dive scheduled **Tuesday 2pm**.

**Call sentiment / temperature:** positive-but-conditional (buyer engaged; gated on budget, security sign-off, and the November deadline).
