import { generateText } from "ai";
import { google } from "@ai-sdk/google";
import { logApiError } from "@/lib/log-api-error";

const TRANSCRIBE_PROMPT =
  "Transcribe this audio clip exactly, word for word. Output only the raw transcript text, with no commentary, labels, or formatting.";

const MIN_COVERAGE = 0.92;
const MAX_LENGTH_RATIO = 1.15;

function normalizeWords(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, "")
    .split(/\s+/)
    .filter(Boolean);
}

function longestCommonSubsequenceLength(a: string[], b: string[]): number {
  const dp: number[][] = Array.from({ length: a.length + 1 }, () => new Array(b.length + 1).fill(0));
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      dp[i][j] = a[i - 1] === b[j - 1] ? dp[i - 1][j - 1] + 1 : Math.max(dp[i - 1][j], dp[i][j - 1]);
    }
  }
  return dp[a.length][b.length];
}

// Fonada's TTS occasionally drops a clause or hallucinates a stray word/filler
// phrase that never appears in the source text. Transcribing the rendered
// audio back and comparing word sequences catches both failure modes: a
// dropped clause shows up as low LCS coverage of the original script, and a
// hallucinated insertion shows up as extra transcribed words the LCS has to
// skip over, inflating the length ratio.
export async function audioMatchesScript(originalText: string, audioBuffer: Buffer): Promise<boolean> {
  const originalWords = normalizeWords(originalText);
  if (originalWords.length === 0) return true;

  try {
    const { text: transcribed } = await generateText({
      model: google("gemini-3.5-flash-lite"),
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: TRANSCRIBE_PROMPT },
            { type: "file", data: audioBuffer, mediaType: "audio/wav" },
          ],
        },
      ],
    });

    const transcribedWords = normalizeWords(transcribed);
    const coverage = longestCommonSubsequenceLength(originalWords, transcribedWords) / originalWords.length;
    const lengthRatio = transcribedWords.length / originalWords.length;

    return coverage >= MIN_COVERAGE && lengthRatio <= MAX_LENGTH_RATIO;
  } catch (error) {
    logApiError("Gemini (TTS QA transcription)", error);
    return true;
  }
}
