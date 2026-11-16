import { eq } from "drizzle-orm";
import { renderMedia, selectComposition } from "@remotion/renderer";
import path from "path";
import os from "os";
import crypto from "crypto";
import fs from "fs/promises";
import { db } from "@/config/db";
import { chaptersTable } from "@/config/schema";
import { uploadBufferToCloudinary } from "@/lib/cloudinary";
import { logApiError } from "@/lib/log-api-error";
import { textToWordSegments } from "@/lib/sign-language/text-to-sign";
import type { ISLChapterVideoProps } from "@/remotion/ISLChapterVideo";

const FPS = 30;
const SECONDS_PER_LETTER = 1.0;

// Cloudinary rejects videos above 104,857,600 bytes (100 MiB) on this plan.
// Stay safely under it so we never render a whole video only to fail the upload.
const MAX_UPLOAD_BYTES = 95 * 1024 * 1024;

// Render quality tiers, best first. The ISL video is just text on black, so even
// heavy compression stays perfectly readable. If a render is still too big we
// fall through to the next (smaller) tier.
const RENDER_TIERS = [
  { crf: 32, scale: 0.75 }, // 960x540
  { crf: 40, scale: 0.5 }, // 640x360
];

// Very long videos skip straight to the smallest tier to avoid a wasted render.
const AGGRESSIVE_TIER_THRESHOLD_SEC = 25 * 60;

export async function generateISLChapterVideo(
  chapter: { id: number; title: string; script: string | null },
  bundleLocation: string
) {
  if (!chapter.script) {
    throw new Error("Chapter has no script");
  }

  await db
    .update(chaptersTable)
    .set({ islVideoStatus: "processing" })
    .where(eq(chaptersTable.id, chapter.id));

  try {
    const wordSegments = textToWordSegments(chapter.script, SECONDS_PER_LETTER);

    if (wordSegments.length === 0) {
      throw new Error("No word segments generated from script");
    }

    const totalDurationSec = wordSegments[wordSegments.length - 1].endSec;
    const durationInFrames = Math.round(totalDurationSec * FPS) + FPS; // +1s buffer

    const inputProps: ISLChapterVideoProps = {
      title: chapter.title,
      wordSegments,
      durationInFrames,
    };

    let videoBuffer: Buffer;

    const composition = await selectComposition({
      serveUrl: bundleLocation,
      id: "ISLChapterVideo",
      inputProps,
    });

    const startTier = totalDurationSec > AGGRESSIVE_TIER_THRESHOLD_SEC ? RENDER_TIERS.length - 1 : 0;
    let outputLocation: string | null = null;

    try {
      for (let tierIndex = startTier; tierIndex < RENDER_TIERS.length; tierIndex++) {
        const tier = RENDER_TIERS[tierIndex];
        const candidate = path.join(os.tmpdir(), `isl-${crypto.randomUUID()}.mp4`);

        await renderMedia({
          composition,
          serveUrl: bundleLocation,
          codec: "h264",
          outputLocation: candidate,
          inputProps,
          crf: tier.crf,
          scale: tier.scale,
          muted: true,
          x264Preset: "veryfast",
        });

        const { size } = await fs.stat(candidate);
        if (size <= MAX_UPLOAD_BYTES) {
          outputLocation = candidate;
          break;
        }

        console.warn(
          `[ISL] Render at crf ${tier.crf} / scale ${tier.scale} was ${size} bytes (limit ${MAX_UPLOAD_BYTES}), trying a smaller tier`
        );
        await fs.unlink(candidate).catch(() => {});
      }

      if (!outputLocation) {
        throw new Error("ISL video is too large to upload even at the lowest quality; the script is too long");
      }

      videoBuffer = await fs.readFile(outputLocation);
    } finally {
      if (outputLocation) {
        await fs.unlink(outputLocation).catch(() => {});
      }
    }

    const uploadResult = await uploadBufferToCloudinary(videoBuffer, "isl-videos");

    await db
      .update(chaptersTable)
      .set({
        islVideoUrl: uploadResult.secure_url,
        islVideoStatus: "ready",
        wordSegments: JSON.stringify(wordSegments),
      })
      .where(eq(chaptersTable.id, chapter.id));

    return { islVideoUrl: uploadResult.secure_url, wordSegments };
  } catch (error) {
    logApiError("ISL video generation", error);
    await db
      .update(chaptersTable)
      .set({ islVideoStatus: "failed" })
      .where(eq(chaptersTable.id, chapter.id));
    throw error;
  }
}