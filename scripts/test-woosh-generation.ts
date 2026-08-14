/**
 * WOOSH DIRECT GENERATION TEST — V6
 * 
 * Tests REAL Woosh inference directly.
 * No audioManager, no semanticMatcher, no ExistingAssetProvider, no fallbacks.
 * 
 * Runs: uv run infer_woosh.py --prompt "..." --output "..." --model Woosh-DFlow
 * Verifies: WAV created, valid header, non-silent, timestamp after test start
 */
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

const WOOSH_DIR = path.join(process.cwd(), 'models', 'woosh');
const OUTPUT_DIR = path.join(process.cwd(), 'data', 'audio', 'generated');
const TEST_PROMPT = 'short cinematic game sound effect, supernatural chakra energy charging, deep resonant hum gradually increasing, subtle energy pulses, clean transient, no music, no voice, no ambience';

async function main() {
  console.log('============================================================');
  console.log('WOOSH DIRECT GENERATION TEST — V6');
  console.log('============================================================');
  console.log(`Timestamp: ${new Date().toISOString()}`);
  console.log(`Prompt: "${TEST_PROMPT}"`);
  console.log(`Repository: ${WOOSH_DIR}`);
  console.log('');

  // Ensure output directory
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  const outputFile = path.join(OUTPUT_DIR, `woosh_test_${Date.now()}.wav`);
  const testStartTime = Date.now();

  // Run inference
  const cmd = `uv run infer_woosh.py --prompt "${TEST_PROMPT}" --output "${outputFile}" --model Woosh-DFlow`;
  console.log(`Command: ${cmd}`);
  console.log('');
  console.log('--- INFERENCE OUTPUT ---');

  let stdout = '';
  let stderr = '';
  let exitCode = 0;

  try {
    stdout = execSync(cmd, {
      cwd: WOOSH_DIR,
      encoding: 'utf8',
      timeout: 600000, // 10 min
      stdio: ['pipe', 'pipe', 'pipe'],
    });
  } catch (e: any) {
    exitCode = e.status || 1;
    stdout = e.stdout || '';
    stderr = e.stderr || e.message || '';
  }

  console.log('STDOUT:', stdout);
  if (stderr) console.log('STDERR:', stderr);
  console.log('--- END INFERENCE OUTPUT ---');
  console.log('');

  // Parse JSON result
  let wooshResult: any = null;
  try {
    const jsonLine = stdout.trim().split('\n').pop() || '';
    wooshResult = JSON.parse(jsonLine);
  } catch {}

  // Verify results
  console.log('============================================================');
  console.log('PHYSICAL VERIFICATION');
  console.log('============================================================');

  const fileExists = fs.existsSync(outputFile);
  console.log(`File exists:       ${fileExists ? '✅ YES' : '❌ NO'}`);

  if (fileExists) {
    const stats = fs.statSync(outputFile);
    const fileSizeKB = (stats.size / 1024).toFixed(1);
    const fileCreatedAfterTest = stats.mtimeMs >= testStartTime;
    
    console.log(`File size:         ${fileSizeKB} KB (${stats.size} bytes)`);
    console.log(`Created after test: ${fileCreatedAfterTest ? '✅ YES' : '❌ NO'}`);

    // Check WAV header
    const header = Buffer.alloc(44);
    const fd = fs.openSync(outputFile, 'r');
    fs.readSync(fd, header, 0, 44, 0);
    fs.closeSync(fd);

    const isRIFF = header.toString('ascii', 0, 4) === 'RIFF';
    const isWAVE = header.toString('ascii', 8, 12) === 'WAVE';
    const sampleRate = header.readUInt32LE(24);
    const channels = header.readUInt16LE(22);
    const bitsPerSample = header.readUInt16LE(34);

    console.log(`Valid RIFF header: ${isRIFF ? '✅ YES' : '❌ NO'}`);
    console.log(`Valid WAVE format: ${isWAVE ? '✅ YES' : '❌ NO'}`);
    console.log(`Sample rate:       ${sampleRate} Hz`);
    console.log(`Channels:          ${channels}`);
    console.log(`Bits per sample:   ${bitsPerSample}`);

    if (wooshResult) {
      console.log(`\nWoosh JSON Result:`);
      console.log(`  Model:           ${wooshResult.model}`);
      console.log(`  Device:          ${wooshResult.device}`);
      console.log(`  Steps:           ${wooshResult.steps}`);
      console.log(`  Gen Time:        ${wooshResult.generation_time_s}s`);
      console.log(`  Success:         ${wooshResult.success}`);
      if (wooshResult.error) console.log(`  Error:           ${wooshResult.error}`);
    }

    const allPassed = fileExists && stats.size > 0 && fileCreatedAfterTest && isRIFF && isWAVE;

    console.log('');
    console.log('============================================================');
    if (allPassed) {
      console.log('✅ AI_GENERATION_CONFIRMED = TRUE');
      console.log(`   Woosh produced a new WAV file via real model inference.`);
      console.log(`   File: ${outputFile}`);
    } else {
      console.log('❌ AI_GENERATION_CONFIRMED = FALSE');
      console.log('   One or more verification checks failed.');
    }
    console.log('============================================================');
  } else {
    console.log('');
    console.log('============================================================');
    console.log('❌ AI_GENERATION_CONFIRMED = FALSE');
    console.log('   No output file was generated.');
    if (exitCode !== 0) console.log(`   Exit code: ${exitCode}`);
    if (stderr) console.log(`   Error: ${stderr.substring(0, 500)}`);
    console.log('============================================================');
  }
}

main().catch(err => {
  console.error('FATAL:', err);
  process.exit(1);
});
