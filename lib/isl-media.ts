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

    const composition = await selectComposition({
      serveUrl: bundleLocation,
      id: "ISLChapterVideo",
      inputProps,
    });

    const outputLocation = path.join(os.tmpdir(), `isl-${crypto.randomUUID()}.mp4`);

    await renderMedia({
      composition,
      serveUrl: bundleLocation,
      codec: "h264",
      outputLocation,
      inputProps,
    });

    const videoBuffer = await fs.readFile(outputLocation);
    await fs.unlink(outputLocation);

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
