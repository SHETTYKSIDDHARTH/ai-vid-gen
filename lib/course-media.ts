import { eq } from "drizzle-orm";
import { bundle } from "@remotion/bundler";
import { renderMedia, selectComposition } from "@remotion/renderer";
import path from "path";
import os from "os";
import crypto from "crypto";
import fs from "fs/promises";
import { db } from "@/config/db";
import { chaptersTable } from "@/config/schema";
import { uploadBufferToCloudinary } from "@/lib/cloudinary";
import { concatenateWavBuffers, getWavDurationSeconds } from "@/lib/wav";
import { logApiError } from "@/lib/log-api-error";
import { audioMatchesScript } from "@/lib/tts-qa";
import type { ChapterVideoProps, ChapterVideoSegment } from "@/remotion/ChapterVideo";

export type CaptionSegment = { text: string; startSec: number; endSec: number };

const FONADA_MAX_CHARS = 300;
const CAPTION_MAX_CHARS = 200;
const FPS = 30;
const MAX_TTS_ATTEMPTS = 3;
// Fonada enforces 10 requests/minute account-wide. Pace every call at least
// this far apart so we stay under that instead of finding out via a 429.
const FONADA_MIN_INTERVAL_MS = 6500;
const MAX_FONADA_RATE_LIMIT_RETRIES = 5;
let nextFonadaSlot = 0;

function endWithPunctuation(text: string): string {
  return /[.!?]\s*$/.test(text) ? text : `${text}.`;
}

function splitTextIntoChunks(text: string, maxChars: number): string[] {
  const sentenceMatches = text.match(/[^.!?]+[.!?]+(\s+|$)/g) ?? [];
  const matchedLength = sentenceMatches.join("").length;
  const remainder = text.slice(matchedLength).trim();
  const sentences = remainder
    ? [...sentenceMatches, endWithPunctuation(remainder)]
    : sentenceMatches.length
      ? sentenceMatches
      : [endWithPunctuation(text)];

  const chunks: string[] = [];
  let current = "";

  const pushCurrent = () => {
    if (current.trim()) chunks.push(current.trim());
    current = "";
  };

  for (const sentence of sentences) {
    // Never feed the TTS engine an unterminated fragment — incomplete sentences can
    // cause it to hallucinate extra "completion" content instead of stopping cleanly.
    if (sentence.length > maxChars) {
      pushCurrent();
      const words = sentence.split(" ");
      let piece = "";
      const pieces: string[] = [];
      for (const word of words) {
        if ((piece ? `${piece} ${word}` : word).length > maxChars) {
          if (piece.trim()) pieces.push(piece.trim());
          piece = word;
        } else {
          piece = piece ? `${piece} ${word}` : word;
        }
      }
      if (piece.trim()) pieces.push(piece.trim());
      pieces.forEach((p, i) => chunks.push(i === pieces.length - 1 ? p : endWithPunctuation(p)));
      continue;
    }

    if ((current + sentence).length > maxChars) {
      pushCurrent();
      current = sentence;
    } else {
      current += sentence;
    }
  }
  pushCurrent();

  return chunks;
}

function distributeDisplaySegments(chunkText: string, chunkDurationSec: number, chunkStartSec: number): CaptionSegment[] {
  const pieces = splitTextIntoChunks(chunkText, CAPTION_MAX_CHARS);
  const totalChars = pieces.reduce((sum, piece) => sum + piece.length, 0) || 1;

  const segments: CaptionSegment[] = [];
  let elapsed = chunkStartSec;

  for (const piece of pieces) {
    const pieceDuration = chunkDurationSec * (piece.length / totalChars);
    segments.push({ text: piece, startSec: elapsed, endSec: elapsed + pieceDuration });
    elapsed += pieceDuration;
  }

  return segments;
}

async function waitForFonadaSlot() {
  const now = Date.now();
  const waitMs = Math.max(0, nextFonadaSlot - now);
  nextFonadaSlot = Math.max(now, nextFonadaSlot) + FONADA_MIN_INTERVAL_MS;
  if (waitMs > 0) {
    await new Promise((resolve) => setTimeout(resolve, waitMs));
  }
}

function parseFonadaRetryAfterMs(errorText: string): number {
  try {
    const parsed = JSON.parse(errorText);
    const retryAfterSeconds = parsed?.detail?.details?.retry_after_seconds;
    if (typeof retryAfterSeconds === "number") {
      return retryAfterSeconds * 1000 + 500;
    }
  } catch {
    // Fall through to the default below.
  }
  return FONADA_MIN_INTERVAL_MS;
}

