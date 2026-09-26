type WavChunks = {
  numChannels: number;
  sampleRate: number;
  bitsPerSample: number;
  data: Buffer;
};

function parseWavChunks(buffer: Buffer): WavChunks {
  if (buffer.toString("ascii", 0, 4) !== "RIFF" || buffer.toString("ascii", 8, 12) !== "WAVE") {
    throw new Error("Not a valid WAV file");
  }

  let offset = 12;
  let numChannels = 1;
  let sampleRate = 24000;
  let bitsPerSample = 16;
  let data = Buffer.alloc(0);

  while (offset + 8 <= buffer.length) {
    const chunkId = buffer.toString("ascii", offset, offset + 4);
    const chunkSize = buffer.readUInt32LE(offset + 4);
    const chunkStart = offset + 8;

    if (chunkId === "fmt ") {
      numChannels = buffer.readUInt16LE(chunkStart + 2);
      sampleRate = buffer.readUInt32LE(chunkStart + 4);
      bitsPerSample = buffer.readUInt16LE(chunkStart + 14);
    } else if (chunkId === "data") {
      data = Buffer.from(buffer.subarray(chunkStart, chunkStart + chunkSize));
    }

    offset = chunkStart + chunkSize + (chunkSize % 2);
  }

  return { numChannels, sampleRate, bitsPerSample, data };
}

export function getWavDurationSeconds(buffer: Buffer): number {
  const { numChannels, sampleRate, bitsPerSample, data } = parseWavChunks(buffer);
  const bytesPerSample = bitsPerSample / 8;
  return data.length / (sampleRate * numChannels * bytesPerSample);
}

export function concatenateWavBuffers(buffers: Buffer[]): Buffer {
  if (buffers.length === 1) {
    return buffers[0];
  }

  const parsed = buffers.map(parseWavChunks);
  const { numChannels, sampleRate, bitsPerSample } = parsed[0];
  const combinedData = Buffer.concat(parsed.map((chunk) => chunk.data));

  const byteRate = sampleRate * numChannels * (bitsPerSample / 8);
  const blockAlign = numChannels * (bitsPerSample / 8);

  const fmtChunk = Buffer.alloc(24);
  fmtChunk.write("fmt ", 0, "ascii");
  fmtChunk.writeUInt32LE(16, 4);
  fmtChunk.writeUInt16LE(1, 8);
  fmtChunk.writeUInt16LE(numChannels, 10);
  fmtChunk.writeUInt32LE(sampleRate, 12);
  fmtChunk.writeUInt32LE(byteRate, 16);
  fmtChunk.writeUInt16LE(blockAlign, 20);
  fmtChunk.writeUInt16LE(bitsPerSample, 22);

  const dataHeader = Buffer.alloc(8);
  dataHeader.write("data", 0, "ascii");
  dataHeader.writeUInt32LE(combinedData.length, 4);

  const riffHeader = Buffer.alloc(12);
  riffHeader.write("RIFF", 0, "ascii");
  riffHeader.writeUInt32LE(4 + fmtChunk.length + dataHeader.length + combinedData.length, 4);
  riffHeader.write("WAVE", 8, "ascii");

  return Buffer.concat([riffHeader, fmtChunk, dataHeader, combinedData]);
}
