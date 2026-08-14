import fs from 'fs';

export interface AudioAnalysisResult {
  isValidWav: boolean;
  duration: number; // in seconds
  sampleRate: number;
  channels: number;
  bitsPerSample: number;
  peak: number; // 0.0 to 1.0
  rms: number; // 0.0 to 1.0
  isSilent: boolean;
  isClipping: boolean;
  hasNoiseCorrupt: boolean;
}

/**
 * Technical Audio Quality Analyzer for WAV files.
 * Validates WAV header integrity, calculates Peak, RMS, duration, and checks clipping/silence.
 */
export function analyzeWavBuffer(buffer: Buffer): AudioAnalysisResult {
  if (buffer.length < 44 || buffer.toString('ascii', 0, 4) !== 'RIFF' || buffer.toString('ascii', 8, 12) !== 'WAVE') {
    return {
      isValidWav: false,
      duration: 0,
      sampleRate: 0,
      channels: 0,
      bitsPerSample: 0,
      peak: 0,
      rms: 0,
      isSilent: true,
      isClipping: false,
      hasNoiseCorrupt: true,
    };
  }

  const channels = buffer.readUInt16LE(22);
  const sampleRate = buffer.readUInt32LE(24);
  const bitsPerSample = buffer.readUInt16LE(34);
  const dataSize = buffer.readUInt32LE(40);

  const bytesPerSample = bitsPerSample / 8;
  const numSamples = Math.floor(dataSize / (bytesPerSample * channels));
  const duration = numSamples / sampleRate;

  let sumSquares = 0;
  let maxAbs = 0;
  let clippingCount = 0;

  const pcmOffset = 44;
  const sampleCountToAnalyze = Math.min(numSamples, (buffer.length - pcmOffset) / (bytesPerSample * channels));

  for (let i = 0; i < sampleCountToAnalyze; i++) {
    const offset = pcmOffset + i * bytesPerSample * channels;
    if (offset + bytesPerSample > buffer.length) break;

    let sampleVal = 0;
    if (bitsPerSample === 16) {
      sampleVal = buffer.readInt16LE(offset) / 32768.0;
    } else if (bitsPerSample === 8) {
      sampleVal = (buffer.readUInt8(offset) - 128) / 128.0;
    }

    const absVal = Math.abs(sampleVal);
    if (absVal > maxAbs) maxAbs = absVal;
    if (absVal >= 0.99) clippingCount++;
    sumSquares += sampleVal * sampleVal;
  }

  const rms = sampleCountToAnalyze > 0 ? Math.sqrt(sumSquares / sampleCountToAnalyze) : 0;
  const peak = maxAbs;
  const isSilent = rms < 0.0001 && peak < 0.001;
  const isClipping = clippingCount > sampleCountToAnalyze * 0.02 || peak >= 0.999;
  const hasNoiseCorrupt = isNaN(rms) || isNaN(peak);

  return {
    isValidWav: true,
    duration: Math.round(duration * 100) / 100,
    sampleRate,
    channels,
    bitsPerSample,
    peak: Math.round(peak * 1000) / 1000,
    rms: Math.round(rms * 1000) / 1000,
    isSilent,
    isClipping,
    hasNoiseCorrupt,
  };
}

export function analyzeWavFile(filePath: string): AudioAnalysisResult {
  try {
    if (fs.existsSync(filePath)) {
      const buf = fs.readFileSync(filePath);
      return analyzeWavBuffer(buf);
    }
  } catch (e) {}

  return {
    isValidWav: false,
    duration: 0,
    sampleRate: 0,
    channels: 0,
    bitsPerSample: 0,
    peak: 0,
    rms: 0,
    isSilent: true,
    isClipping: false,
    hasNoiseCorrupt: true,
  };
}
