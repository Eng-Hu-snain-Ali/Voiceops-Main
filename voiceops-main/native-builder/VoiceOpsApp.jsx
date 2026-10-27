import React, { useEffect, useRef, useState } from 'react';
import HeroBackground from './HeroBackground';

/**
 * VoiceOpsApp — the full, fully-animated VoiceOps page for native.builder.
 *
 * native.builder is the app shell (hosting + DB + deploy). This component is the UI and it calls our
 * external "engine" (voiceops/proxy/server.mjs) from the BROWSER via fetch — which is allowed even though
 * native.builder's no-code actions can't make HTTP calls. The engine does Speechmatics + LLM extraction.
 *
 * ⚠️ HTTPS: native.builder serves over https, so the engine MUST be https too (mixed-content is blocked).
 *    Run:  cloudflared tunnel --url http://localhost:8787   → paste the https URL below.
 */
const ENGINE_URL = 'https://REPLACE-WITH-YOUR-ENGINE.trycloudflare.com'; // <-- set this (no trailing slash)

export default function VoiceOpsApp({ engineUrl = ENGINE_URL }) {
  const [file, setFile] = useState(null);
  const [meetingDate, setMeetingDate] = useState('2026-08-10');
  const [phase, setPhase] = useState('idle');      // idle | upload | transcribe | extract | done | error
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const engine = (engineUrl || '').replace(/\/$/, '');

  async function run() {
    if (!file) return;
    setPhase('upload'); setError(''); setResult(null);
    try {
      const buf = await file.arrayBuffer();
      const res = await fetch(`${engine}/transcribe?filename=${encodeURIComponent(file.name)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/octet-stream', 'X-Meeting-Date': meetingDate },
        body: buf,
      });
      if (!res.ok) throw new Error(`Upload failed (${res.status})`);
      const { jobId } = await res.json();
      setPhase('transcribe');
      const data = await poll(engine, jobId);
      if (data.structured) setPhase('extract');
      setResult(data); setPhase('done');
    } catch (e) {
      setError(e.message + (engine.includes('REPLACE') ? '  — set your HTTPS engine URL at the top of VoiceOpsApp.jsx.' : ''));
      setPhase('error');
    }
  }

  return (
    <div style={S.page}>
      <StyleInjector />

      {/* HERO */}
      <section style={S.hero}>
        <HeroBackground />
        <div style={S.heroInner} className="vo-fade-up">
          <span style={S.heroPill} className="vo-float">🎧 VoiceOps</span>
          <h1 style={S.h1}>Turn call audio into <span style={S.grad}>action</span> in 60 seconds.</h1>
          <p style={S.sub}>
            Upload a sales or customer call. Get a diarized transcript, an action board of tasks, risks &amp;
            decisions, and a ready-to-send follow-up email — powered by Speechmatics.
          </p>
          <div style={S.heroBtns}>
            <a href="#app" style={{ ...S.btn, ...S.btnPrimary }} className="vo-cta">Try it now ↓</a>
            <button style={{ ...S.btn, ...S.btnGhostDark }} onClick={() => setResult(DEMO_RESULT)}>See a demo</button>
          </div>
        </div>
      </section>

      {/* VALUE STRIP */}
      <Reveal><section style={S.strip}>
        {[['⏱️', '20 min → 60 sec', 'per call, from audio to follow-up'],
          ['🎯', '0 missed actions', 'every task, owner & due date captured'],
          ['🔌', '2 integrations', 'Speechmatics · AI/ML API']].map(([i, t, d]) => (
          <div key={t} style={S.stat}><div style={S.statIcon}>{i}</div><b style={S.statT}>{t}</b><span style={S.statD}>{d}</span></div>
        ))}
      </section></Reveal>

      {/* APP */}
      <main id="app" style={S.main}>
        <Reveal><Ingest {...{ file, setFile, meetingDate, setMeetingDate, phase, run, loadDemo: () => setResult(DEMO_RESULT) }} /></Reveal>
        {phase !== 'idle' && phase !== 'done' && phase !== 'error' && <Processing phase={phase} />}
        {phase === 'error' && <div style={S.err} className="vo-fade-up">⚠ {error}</div>}
        {result && <Results result={result} />}
      </main>

      <footer style={S.footer}>
        Built on <b>native.builder</b> · transcription &amp; diarization by <b>Speechmatics</b> ·
        extraction by AI/ML API.
      </footer>
    </div>
  );
}

/* ---------------- ingest ---------------- */
function Ingest({ file, setFile, meetingDate, setMeetingDate, phase, run, loadDemo }) {
  const inputRef = useRef(null);
  const [hover, setHover] = useState(false);
  const busy = phase === 'upload' || phase === 'transcribe' || phase === 'extract';
  return (
    <section style={S.card} className="vo-card">
      <h2 style={S.h2}>New meeting</h2>
      <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', alignItems: 'flex-end' }}>
        <div
          style={{ ...S.drop, ...(hover ? S.dropHover : {}) }}
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => { e.preventDefault(); setHover(true); }}
          onDragLeave={() => setHover(false)}
          onDrop={(e) => { e.preventDefault(); setHover(false); if (e.dataTransfer.files[0]) setFile(e.dataTransfer.files[0]); }}
        >
          {file ? <span style={S.fileChip}>🎵 {file.name}</span>
                : <><b>Drop an audio file</b> or click to browse<br /><small style={{ color: '#94a3b8' }}>.mp3 · .wav · .m4a · .ogg · .webm</small></>}
          <input ref={inputRef} type="file" accept="audio/*" hidden onChange={(e) => e.target.files[0] && setFile(e.target.files[0])} />
        </div>
        <label style={S.field}><span style={S.lbl}>Meeting date</span>
          <input type="date" value={meetingDate} onChange={(e) => setMeetingDate(e.target.value)} style={S.input} />
        </label>
      </div>
      <div style={{ display: 'flex', gap: 10, marginTop: 16, flexWrap: 'wrap' }}>
        <button style={{ ...S.btn, ...S.btnPrimary, opacity: file && !busy ? 1 : 0.5 }} disabled={!file || busy} onClick={run}>
          {busy ? 'Working…' : 'Transcribe & extract'}
        </button>
        <button style={{ ...S.btn, ...S.btnGhost }} onClick={loadDemo}>Load demo meeting</button>
      </div>
    </section>
  );
}

/* ---------------- processing ---------------- */
function Processing({ phase }) {
  const steps = [['upload', 'Uploading audio'], ['transcribe', 'Transcribing (Speechmatics)'], ['extract', 'Extracting actions (AI/ML API)']];
  const idx = steps.findIndex(([k]) => k === phase);
  return (
    <section style={S.card} className="vo-card">
      <h2 style={S.h2}>Processing</h2>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {steps.map(([k, label], i) => (
          <div key={k} style={{ ...S.step, ...(i < idx ? S.stepDone : i === idx ? S.stepActive : {}) }}>
            {i < idx ? '✓' : i === idx ? <span style={S.spinner} className="vo-spin" /> : '○'} {label}
          </div>
        ))}
      </div>
    </section>
  );
}

/* ---------------- results ---------------- */
function Results({ result }) {
  const [tab, setTab] = useState('board');
  const [board, setBoard] = useState('actions');
  const [copied, setCopied] = useState(false);
  const s = result.structured || {};
  const actions = s.action_items || [], risks = s.risks || [], decisions = s.decisions || [];
  const sentiment = sentimentMeta(s.sentiment || sentimentFromCounts(result.sentiment));

  return (
    <section style={S.card} className="vo-card vo-fade-up" key={result.meetingDate + (s.call_summary || '')}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: 260 }}>
          <div style={S.meta}>Meeting date: {result.meetingDate || '—'}</div>
          <p style={{ margin: 0, fontSize: 15 }}>{s.call_summary || stripBullets(result.summary) || 'No summary.'}</p>
        </div>
        <span style={{ ...S.badge, ...sentiment.style }}>Call temperature: {sentiment.label}</span>
      </div>

      <div style={S.tabs}>
        {[['board', 'Action board'], ['transcript', 'Transcript'], ['email', 'Follow-up email']].map(([k, l]) => (
          <div key={k} onClick={() => setTab(k)} style={{ ...S.tab, ...(tab === k ? S.tabActive : {}) }}>{l}</div>
        ))}
      </div>

      {tab === 'board' && (
        <div className="vo-fade-up">
          <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
            {[['actions', `Action items (${actions.length})`], ['risks', `Risks (${risks.length})`], ['decisions', `Decisions (${decisions.length})`]].map(([k, l]) => (
              <div key={k} onClick={() => setBoard(k)} style={{ ...S.bTab, ...(board === k ? S.bTabActive : {}) }}>{l}</div>
            ))}
          </div>
          {board === 'actions' && (actions.length ? actions.map((a, i) => (
            <Item key={i}><b>{a.task}</b>
              <div style={S.metaLine}><span>👤 <b>{a.owner || 'Unassigned'}</b></span><span>📅 <b>{a.due_date || 'No date'}</b></span></div>
              <Quote q={a.quote} />
            </Item>)) : <Empty t="No action items detected." />)}
          {board === 'risks' && (risks.length ? risks.map((r, i) => (
            <Item key={i}><div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}><b>{r.risk}</b><Pill sev={r.severity} /></div><Quote q={r.quote} /></Item>
          )) : <Empty t="No risks flagged." />)}
          {board === 'decisions' && (decisions.length ? decisions.map((d, i) => (
            <Item key={i}><b>{d.decision}</b><Quote q={d.quote} /></Item>
          )) : <Empty t="No decisions recorded." />)}
        </div>
      )}

      {tab === 'transcript' && <div className="vo-fade-up">{renderTranscript(result.transcript)}</div>}

      {tab === 'email' && (
        <div className="vo-fade-up">
          <div style={S.email}>{s.follow_up_email || 'No follow-up email generated.'}</div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 12, gap: 12, alignItems: 'center' }}>
            {copied && <span style={{ color: '#16a34a', fontWeight: 600, fontSize: 13 }}>Copied ✓</span>}
            <button style={{ ...S.btn, ...S.btnPrimary }} onClick={() => { navigator.clipboard?.writeText(s.follow_up_email || ''); setCopied(true); setTimeout(() => setCopied(false), 2000); }}>Copy email</button>
          </div>
        </div>
      )}
    </section>
  );
}

const Item = ({ children }) => <div style={S.item} className="vo-item">{children}</div>;
const Quote = ({ q }) => q ? <div style={S.quote}>“{q}”</div> : null;
const Empty = ({ t }) => <div style={S.empty}>{t}</div>;
const Pill = ({ sev = 'low' }) => <span style={{ ...S.pill, ...(S['pill_' + sev] || S.pill_low) }}>{String(sev).toUpperCase()}</span>;

function renderTranscript(t) {
  if (!t) return <Empty t="No transcript." />;
  const map = {}; let n = 0;
  const colors = ['#4d7c0f', '#0f766e', '#0891b2'];
  return t.split('\n').filter(Boolean).map((line, i) => {
    const m = line.match(/^([^:]{1,20}):\s*(.*)$/);
    const who = m ? m[1] : 'S?', said = m ? m[2] : line;
    if (!(who in map)) map[who] = colors[n++ % 3];
    return <div key={i} style={S.turn}><div style={{ ...S.who, color: map[who] }}>{who}</div><div style={{ fontSize: 14.5 }}>{said}</div></div>;
  });
}

/* ---------------- helpers ---------------- */
async function poll(engine, jobId, tries = 100) {
  for (let i = 0; i < tries; i++) {
    const r = await fetch(`${engine}/result/${encodeURIComponent(jobId)}`);
    if (!r.ok) throw new Error(`Result fetch failed (${r.status})`);
    const d = await r.json();
    if (d.status === 'done') return d;
    await new Promise((s) => setTimeout(s, 3000));
  }
  throw new Error('Timed out waiting for transcription.');
}
function sentimentFromCounts(sa) { const o = sa && sa.overall; if (!o) return 'neutral'; const p = o.positive_count || 0, n = o.negative_count || 0; return p > n * 1.5 ? 'positive' : n > p ? 'negative' : 'neutral'; }
function sentimentMeta(v) {
  const x = (v || 'neutral').toLowerCase();
  if (x.includes('conditional')) return { label: (x.includes('neg') ? 'Negative' : 'Positive') + ' · conditional', style: { background: '#fef3c7', color: '#d97706' } };
  if (x.includes('positive')) return { label: 'Positive', style: { background: '#dcfce7', color: '#16a34a' } };
  if (x.includes('negative')) return { label: 'Negative', style: { background: '#fee2e2', color: '#dc2626' } };
  return { label: 'Neutral', style: { background: '#f1f5f9', color: '#64748b' } };
}
function stripBullets(s) { return typeof s === 'string' ? s.replace(/\n?[•\-]\s*/g, ' ').trim() : ''; }

/* reveal-on-scroll wrapper */
function Reveal({ children }) {
  const ref = useRef(null); const [seen, setSeen] = useState(false);
  useEffect(() => {
    const el = ref.current; if (!el) return;
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setSeen(true); io.disconnect(); } }, { threshold: 0.15 });
    io.observe(el); return () => io.disconnect();
  }, []);
  return <div ref={ref} className={seen ? 'vo-reveal vo-reveal-in' : 'vo-reveal'}>{children}</div>;
}

function StyleInjector() {
  useEffect(() => {
    if (document.getElementById('vo-anim')) return;
    const el = document.createElement('style'); el.id = 'vo-anim';
    el.textContent = `
      @keyframes voFadeUp{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:none}}
      @keyframes voFloat{0%,100%{transform:translateY(0)}50%{transform:translateY(-6px)}}
      @keyframes voSpin{to{transform:rotate(360deg)}}
      @keyframes voPulse{0%,100%{box-shadow:0 0 0 0 rgba(134,213,25,.4)}50%{box-shadow:0 0 0 10px rgba(134,213,25,0)}}
      .vo-fade-up{animation:voFadeUp .5s ease both}
      .vo-float{animation:voFloat 3.5s ease-in-out infinite}
      .vo-spin{animation:voSpin .8s linear infinite}
      .vo-cta{animation:voPulse 2.4s ease-in-out infinite}
      .vo-reveal{opacity:0;transform:translateY(22px);transition:opacity .6s ease,transform .6s ease}
      .vo-reveal-in{opacity:1;transform:none}
      .vo-card{transition:transform .2s ease,box-shadow .2s ease}
      .vo-card:hover{transform:translateY(-2px);box-shadow:0 12px 30px rgba(16,24,40,.10)}
      .vo-item{transition:transform .15s ease,border-color .15s ease}
      .vo-item:hover{transform:translateX(3px);border-color:#c7cbe0}
      @media (prefers-reduced-motion: reduce){*{animation:none!important;transition:none!important}.vo-reveal{opacity:1;transform:none}}
    `;
    document.head.appendChild(el);
  }, []);
  return null;
}

/* ---------------- styles ---------------- */
const S = {
  page: { fontFamily: 'ui-sans-serif,system-ui,-apple-system,"Segoe UI",Roboto,sans-serif', color: '#0f172a', background: '#f6f7fb', minHeight: '100vh' },
  hero: { position: 'relative', minHeight: '78vh', display: 'grid', placeItems: 'center', overflow: 'hidden', textAlign: 'center', padding: '40px 20px' },
  heroInner: { position: 'relative', zIndex: 1, maxWidth: 760 },
  heroPill: { display: 'inline-block', color: '#d9f99d', background: 'rgba(255,255,255,.1)', border: '1px solid rgba(255,255,255,.18)', padding: '6px 14px', borderRadius: 999, fontWeight: 700, fontSize: 13, marginBottom: 18 },
  h1: { color: '#fff', fontSize: 'clamp(30px,5vw,52px)', lineHeight: 1.08, letterSpacing: '-.02em', margin: '0 0 16px' },
  grad: { background: 'linear-gradient(90deg,#86d519,#d8e81a)', WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent' },
  sub: { color: '#cbd5e1', fontSize: 'clamp(15px,2vw,18px)', margin: '0 auto 26px', maxWidth: 620 },
  heroBtns: { display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' },
  btn: { font: 'inherit', fontWeight: 700, cursor: 'pointer', borderRadius: 12, padding: '12px 22px', border: '1px solid transparent', textDecoration: 'none', display: 'inline-block' },
  btnPrimary: { background: '#86d519', color: '#0a2100' },
  btnGhost: { background: '#fff', border: '1px solid #e5e8f0', color: '#0f172a' },
  btnGhostDark: { background: 'rgba(255,255,255,.08)', border: '1px solid rgba(255,255,255,.22)', color: '#fff' },
  strip: { maxWidth: 980, margin: '-40px auto 0', position: 'relative', zIndex: 2, display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))', gap: 16, padding: '0 20px' },
  stat: { background: '#fff', border: '1px solid #e5e8f0', borderRadius: 14, padding: 20, boxShadow: '0 8px 24px rgba(16,24,40,.06)' },
  statIcon: { fontSize: 24 }, statT: { display: 'block', fontSize: 20, margin: '6px 0 2px' }, statD: { color: '#64748b', fontSize: 13.5 },
  main: { maxWidth: 980, margin: '0 auto', padding: '36px 20px 20px' },
  card: { background: '#fff', border: '1px solid #e5e8f0', borderRadius: 14, boxShadow: '0 1px 2px rgba(16,24,40,.06),0 8px 24px rgba(16,24,40,.06)', padding: 22, marginBottom: 22 },
  h2: { fontSize: 14, letterSpacing: '.03em', textTransform: 'uppercase', color: '#64748b', margin: '0 0 14px' },
  drop: { flex: 1, minWidth: 240, border: '1.5px dashed #c7cbe0', borderRadius: 12, padding: 18, textAlign: 'center', color: '#64748b', background: '#fbfbff', cursor: 'pointer' },
  dropHover: { borderColor: '#86d519', background: '#f0fbe6', color: '#3f6212' },
  fileChip: { display: 'inline-block', background: '#f0fbe6', color: '#3f6212', padding: '6px 12px', borderRadius: 999, fontWeight: 700, fontSize: 13 },
  field: { display: 'flex', flexDirection: 'column', gap: 6 }, lbl: { fontSize: 12, color: '#64748b', fontWeight: 600 },
  input: { font: 'inherit', padding: '10px 12px', border: '1px solid #e5e8f0', borderRadius: 10 },
  step: { display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, color: '#64748b', background: '#f1f5f9', padding: '8px 14px', borderRadius: 999 },
  stepActive: { color: '#3f6212', background: '#f0fbe6', fontWeight: 600 }, stepDone: { color: '#16a34a', background: '#dcfce7' },
  spinner: { width: 14, height: 14, border: '2px solid #d3e6b8', borderTopColor: '#86d519', borderRadius: '50%', display: 'inline-block' },
  err: { color: '#dc2626', background: '#fee2e2', border: '1px solid #fbcaca', padding: '12px 14px', borderRadius: 10, marginBottom: 22 },
  meta: { fontSize: 13, color: '#64748b', marginBottom: 6 },
  badge: { fontSize: 12.5, fontWeight: 700, padding: '7px 14px', borderRadius: 999, whiteSpace: 'nowrap', height: 'fit-content' },
  tabs: { display: 'flex', gap: 4, borderBottom: '1px solid #e5e8f0', margin: '18px 0 20px' },
  tab: { padding: '11px 16px', fontWeight: 600, color: '#64748b', cursor: 'pointer', borderBottom: '2px solid transparent', marginBottom: -1 },
  tabActive: { color: '#3f6212', borderBottomColor: '#86d519' },
  bTab: { fontSize: 14, fontWeight: 600, padding: '7px 14px', borderRadius: 999, cursor: 'pointer', background: '#f1f5f9', color: '#64748b' },
  bTabActive: { background: '#86d519', color: '#0a2100' },
  item: { border: '1px solid #e5e8f0', borderRadius: 12, padding: '14px 16px', marginBottom: 12 },
  metaLine: { display: 'flex', gap: 16, flexWrap: 'wrap', marginTop: 8, fontSize: 13, color: '#64748b' },
  quote: { marginTop: 8, fontSize: 13, color: '#64748b', borderLeft: '3px solid #e5e8f0', paddingLeft: 10, fontStyle: 'italic' },
  pill: { fontSize: 12, fontWeight: 700, padding: '4px 10px', borderRadius: 999, whiteSpace: 'nowrap', height: 'fit-content' },
  pill_high: { background: '#fee2e2', color: '#dc2626' }, pill_medium: { background: '#fef3c7', color: '#d97706' }, pill_low: { background: '#f1f5f9', color: '#64748b' },
  empty: { color: '#64748b', textAlign: 'center', padding: 28, fontSize: 14 },
  turn: { display: 'flex', gap: 12, padding: '9px 0', borderBottom: '1px solid #f1f5f9' }, who: { flex: 'none', width: 80, fontWeight: 700, fontSize: 13 },
  email: { whiteSpace: 'pre-wrap', fontSize: 14.5, background: '#fbfbff', border: '1px solid #e5e8f0', borderRadius: 12, padding: 18 },
  footer: { textAlign: 'center', color: '#64748b', fontSize: 12.5, padding: '10px 20px 48px' },
};

/* ---------------- seeded demo (matches demo-call-script.md) ---------------- */
const DEMO_RESULT = {
  status: 'done', meetingDate: '2026-08-10',
  transcript: [
    'Sarah: Thanks for making time today, Marcus. I know things are busy over at Meridian Retail.',
    "Marcus: Of course. We're under real pressure to get our returns analytics live before the November peak.",
    'Marcus: Honestly, our data is trapped in an Oracle warehouse and the migration scares me.',
    "Sarah: Understood. We support Oracle out of the box, and I'll send our migration guide and the API docs.",
    'Marcus: I should mention we’re also evaluating DataBridge — their pricing came in aggressive.',
    "Sarah: Let's prove value in a pilot. I'd propose a 30-day pilot focused on returns first.",
    'Marcus: A returns-first pilot works. But budget is locked for this fiscal year; anything beyond the pilot needs finance approval.',
    'Marcus: Can you get the SOC 2 and security whitepaper over by Thursday? I need to loop in our CISO, Elena.',
    "Sarah: Absolutely — whitepaper and SOC 2 by Thursday, and a pricing proposal for twenty-five seats by next Friday.",
    'Marcus: Great. Let’s get engineers together for a technical deep-dive — does Tuesday at 2pm work?',
    "Sarah: Tuesday at 2pm is perfect. I'll send the invite and include the migration guide beforehand.",
  ].join('\n'),
  summary: '• Returns analytics needed before the November peak.\n• Concerns: Oracle migration, locked budget, competitor DataBridge.\n• Agreed: 30-day returns-first pilot; technical deep-dive Tuesday 2pm.',
  sentiment: { overall: { positive_count: 12, neutral_count: 22, negative_count: 6 }, speakers: [] },
  structured: {
    call_summary: 'Discovery call between Sarah (Northwind Analytics) and Marcus (VP Engineering, Meridian Retail). Marcus is driven by a November returns-analytics deadline but concerned about Oracle migration, a locked budget, and a competing bid from DataBridge. Both agreed to a 30-day returns-first pilot and a technical deep-dive Tuesday at 2pm.',
    sentiment: 'positive-conditional',
    action_items: [
      { task: 'Send SOC 2 report and security whitepaper for Elena’s review', owner: 'Sarah', due_date: '2026-08-13', quote: 'whitepaper and SOC 2 by Thursday' },
      { task: 'Prepare a pricing proposal for 25 seats', owner: 'Sarah', due_date: '2026-08-21', quote: 'a pricing proposal for twenty-five seats by next Friday' },
      { task: 'Send Oracle migration guide and API docs', owner: 'Sarah', due_date: '2026-08-11', quote: "I'll send our migration guide and the API docs" },
      { task: 'Loop in CISO Elena on the security review', owner: 'Marcus', due_date: null, quote: 'I need to loop in our CISO, Elena' },
    ],
    risks: [
      { risk: 'Budget locked for the fiscal year; expansion needs finance approval', severity: 'high', quote: 'budget is locked for this fiscal year' },
      { risk: 'Oracle data-warehouse migration is complex and a potential deal-breaker', severity: 'high', quote: 'our data is trapped in an Oracle warehouse and the migration scares me' },
      { risk: 'Competitive pressure from DataBridge with aggressive pricing', severity: 'medium', quote: 'we’re also evaluating DataBridge — their pricing came in aggressive' },
    ],
    decisions: [
      { decision: 'Run a 30-day pilot focused on returns first', quote: 'A returns-first pilot works' },
      { decision: 'Hold a technical deep-dive on Tuesday at 2pm', quote: 'Tuesday at 2pm is perfect' },
    ],
    follow_up_email: 'Hi Marcus,\n\nThank you for your time today — great to dig into Meridian’s returns-analytics goals ahead of your November go-live.\n\nTo recap what we agreed:\n• SOC 2 report and security whitepaper to you by Thursday for Elena’s review.\n• Oracle migration guide and API docs ahead of our session.\n• Technical deep-dive booked for Tuesday at 2pm — invite to follow.\n• 25-seat pricing proposal by next Friday.\n• A 30-day pilot focused on returns first.\n\nConfident we can prove time-to-value well before your peak season.\n\nBest,\n[Your name]',
  },
};
