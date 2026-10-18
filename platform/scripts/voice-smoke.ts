/**
 * Voice backend smoke test (wave 4).
 *
 * 1. Synthesizes 'Show me hoodies in bottle green' via ElevenLabs TTS to a
 *    temp mp3, then transcribes it back with Scribe and asserts the
 *    transcript contains 'hoodies' — round-trips the real API key through
 *    both directions of the voice pipeline.
 * 2. POSTs to the local custom-LLM bridge (AGENT_MOCK=1) and asserts
 *    streamed OpenAI-style SSE chunks arrive and the stream ends with
 *    `data: [DONE]`.
 *
 * Run with: `npx tsx scripts/voice-smoke.ts` (from `platform/`, dev server
 * already running on :3006 for step 2 — this script does not start one).
 */

import { config } from 'dotenv';
import { writeFile, unlink } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';

config({ path: '.env.local', quiet: true });

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3006';
const SAMPLE_TEXT = 'Show me hoodies in bottle green';

async function readStreamToBuffer(stream: ReadableStream<Uint8Array>): Promise<Buffer> {
  const reader = stream.getReader();
  const chunks: Uint8Array[] = [];
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    if (value) chunks.push(value);
  }
  return Buffer.concat(chunks);
}

async function testTtsAndStt(): Promise<void> {
  const { ttsStream, transcribe } = await import('../lib/services/voice');

  console.log(`[1/2] TTS: synthesizing "${SAMPLE_TEXT}"...`);
  const ttsStart = Date.now();
  const stream = await ttsStream(SAMPLE_TEXT);
  const mp3 = await readStreamToBuffer(stream);
  const ttsMs = Date.now() - ttsStart;
  console.log(`      -> ${mp3.length} bytes in ${ttsMs}ms`);
  if (mp3.length === 0) throw new Error('TTS returned no audio bytes');

  const tempPath = join(tmpdir(), `voice-smoke-${Date.now()}.mp3`);
  await writeFile(tempPath, mp3);

  console.log('      transcribing it back with Scribe...');
  const sttStart = Date.now();
  const result = await transcribe(new Uint8Array(mp3), 'audio/mpeg');
  const sttMs = Date.now() - sttStart;
  console.log(`      -> "${result.text}" (language=${result.language ?? 'unknown'}) in ${sttMs}ms`);

  await unlink(tempPath).catch(() => {});

  if (!result.text.toLowerCase().includes('hoodies')) {
    throw new Error(`Expected transcript to contain 'hoodies', got: "${result.text}"`);
  }
  console.log('      OK — round trip preserved "hoodies".\n');
}

async function testBridge(): Promise<void> {
  const secret = process.env.VOICE_BRIDGE_SECRET;
  if (!secret) throw new Error('VOICE_BRIDGE_SECRET is not set in .env.local');

  console.log('[2/2] Bridge: POST /api/voice/llm with AGENT_MOCK=1...');
  const start = Date.now();
  const res = await fetch(`${APP_URL}/api/voice/llm`, {
    method: 'POST',
    headers: { authorization: `Bearer ${secret}`, 'content-type': 'application/json' },
    body: JSON.stringify({
      model: 'blackoutmerch-agent',
      stream: true,
      messages: [{ role: 'user', content: 'Show me hoodies in bottle green' }],
    }),
  });

  if (!res.ok || !res.body) {
    throw new Error(`Bridge responded ${res.status}: ${await res.text()}`);
  }

  const body = await readStreamToBuffer(res.body);
  const text = body.toString('utf8');
  const elapsedMs = Date.now() - start;

  const dataLines = text.split('\n\n').map((frame) => frame.trim()).filter((frame) => frame.startsWith('data:'));
  const chunkCount = dataLines.filter((line) => line !== 'data: [DONE]').length;
  const endsWithDone = dataLines[dataLines.length - 1] === 'data: [DONE]';

  console.log(`      -> ${chunkCount} content chunk(s), ${elapsedMs}ms total`);
  if (chunkCount === 0) throw new Error('No streamed chunks arrived from the bridge');
  if (!endsWithDone) throw new Error(`Stream did not end with 'data: [DONE]' (last line: ${dataLines[dataLines.length - 1]})`);

  console.log('      OK — chunks arrived and stream terminated with [DONE].\n');
}

async function main(): Promise<void> {
  await testTtsAndStt();
  await testBridge();
  console.log('voice-smoke: all checks passed.');
}

main().catch((err) => {
  console.error('voice-smoke FAILED:', err instanceof Error ? err.message : err);
  process.exit(1);
});
