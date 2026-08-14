import { analyzeWavBuffer } from '../server/audioAnalyzer';
import { WooshSFXProvider } from '../server/wooshProvider';
import { generateSFXHash } from '../server/audioCache';

async function runAudioQualitySuite() {
  console.log('============================================================');
  console.log('AUDIO QUALITY VALIDATION SUITE V4.1 — TECHNICAL & ACOUSTIC');
  console.log('============================================================\n');

  let passed = 0;
  let total = 0;

  function assert(condition: boolean, testName: string, details?: string) {
    total++;
    if (condition) {
      passed++;
      console.log(`[PASS] ${testName}`);
    } else {
      console.error(`[FAIL] ${testName}`);
      if (details) console.error(`       Details: ${details}`);
    }
  }

  // 1. GENERATE PCM WAV SAMPLE FOR TECHNICAL AUDIT
  console.log('--- TEST GROUP 1: Generating PCM WAV Sample for Technical Metrics ---');
  const sampleRate = 44100;
  const duration = 1.5;
  const numSamples = Math.floor(sampleRate * duration);
  const pcmData = Buffer.alloc(numSamples * 2);

  for (let i = 0; i < numSamples; i++) {
    const t = i / sampleRate;
    const sampleVal = Math.sin(2 * Math.PI * 440 * t) * Math.exp(-t * 2) * 0.75;
    const pcm16 = Math.max(-32768, Math.min(32767, Math.floor(sampleVal * 32767)));
    pcmData.writeInt16LE(pcm16, i * 2);
  }

  const header = Buffer.alloc(44);
  const dataSize = pcmData.length;
  header.write('RIFF', 0);
  header.writeUInt32LE(dataSize + 36, 4);
  header.write('WAVE', 8);
  header.write('fmt ', 12);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20);
  header.writeUInt16LE(1, 22);
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(sampleRate * 2, 28);
  header.writeUInt16LE(2, 32);
  header.writeUInt16LE(16, 34);
  header.write('data', 36);
  header.writeUInt32LE(dataSize, 40);

  const sampleWavBuffer = Buffer.concat([header, pcmData]);
  const analysis = analyzeWavBuffer(sampleWavBuffer);

  // 2. TECHNICAL AUDIT METRICS ASSERTIONS
  console.log('\n--- TEST GROUP 2: Technical Quality Metrics Assertions ---');
  assert(analysis.isValidWav === true, 'Header validation: Valid WAV format');
  assert(analysis.duration >= 0.2 && analysis.duration <= 4.0, `Duration validation: ${analysis.duration}s is within 0.2s - 4.0s`);
  assert(analysis.sampleRate === 44100, `Sample rate validation: ${analysis.sampleRate} Hz`);
  assert(analysis.channels === 1, `Channel validation: ${analysis.channels} channel`);
  assert(analysis.isSilent === false, 'Silence validation: Non-zero RMS detected');
  assert(analysis.isClipping === false, `Clipping validation: Peak amplitude ${analysis.peak} < 0.999`);
  assert(analysis.hasNoiseCorrupt === false, 'Corruption validation: Clean audio header and samples');

  // 3. WOOSH PROVIDER MODEL & CAPABILITIES CHECK
  console.log('\n--- TEST GROUP 3: Woosh Provider Model & Capabilities ---');
  const woosh = new WooshSFXProvider();
  const caps = woosh.getCapabilities();
  assert(caps.providerName === 'Woosh', 'Provider Name correctly registered as Woosh');
  assert(caps.modelName === 'Woosh-Flow', 'Model Name correctly registered as Woosh-Flow');

  // 4. SHA-256 HASH CACHE CONSISTENCY
  console.log('\n--- TEST GROUP 4: SHA-256 Hash Cache Consistency ---');
  const hash1 = generateSFXHash('action', 'kunai_throw', 'metal', 0.85, 'prompt', 'context', 'woosh', 'Woosh-Flow');
  const hash2 = generateSFXHash('action', 'kunai_throw', 'metal', 0.85, 'prompt', 'context', 'woosh', 'Woosh-Flow');
  assert(hash1 === hash2, `SHA-256 Hash consistency (Hash: ${hash1})`);

  console.log('\n============================================================');
  console.log('TECHNICAL METRICS SUMMARY REGISTRY');
  console.log('============================================================');
  console.log(`Provider:        ${caps.providerName}`);
  console.log(`Model:           ${caps.modelName}`);
  console.log(`Status:          ${caps.status}`);
  console.log(`Sample Rate:     ${analysis.sampleRate} Hz`);
  console.log(`Duration:        ${analysis.duration} s`);
  console.log(`Peak Amplitude:  ${analysis.peak}`);
  console.log(`RMS Level:       ${analysis.rms}`);
  console.log('============================================================\n');

  console.log(`VERIFICATION COMPLETE: ${passed} / ${total} TESTS PASSED`);

  if (passed === total) {
    process.exit(0);
  } else {
    process.exit(1);
  }
}

runAudioQualitySuite().catch((err) => {
  console.error('Audio Quality Suite Exception:', err);
  process.exit(1);
});
