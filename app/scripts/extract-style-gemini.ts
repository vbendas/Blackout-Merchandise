#!/usr/bin/env bun
/**
 * Style-attribute extraction bake-off: Gemini 3.7 Flash via OpenRouter.
 * Runs the 30 white-bg images through the same schema the Sonnet agent used.
 * Outputs one JSON per image + usage-log.json with per-call token counts.
 */

import { readFileSync, writeFileSync, mkdirSync, readdirSync, existsSync } from 'fs';
import { resolve } from 'path';

// Repository root (this file lives in app/scripts/).
const REPO_ROOT = resolve(__dirname, '../..');

const MODEL = 'google/gemini-3.7-flash';
const IMG_DIR = resolve(REPO_ROOT, 'data/LoRAs/American Traditional/white-bg');
const OUT_DIR = resolve(REPO_ROOT, 'data/LoRAs/style-extraction/gemini-flash');
const SCHEMA = readFileSync(
  resolve(REPO_ROOT, 'data/LoRAs/style-extraction/schema.md'),
  'utf-8',
);

const SYSTEM = `You are a vision model extracting style attributes from tattoo-flash images for a style-injection pipeline. Follow this schema EXACTLY. Enums are closed - never invent values. Free text only in "subject" and "signature_details". The anchor example shows the quality bar for signature_details: concrete visual micro-features useful in a style prompt, not generic praise. Output ONLY the raw JSON object - no markdown fences, no commentary.\n\n${SCHEMA}`;

async function main() {
  const key = process.env.OPENROUTER_API_KEY;
  if (!key) { console.error('OPENROUTER_API_KEY missing'); process.exit(1); }
  mkdirSync(OUT_DIR, { recursive: true });

  const images = readdirSync(IMG_DIR).filter((f) => f.endsWith('.png')).sort();
  console.log(`${images.length} images`);
  const usage: any[] = [];

  for (const img of images) {
    const outPath = `${OUT_DIR}/${img.replace(/\.png$/, '.json')}`;
    if (existsSync(outPath)) { console.log(`skip ${img}`); continue; }
    const b64 = readFileSync(`${IMG_DIR}/${img}`).toString('base64');

    const resp = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          { role: 'system', content: SYSTEM },
          {
            role: 'user',
            content: [
              { type: 'text', text: 'Analyze this image and output the schema JSON.' },
              { type: 'image_url', image_url: { url: `data:image/png;base64,${b64}` } },
            ],
          },
        ],
        temperature: 0.2,
      }),
    });
    if (!resp.ok) { console.error(`${img}: HTTP ${resp.status} ${await resp.text()}`); continue; }
    const data = await resp.json();
    let text: string = data.choices?.[0]?.message?.content ?? '';
    text = text.trim().replace(/^```(json)?/i, '').replace(/```$/, '').trim();
    try {
      JSON.parse(text);
    } catch {
      console.error(`${img}: invalid JSON, saving raw anyway`);
    }
    writeFileSync(outPath, text + '\n');
    usage.push({ image: img, usage: data.usage });
    console.log(`ok ${img} (${data.usage?.prompt_tokens}p/${data.usage?.completion_tokens}c)`);
  }

  writeFileSync(`${OUT_DIR}/usage-log.json`, JSON.stringify(usage, null, 2));
  const tp = usage.reduce((s, u) => s + (u.usage?.prompt_tokens ?? 0), 0);
  const tc = usage.reduce((s, u) => s + (u.usage?.completion_tokens ?? 0), 0);
  console.log(`total tokens: ${tp} prompt, ${tc} completion`);
}

main();
