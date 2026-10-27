// verify.mjs — END-TO-END Speechmatics verifier. Run this with YOUR key to empirically confirm the API
// flow, feature flags, and output shape WITHOUT needing the docs. This resolves the "UNVERIFIED" spec.
//
// Usage (PowerShell):
//   $env:SPEECHMATICS_API_KEY="sk_..."; node verify.mjs "C:\path\to\Client_Discovery_Call.mp3"
// Usage (bash):
//   SPEECHMATICS_API_KEY=sk_... node verify.mjs ./Client_Discovery_Call.mp3
//
// Optional: set LLM_API_KEY (+ LLM_BASE_URL/LLM_MODEL) to also test the extraction step on the transcript.

import { readFile } from 'node:fs/promises';
import { basename } from 'node:path';
import { submitJob, waitForJob, getTranscript, diarizedText, extractExtras, defaultConfig, BASE_URL } from './speechmatics.mjs';
import * as llm from './llm.mjs';

const audioPath = process.argv[2];
if (!audioPath) {
  console.error('Usage: node verify.mjs <audio-file>  (e.g. node verify.mjs ./Client_Discovery_Call.mp3)');
  process.exit(1);
}

const line = (c = '─') => console.log(c.repeat(64));

try {
  line('═');
  console.log('VoiceOps · Speechmatics end-to-end verification');
  console.log('Base URL :', BASE_URL);
  console.log('Config   :', JSON.stringify(defaultConfig()));
  console.log('Audio    :', audioPath);
  line('═');

  const bytes = await readFile(audioPath);
  console.log(`Loaded ${(bytes.length / 1024).toFixed(0)} KB. Submitting batch job...`);

  const jobId = await submitJob(bytes, basename(audioPath));
  console.log('✅ Job accepted. Job ID:', jobId);

  console.log('Polling status (Ctrl-C to abort)...');
  const t0 = Date.now();
  await waitForJob(jobId, { onTick: (s) => console.log(`   status: ${s}  (+${((Date.now() - t0) / 1000).toFixed(0)}s)`) });
  console.log('✅ Job done. Fetching transcript (json-v2)...');

  const transcript = await getTranscript(jobId);
  line();
  console.log('TOP-LEVEL KEYS in transcript payload:', Object.keys(transcript));
  console.log('(^ confirms whether summary / sentiment_analysis are present and how they are named)');

  const diarized = diarizedText(transcript);
  const { summary, sentiment } = extractExtras(transcript);

  line();
  console.log('DIARIZED TRANSCRIPT (first ~1200 chars):');
  console.log(diarized.slice(0, 1200) || '(empty — check results[].alternatives[].speaker)');
  line();
  console.log('SPEECHMATICS SUMMARY:', summary ? `\n${JSON.stringify(summary).slice(0, 600)}` : '(none / not enabled / different key)');
  line();
  console.log('SPEECHMATICS SENTIMENT:', sentiment ? `\n${JSON.stringify(sentiment).slice(0, 600)}` : '(none / not enabled / different key)');
  line();

  if (llm.isConfigured()) {
    console.log('LLM_API_KEY detected — running extraction on the transcript...');
    const structured = await llm.extract({ transcript: diarized, meetingDate: '2026-08-10', speechmaticsSummary: typeof summary === 'string' ? summary : '' });
    console.log('✅ STRUCTURED EXTRACTION:');
    console.log(JSON.stringify(structured, null, 2));
  } else {
    console.log('ℹ️  Set LLM_API_KEY to also test the extraction step (skipped for now).');
  }

  line('═');
  console.log('DONE. If everything above looks right, update plan Section 7: flip UNVERIFIED → CONFIRMED,');
  console.log('and correct any [VERIFY] spots in speechmatics.mjs to match what you saw.');
  line('═');
} catch (err) {
  line('!');
  console.error('❌ VERIFICATION FAILED:\n', err.message);
  console.error('\nThe raw error body above is your schema teacher — it usually names the wrong/missing field.');
  console.error('Common fixes: check the base URL, the multipart field names (data_file / config),');
  console.error('the feature-flag key names, or whether your key/credits are active.');
  process.exit(1);
}
