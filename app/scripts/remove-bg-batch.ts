/**
 * Batch background removal for LoRA training images.
 *
 * Uses fal.ai's `fal-ai/ideogram/remove-background` model to strip the
 * background from each source .jpg, then flattens the resulting
 * transparent PNG onto pure white (#FFFFFF) with sharp, preserving the
 * source's pixel dimensions.
 *
 * Run from /app so bun auto-loads .env.local (FAL_API_KEY):
 *   cd app && bun run scripts/remove-bg-batch.ts
 *
 * Safety: the very first API call is treated specially. If it returns the
 * known "balance locked" 403, the script stops immediately without
 * processing any further images or spending any more money.
 */

import { fal } from "@fal-ai/client";
import sharp from "sharp";
import { readdir, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const SOURCE_DIR =
  "/Users/victorbendas/Documents/GitHub/Merch-From/data/LoRAs/American Traditional";
const OUTPUT_DIR = path.join(SOURCE_DIR, "white-bg");
const LOG_PATH = path.join(OUTPUT_DIR, "batch-log.json");
const COST_PER_IMAGE = 0.01;
const HARD_CAP_USD = 1.0;

const FAL_KEY = process.env.FAL_API_KEY;
if (!FAL_KEY) {
  console.error("FAL_API_KEY not found in environment. Run this from /app with bun (auto-loads .env.local).");
  process.exit(1);
}
fal.config({ credentials: FAL_KEY });

type LogEntry = {
  file: string;
  status: "success" | "failed" | "skipped";
  cost: number;
  error?: string;
  sourceDims?: { width: number; height: number };
  outputDims?: { width: number; height: number };
  timestamp: string;
};

function isBalanceLockedError(err: unknown): boolean {
  const msg = extractErrorMessage(err);
  return /User is locked/i.test(msg) && /Exhausted balance/i.test(msg);
}

function extractErrorMessage(err: unknown): string {
  if (!err) return "";
  if (typeof err === "string") return err;
  const anyErr = err as any;
  // @fal-ai/client ApiError typically carries status + body
  const parts: string[] = [];
  if (anyErr.message) parts.push(String(anyErr.message));
  if (anyErr.status) parts.push(`status=${anyErr.status}`);
  if (anyErr.body) {
    try {
      parts.push(typeof anyErr.body === "string" ? anyErr.body : JSON.stringify(anyErr.body));
    } catch {
      // ignore
    }
  }
  if (parts.length === 0) {
    try {
      parts.push(JSON.stringify(anyErr));
    } catch {
      parts.push(String(anyErr));
    }
  }
  return parts.join(" | ");
}

async function main() {
  await mkdir(OUTPUT_DIR, { recursive: true });

  const allFiles = await readdir(SOURCE_DIR);
  const jpgFiles = allFiles
    .filter((f) => f.toLowerCase().endsWith(".jpg"))
    .sort();

  console.log(`Found ${jpgFiles.length} .jpg files in source directory.`);

  // Load existing log if present (resume support)
  let log: LogEntry[] = [];
  try {
    const existing = await readFile(LOG_PATH, "utf-8");
    log = JSON.parse(existing);
  } catch {
    log = [];
  }

  // Tracks whether ANY fal API call (storage upload or model call) has been
  // attempted yet. The balance-lock check applies specifically to the very
  // first such call across the whole run.
  let isFirstApiCall = true;
  let totalCost = 0;
  for (const entry of log) {
    if (entry.status === "success") totalCost += entry.cost;
  }

  let successCount = 0;
  let failCount = 0;
  let skipCount = 0;

  for (const jpgFile of jpgFiles) {
    const basename = path.basename(jpgFile, ".jpg");
    const outputPath = path.join(OUTPUT_DIR, `${basename}.png`);

    // Resume support: skip if output already exists on disk
    const alreadyExists = await Bun.file(outputPath).exists();
    if (alreadyExists) {
      console.log(`[skip] ${jpgFile} -> output already exists`);
      skipCount++;
      // Ensure a log entry exists for this skip (don't duplicate)
      if (!log.some((e) => e.file === jpgFile && e.status !== "failed")) {
        log.push({
          file: jpgFile,
          status: "skipped",
          cost: 0,
          timestamp: new Date().toISOString(),
        });
      }
      continue;
    }

    if (totalCost + COST_PER_IMAGE > HARD_CAP_USD) {
      console.error(
        `HARD CAP REACHED: processing ${jpgFile} would exceed $${HARD_CAP_USD.toFixed(2)} cap (current spend $${totalCost.toFixed(2)}). Stopping.`,
      );
      break;
    }

    const sourcePath = path.join(SOURCE_DIR, jpgFile);
    console.log(`[process] ${jpgFile} ...`);

    try {
      const sourceBuffer = await readFile(sourcePath);
      const sourceMeta = await sharp(sourceBuffer).metadata();
      const sourceWidth = sourceMeta.width!;
      const sourceHeight = sourceMeta.height!;

      // Upload the local file to fal storage (this itself is an API call)
      const file = new File([sourceBuffer], jpgFile, { type: "image/jpeg" });
      const wasFirstCallBeforeUpload = isFirstApiCall;
      let uploadedUrl: string;
      try {
        uploadedUrl = await fal.storage.upload(file);
      } catch (apiErr) {
        isFirstApiCall = false;
        if (isBalanceLockedError(apiErr)) {
          console.error("=".repeat(70));
          console.error(
            wasFirstCallBeforeUpload
              ? "BALANCE LOCKED on very first API call (storage upload). Stopping immediately."
              : `BALANCE LOCKED mid-run during storage upload for ${jpgFile}. Stopping immediately.`,
          );
          console.error("Error body:", extractErrorMessage(apiErr));
          console.error("=".repeat(70));
          await writeFile(LOG_PATH, JSON.stringify(log, null, 2));
          process.exit(2);
        }
        throw apiErr;
      }
      isFirstApiCall = false;

      // Call the remove-background model
      const wasFirstCallBeforeSubscribe = isFirstApiCall; // always false here, kept for clarity
      let result;
      try {
        result = await fal.subscribe("fal-ai/ideogram/remove-background", {
          input: {
            image_url: uploadedUrl,
          },
          logs: false,
        });
      } catch (apiErr) {
        if (isBalanceLockedError(apiErr)) {
          console.error("=".repeat(70));
          console.error(
            wasFirstCallBeforeUpload
              ? "BALANCE LOCKED on very first API call (remove-background). Stopping immediately."
              : `BALANCE LOCKED mid-run at ${jpgFile}. Stopping immediately.`,
          );
          console.error("Error body:", extractErrorMessage(apiErr));
          console.error("=".repeat(70));
          await writeFile(LOG_PATH, JSON.stringify(log, null, 2));
          process.exit(2);
        }
        throw apiErr;
      }

      const resultImageUrl = (result as any)?.data?.image?.url;
      if (!resultImageUrl) {
        throw new Error(
          `No image URL in response: ${JSON.stringify((result as any)?.data)}`,
        );
      }

      // Download the transparent PNG result
      const imgResp = await fetch(resultImageUrl);
      if (!imgResp.ok) {
        throw new Error(`Failed to download result image: HTTP ${imgResp.status}`);
      }
      const resultArrayBuffer = await imgResp.arrayBuffer();
      const resultBuffer = Buffer.from(resultArrayBuffer);

      // Flatten onto pure white, ensure dimensions match source exactly
      let pipeline = sharp(resultBuffer);
      const resultMeta = await pipeline.metadata();
      if (resultMeta.width !== sourceWidth || resultMeta.height !== sourceHeight) {
        pipeline = pipeline.resize(sourceWidth, sourceHeight, { fit: "fill" });
      }
      const finalBuffer = await pipeline
        .flatten({ background: "#ffffff" })
        .png()
        .toBuffer();

      await writeFile(outputPath, finalBuffer);

      const finalMeta = await sharp(finalBuffer).metadata();

      totalCost += COST_PER_IMAGE;
      successCount++;
      log.push({
        file: jpgFile,
        status: "success",
        cost: COST_PER_IMAGE,
        sourceDims: { width: sourceWidth, height: sourceHeight },
        outputDims: { width: finalMeta.width!, height: finalMeta.height! },
        timestamp: new Date().toISOString(),
      });
      console.log(`[ok] ${jpgFile} -> ${basename}.png (${finalMeta.width}x${finalMeta.height}), running cost $${totalCost.toFixed(2)}`);
    } catch (err) {
      failCount++;
      const errMsg = extractErrorMessage(err);
      console.error(`[fail] ${jpgFile}: ${errMsg}`);
      log.push({
        file: jpgFile,
        status: "failed",
        cost: 0,
        error: errMsg,
        timestamp: new Date().toISOString(),
      });
    }

    // Persist log after every image so progress survives a crash
    await writeFile(LOG_PATH, JSON.stringify(log, null, 2));
  }

  console.log("\n" + "=".repeat(70));
  console.log(`Done. success=${successCount} failed=${failCount} skipped=${skipCount} totalCost=$${totalCost.toFixed(2)}`);
  console.log(`Log written to ${LOG_PATH}`);
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
