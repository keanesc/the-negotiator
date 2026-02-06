// ============================================================
// WAV Encoder — converts Float32 PCM buffers to WAV Uint8Array
// 16-bit, mono. Downsamples from source rate to 16kHz for Gemini.
// ============================================================

const TARGET_SAMPLE_RATE = 16000;

export function encodeWAV(
  buffers: Float32Array[],
  sourceSampleRate: number,
): Uint8Array {
  // Merge all buffers into one
  const totalLength = buffers.reduce((sum, b) => sum + b.length, 0);
  const merged = new Float32Array(totalLength);
  let offset = 0;
  for (const buffer of buffers) {
    merged.set(buffer, offset);
    offset += buffer.length;
  }

  // Downsample if needed
  const samples =
    sourceSampleRate !== TARGET_SAMPLE_RATE
      ? downsample(merged, sourceSampleRate, TARGET_SAMPLE_RATE)
      : merged;

  // Convert float32 to int16
  const int16 = new Int16Array(samples.length);
  for (let i = 0; i < samples.length; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    int16[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
  }

  const outRate = TARGET_SAMPLE_RATE;
  const byteRate = outRate * 2; // 16-bit mono = 2 bytes per sample
  const dataSize = int16.length * 2;
  const headerSize = 44;
  const totalSize = headerSize + dataSize;

  const wav = new ArrayBuffer(totalSize);
  const view = new DataView(wav);

  // RIFF header
  writeString(view, 0, "RIFF");
  view.setUint32(4, totalSize - 8, true);
  writeString(view, 8, "WAVE");

  // fmt sub-chunk
  writeString(view, 12, "fmt ");
  view.setUint32(16, 16, true); // Sub-chunk size (PCM = 16)
  view.setUint16(20, 1, true); // Audio format (PCM = 1)
  view.setUint16(22, 1, true); // Num channels (mono = 1)
  view.setUint32(24, outRate, true);
  view.setUint32(28, byteRate, true);
  view.setUint16(32, 2, true); // Block align (bytes per sample * channels)
  view.setUint16(34, 16, true); // Bits per sample

  // data sub-chunk
  writeString(view, 36, "data");
  view.setUint32(40, dataSize, true);

  // Write PCM data
  const int16View = new Int16Array(wav, headerSize);
  int16View.set(int16);

  return new Uint8Array(wav);
}

function downsample(
  buffer: Float32Array,
  fromRate: number,
  toRate: number,
): Float32Array {
  const ratio = fromRate / toRate;
  const newLength = Math.floor(buffer.length / ratio);
  const result = new Float32Array(newLength);
  for (let i = 0; i < newLength; i++) {
    const srcIndex = i * ratio;
    const lower = Math.floor(srcIndex);
    const upper = Math.min(lower + 1, buffer.length - 1);
    const frac = srcIndex - lower;
    result[i] = buffer[lower] * (1 - frac) + buffer[upper] * frac;
  }
  return result;
}

function writeString(view: DataView, offset: number, str: string): void {
  for (let i = 0; i < str.length; i++) {
    view.setUint8(offset + i, str.charCodeAt(i));
  }
}

/** Convert WAV Uint8Array to base64 string */
export function wavToBase64(wav: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < wav.length; i++) {
    binary += String.fromCharCode(wav[i]);
  }
  return btoa(binary);
}
