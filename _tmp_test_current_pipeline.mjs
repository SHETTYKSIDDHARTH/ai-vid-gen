import 'dotenv/config';
import { generateText } from 'ai';
import { google } from '@ai-sdk/google';

function endWithPunctuation(text) {
  return /[.!?]\s*$/.test(text) ? text : `${text}.`;
}
function splitTextIntoChunks(text, maxChars) {
  const sentenceMatches = text.match(/[^.!?]+[.!?]+(\s+|$)/g) ?? [];
  const matchedLength = sentenceMatches.join("").length;
  const remainder = text.slice(matchedLength).trim();
  const sentences = remainder
    ? [...sentenceMatches, endWithPunctuation(remainder)]
    : sentenceMatches.length ? sentenceMatches : [endWithPunctuation(text)];
  const chunks = [];
  let current = "";
  const pushCurrent = () => { if (current.trim()) chunks.push(current.trim()); current = ""; };
  for (const sentence of sentences) {
    if (sentence.length > maxChars) {
      pushCurrent();
      const words = sentence.split(" ");
      let piece = "";
      const pieces = [];
      for (const word of words) {
        if ((piece ? `${piece} ${word}` : word).length > maxChars) {
          if (piece.trim()) pieces.push(piece.trim());
          piece = word;
        } else piece = piece ? `${piece} ${word}` : word;
      }
      if (piece.trim()) pieces.push(piece.trim());
      pieces.forEach((p, i) => chunks.push(i === pieces.length - 1 ? p : endWithPunctuation(p)));
      continue;
    }
    if ((current + sentence).length > maxChars) { pushCurrent(); current = sentence; }
    else current += sentence;
  }
  pushCurrent();
  return chunks;
}
function parseWavChunks(buffer) {
  let offset = 12, numChannels = 1, sampleRate = 24000, bitsPerSample = 16, data = Buffer.alloc(0);
  while (offset + 8 <= buffer.length) {
    const chunkId = buffer.toString("ascii", offset, offset + 4);
    const chunkSize = buffer.readUInt32LE(offset + 4);
    const chunkStart = offset + 8;
    if (chunkId === "fmt ") {
      numChannels = buffer.readUInt16LE(chunkStart + 2);
      sampleRate = buffer.readUInt32LE(chunkStart + 4);
      bitsPerSample = buffer.readUInt16LE(chunkStart + 14);
    } else if (chunkId === "data") data = Buffer.from(buffer.subarray(chunkStart, chunkStart + chunkSize));
    offset = chunkStart + chunkSize + (chunkSize % 2);
  }
  return { numChannels, sampleRate, bitsPerSample, data };
}
function concatenateWavBuffers(buffers) {
  if (buffers.length === 1) return buffers[0];
  const parsed = buffers.map(parseWavChunks);
  const { numChannels, sampleRate, bitsPerSample } = parsed[0];
  const combinedData = Buffer.concat(parsed.map((c) => c.data));
  const byteRate = sampleRate * numChannels * (bitsPerSample / 8);
  const blockAlign = numChannels * (bitsPerSample / 8);
  const fmtChunk = Buffer.alloc(24);
  fmtChunk.write("fmt ", 0, "ascii"); fmtChunk.writeUInt32LE(16, 4); fmtChunk.writeUInt16LE(1, 8);
  fmtChunk.writeUInt16LE(numChannels, 10); fmtChunk.writeUInt32LE(sampleRate, 12);
  fmtChunk.writeUInt32LE(byteRate, 16); fmtChunk.writeUInt16LE(blockAlign, 20); fmtChunk.writeUInt16LE(bitsPerSample, 22);
  const dataHeader = Buffer.alloc(8);
  dataHeader.write("data", 0, "ascii"); dataHeader.writeUInt32LE(combinedData.length, 4);
  const riffHeader = Buffer.alloc(12);
  riffHeader.write("RIFF", 0, "ascii"); riffHeader.writeUInt32LE(4 + fmtChunk.length + dataHeader.length + combinedData.length, 4); riffHeader.write("WAVE", 8, "ascii");
  return Buffer.concat([riffHeader, fmtChunk, dataHeader, combinedData]);
}

const NARRATION_PROMPT = `You are a scriptwriter for an in-depth educational video.
Turn the given chapter's bullet points into a natural, spoken-style narration script that thoroughly teaches the material.

RULES:
Output ONLY the narration text, no markdown, no headings, no labels.
Write like someone speaking aloud to a beginner, explaining each bullet point in real depth, with examples or analogies where they help understanding.
Explain each bullet point with roughly 3-4 sentences of real explanation, not just a rephrase of the bullet itself.
Flow naturally from one bullet point to the next, as one continuous explanation rather than disconnected fragments.
Avoid emojis and marketing language.
This narration will be read aloud by a text-to-speech engine, so it must be pure spoken prose:
Never include literal code syntax, function calls, symbols, or punctuation a screen reader would mispronounce (no parentheses, brackets, plus/equals signs, semicolons, camelCase identifiers written as code, etc.).
Describe code concepts entirely in plain spoken English instead. For example, say "calling the set count function and adding one to the current count" rather than writing "setCount(count + 1)".`;

console.log("Generating narration script...");
const { text: script } = await generateText({
  model: google('gemini-3.5-flash-lite'),
  system: NARRATION_PROMPT,
  prompt: `Course topic: "Python Basics"\nChapter: "Loops and Iteration"\nBullet points:\n- For loops and while loops\n- Using range() to iterate a fixed number of times\n- Break and continue statements`,
});
console.log("Script length:", script.length);
console.log("Script:", script);

const chunks = splitTextIntoChunks(script, 450);
console.log("\nNumber of TTS chunks:", chunks.length);
chunks.forEach((c, i) => console.log(`Chunk ${i} (${c.length} chars): ${c.slice(0,60)}...`));

console.log("\nGenerating audio for each chunk via FonadaLabs...");
const audioBuffers = [];
for (const chunk of chunks) {
  const response = await fetch("https://api.fonada.ai/tts/generate-audio-large", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${process.env.fonadalabs}` },
    body: JSON.stringify({ input: chunk, voice: "Dhruv", language: "English" }),
  });
  if (!response.ok) { console.error("TTS FAILED:", response.status, await response.text()); process.exit(1); }
  audioBuffers.push(Buffer.from(await response.arrayBuffer()));
}
const combined = concatenateWavBuffers(audioBuffers);
console.log("Combined audio bytes:", combined.length);

const base64Audio = combined.toString('base64');
console.log("\nTranscribing full combined audio via Gemini...");
const { text: transcribed } = await generateText({
  model: google('gemini-3.5-flash-lite'),
  messages: [{
    role: 'user',
    content: [
      { type: 'text', text: 'Transcribe exactly what is spoken in this audio, word for word. Output ONLY the transcription.' },
      { type: 'file', data: base64Audio, mediaType: 'audio/wav' },
    ],
  }],
});

console.log("\n=== ORIGINAL SCRIPT ===");
console.log(script);
console.log("\n=== TRANSCRIBED AUDIO ===");
console.log(transcribed.trim());