async function requestFonadaAudio(chunk: string): Promise<Buffer> {
  for (let attempt = 1; attempt <= MAX_FONADA_RATE_LIMIT_RETRIES; attempt++) {
    await waitForFonadaSlot();

    const response = await fetch("https://api.fonada.ai/tts/generate-audio-large", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.fonadalabs}`,
      },
      body: JSON.stringify({
        input: chunk,
        voice: "Dhruv",
        language: "English",
      }),
    });

    if (response.ok) {
      return Buffer.from(await response.arrayBuffer());
    }

    const errorText = await response.text();

    if (response.status === 429 && attempt < MAX_FONADA_RATE_LIMIT_RETRIES) {
      const waitMs = parseFonadaRetryAfterMs(errorText);
      console.warn(`[FonadaLabs] Rate limited, waiting ${waitMs}ms before retry ${attempt + 1}/${MAX_FONADA_RATE_LIMIT_RETRIES}`);
      nextFonadaSlot = Date.now() + waitMs;
      continue;
    }

    const error = new Error(`FonadaLabs TTS request failed: ${response.status} ${errorText}`);
    logApiError("FonadaLabs", error);
    throw error;
  }

  throw new Error("FonadaLabs TTS request failed: exceeded rate-limit retry budget");
}

// Fonada occasionally drops a clause or hallucinates a stray word/phrase in a
// given chunk. Since it's stochastic, re-requesting the exact same chunk text
// usually produces a clean take, so verify each chunk against the script it
// was supposed to say and retry a bounded number of times before giving up.
async function generateVerifiedChunkAudio(chunk: string): Promise<Buffer> {
  let lastBuffer: Buffer | null = null;

  for (let attempt = 1; attempt <= MAX_TTS_ATTEMPTS; attempt++) {
    const buffer = await requestFonadaAudio(chunk);
    lastBuffer = buffer;

    if (await audioMatchesScript(chunk, buffer)) {
      return buffer;
    }

    console.warn(`[TTS QA] Narration mismatch on attempt ${attempt}/${MAX_TTS_ATTEMPTS}, retrying chunk: "${chunk.slice(0, 60)}..."`);
  }

  return lastBuffer!;
}

async function generateNarrationAudio(text: string): Promise<{ buffer: Buffer; segments: CaptionSegment[] }> {
  const chunks = splitTextIntoChunks(text, FONADA_MAX_CHARS);
  const audioBuffers: Buffer[] = [];
  const segments: CaptionSegment[] = [];
  let elapsed = 0;

  for (const chunk of chunks) {
    const buffer = await generateVerifiedChunkAudio(chunk);
    const durationSec = getWavDurationSeconds(buffer);
    segments.push(...distributeDisplaySegments(chunk, durationSec, elapsed));
    elapsed += durationSec;
    audioBuffers.push(buffer);
  }

  return { buffer: concatenateWavBuffers(audioBuffers), segments };
}

export async function generateChapterAudio(chapter: { id: number; script: string | null }) {
  if (!chapter.script) {
    throw new Error("Chapter has no script to narrate");
  }

  const { buffer: audioBuffer, segments } = await generateNarrationAudio(chapter.script);
  const audioDurationSec = getWavDurationSeconds(audioBuffer);
  const uploadResult = await uploadBufferToCloudinary(audioBuffer, "course-narration");

  await db
    .update(chaptersTable)
    .set({
      audioUrl: uploadResult.secure_url,
      audioDurationSec,
      captionSegments: JSON.stringify(segments),
    })
    .where(eq(chaptersTable.id, chapter.id));

  return { audioUrl: uploadResult.secure_url, audioDurationSec, segments };
}

export async function bundleRemotionProject(): Promise<string> {
  return bundle({ entryPoint: path.join(process.cwd(), "remotion/index.ts") });
}

export async function generateChapterVideo(
  chapter: {
    id: number;
    title: string;
    audioUrl: string | null;
    audioDurationSec: number | null;
    captionSegments: string | null;
  },
  bundleLocation: string
) {
  if (!chapter.audioUrl || !chapter.audioDurationSec) {
    throw new Error("Generate the narration audio first");
  }

  const durationInFrames = Math.round(chapter.audioDurationSec * FPS);
  const rawSegments: CaptionSegment[] = chapter.captionSegments ? JSON.parse(chapter.captionSegments) : [];
  const segments: ChapterVideoSegment[] = rawSegments.map((segment) => ({
    text: segment.text,
    startFrame: Math.round(segment.startSec * FPS),
    endFrame: Math.round(segment.endSec * FPS),
  }));

  const inputProps: ChapterVideoProps = {
    title: chapter.title,
    segments,
    audioUrl: chapter.audioUrl,
    durationInFrames,
  };

  const composition = await selectComposition({
    serveUrl: bundleLocation,
    id: "ChapterVideo",
    inputProps,
  });

  const outputLocation = path.join(os.tmpdir(), `${crypto.randomUUID()}.mp4`);

  await renderMedia({
    composition,
    serveUrl: bundleLocation,
    codec: "h264",
    outputLocation,
    inputProps,
  });

  const videoBuffer = await fs.readFile(outputLocation);
  await fs.unlink(outputLocation);

  const uploadResult = await uploadBufferToCloudinary(videoBuffer, "course-videos");

  await db
    .update(chaptersTable)
    .set({ videoUrl: uploadResult.secure_url, videoStatus: "ready" })
    .where(eq(chaptersTable.id, chapter.id));

  return { videoUrl: uploadResult.secure_url };
}

export async function generateChapterMedia(
  chapter: { id: number; title: string; script: string | null },
  bundleLocation: string
) {
  await db.update(chaptersTable).set({ videoStatus: "processing" }).where(eq(chaptersTable.id, chapter.id));

  try {
    const { audioUrl, audioDurationSec, segments } = await generateChapterAudio(chapter);
    await generateChapterVideo(
      { ...chapter, audioUrl, audioDurationSec, captionSegments: JSON.stringify(segments) },
      bundleLocation
    );
  } catch (error) {
    await db.update(chaptersTable).set({ videoStatus: "failed" }).where(eq(chaptersTable.id, chapter.id));
    throw error;
  }
}
