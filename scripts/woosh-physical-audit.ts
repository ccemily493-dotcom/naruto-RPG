import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { execSync } from 'child_process';

const WOOSH_DIR = path.join(process.cwd(), 'models', 'woosh');
const OUTPUT_DIR = path.join(process.cwd(), 'data', 'audio', 'generated', 'test');
const CATALOG_DIR = path.join(process.cwd(), 'data', 'audio');

function getSha256(filePath: string): string {
  const fileBuffer = fs.readFileSync(filePath);
  return crypto.createHash('sha256').update(fileBuffer).digest('hex');
}

async function runPhysicalAudit() {
  console.log('============================================================');
  console.log('SONYRESEARCH/WOOSH — DEFINITIVE PHYSICAL AUDIT & INFERENCE');
  console.log('============================================================');
  console.log(`Timestamp: ${new Date().toISOString()}\n`);

  // FASE 1 — AUDITORÍA DEL REPOSITORIO
  console.log('--- FASE 1: AUDITORÍA DEL REPOSITORIO Y COMPONENTES ---');
  const repoExists = fs.existsSync(WOOSH_DIR);
  console.log(`[REPOSITORY] Path: ${WOOSH_DIR} | Exists: ${repoExists ? 'YES' : 'NO'}`);

  // Determine python & uv paths
  const uvPath = 'C:/Users/Usuario/AppData/Local/Programs/Python/Python313/Scripts/uv.exe';
  const pythonPath = 'C:/Users/Usuario/AppData/Local/Programs/Python/Python313/python.exe';
  console.log(`[PYTHON] Executable: ${pythonPath} | uv: ${uvPath}`);

  // GPU & CUDA Check via Python
  console.log('\n--- FASE 4: GPU & CUDA DIAGNOSTICS ---');
  let cudaAvailable = false;
  let deviceName = 'CPU';
  try {
    const gpuCheckCmd = `"${pythonPath}" -c "import torch; print('CUDA:', torch.cuda.is_available()); print('DEVICE:', torch.cuda.get_device_name(0) if torch.cuda.is_available() else 'CPU')"`;
    const gpuOut = execSync(gpuCheckCmd, { encoding: 'utf8' }).trim();
    console.log(gpuOut);
    cudaAvailable = gpuOut.includes('CUDA: True');
    if (cudaAvailable) {
      deviceName = gpuOut.split('DEVICE:')[1]?.trim() || 'NVIDIA GPU';
    }
  } catch (e: any) {
    console.log('GPU Check Error:', e.message);
  }
  const wooshGpuStatus = cudaAvailable ? 'AVAILABLE' : 'UNAVAILABLE';
  console.log(`WOOSH_GPU_STATUS = ${wooshGpuStatus} (${deviceName})`);

  // Check Checkpoint Folders & Weights
  console.log('\n--- FASE 2: COMPONENTES Y PESOS ---');
  const checkpoints = ['Woosh-AE', 'TextConditionerA', 'Woosh-Flow', 'Woosh-DFlow'];
  const checkpointStatus: Record<string, { ok: boolean; weights: string[]; sizeMB: number }> = {};

  for (const cp of checkpoints) {
    const dir = path.join(WOOSH_DIR, 'checkpoints', cp);
    const exists = fs.existsSync(dir);
    let weights: string[] = [];
    let sizeMB = 0;
    if (exists) {
      const files = fs.readdirSync(dir);
      weights = files.filter(f => f.startsWith('weights') && (f.endsWith('.safetensors') || f.endsWith('.pt') || f.endsWith('.bin')));
      sizeMB = weights.reduce((acc, f) => acc + fs.statSync(path.join(dir, f)).size / (1024 * 1024), 0);
    }
    checkpointStatus[cp] = { ok: exists && weights.length > 0, weights, sizeMB: Math.round(sizeMB * 10) / 10 };
    console.log(`[CHECKPOINT] ${cp.padEnd(16)}: ${exists && weights.length > 0 ? '✅ OK' : '❌ MISSING'} | Weights: ${weights.join(', ')} (${checkpointStatus[cp].sizeMB} MB)`);
  }

  // FASE 5 — PRUEBA AISLADA
  console.log('\n--- FASE 5: PRUEBA DE INFERENCIA REAL AISLADA ---');
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  const testPrompt = 'cinematic metallic impact sound, short sharp transient';
  const testWavPath = path.join(OUTPUT_DIR, `test_woosh_${Date.now()}.wav`);
  const testStartTime = Date.now();

  console.log(`Prompt: "${testPrompt}"`);
  console.log(`Target WAV: ${testWavPath}`);
  console.log(`Model: Woosh-DFlow`);

  const inferCmd = `"${uvPath}" run infer_woosh.py --prompt "${testPrompt}" --output "${testWavPath}" --model Woosh-DFlow`;
  console.log(`Command: ${inferCmd}\n`);

  let stdout = '';
  let stderr = '';
  let exitCode = 0;

  try {
    stdout = execSync(inferCmd, { cwd: WOOSH_DIR, encoding: 'utf8', timeout: 300000, shell: true });
    console.log('STDOUT:', stdout.trim());
  } catch (e: any) {
    exitCode = e.status || 1;
    stdout = e.stdout || '';
    stderr = e.stderr || e.message || '';
    console.error('STDERR:', stderr.trim());
  }

  // FASE 6 — VERIFICACIÓN FÍSICA Y DE HASH
  console.log('\n--- FASE 6: VERIFICACIÓN FÍSICA Y CATALOG MATCH CHECK ---');
  const fileExists = fs.existsSync(testWavPath);
  const fileSize = fileExists ? fs.statSync(testWavPath).size : 0;
  const isCreatedAfterStart = fileExists && fs.statSync(testWavPath).mtimeMs >= testStartTime;

  console.log(`1. File exists:                 ${fileExists ? '✅ YES' : '❌ NO'}`);
  console.log(`2. File size > 0:                ${fileSize > 0 ? `✅ YES (${(fileSize / 1024).toFixed(1)} KB)` : '❌ NO'}`);
  console.log(`3. Created after test start:    ${isCreatedAfterStart ? '✅ YES' : '❌ NO'}`);

  let isWavValid = false;
  let durationS = 0;
  let generatedHash = '';

  if (fileExists && fileSize > 0) {
    // Read WAV header
    const buf = fs.readFileSync(testWavPath);
    const riff = buf.toString('ascii', 0, 4);
    const wave = buf.toString('ascii', 8, 12);
    const sampleRate = buf.readUInt32LE(24);
    const channels = buf.readUInt16LE(22);
    const bits = buf.readUInt16LE(34);

    isWavValid = riff === 'RIFF' && wave === 'WAVE' && sampleRate > 0;
    durationS = (fileSize - 44) / (sampleRate * channels * (bits / 8));
    generatedHash = getSha256(testWavPath);

    console.log(`4. Valid WAV format:            ${isWavValid ? `✅ YES (${sampleRate} Hz, ${channels} ch, ${bits}-bit)` : '❌ NO'}`);
    console.log(`5. Calculated Duration:         ${durationS.toFixed(2)}s`);
    console.log(`6. Calculated SHA-256 Hash:     ${generatedHash}`);

    // Check if SHA-256 matches any existing pre-recorded catalog file
    let catalogMatchFound = false;
    let matchedCatalogFile = '';

    const scanCatalog = (dir: string) => {
      if (!fs.existsSync(dir)) return;
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory() && entry.name !== 'test') {
          scanCatalog(full);
        } else if (entry.isFile() && (entry.name.endsWith('.wav') || entry.name.endsWith('.mp3'))) {
          // Exclude generated test file itself
          if (full !== testWavPath) {
            const h = getSha256(full);
            if (h === generatedHash) {
              catalogMatchFound = true;
              matchedCatalogFile = full;
            }
          }
        }
      }
    };

    scanCatalog(CATALOG_DIR);

    if (catalogMatchFound) {
      console.log(`7. Catalog Hash Match Check:    ❌ FAILED (Matches catalog file: ${matchedCatalogFile})`);
    } else {
      console.log(`7. Catalog Hash Match Check:    ✅ PASSED (100% Unique Brand-New Audio File)`);
    }

    const aiGenerationConfirmed = exitCode === 0 && fileExists && fileSize > 0 && isWavValid && !catalogMatchFound;

    console.log('\n============================================================');
    if (aiGenerationConfirmed) {
      console.log('✅ AI_GENERATION_CONFIRMED = TRUE');
      console.log(`   Woosh model physically produced a brand new WAV audio file.`);
      console.log(`   Path: ${testWavPath}`);
      console.log(`   Hash: ${generatedHash}`);
    } else {
      console.log('❌ AI_GENERATION_CONFIRMED = FALSE');
      console.log(`   Physical inference or file verification failed.`);
    }
    console.log('============================================================\n');
  } else {
    console.log('\n============================================================');
    console.log('❌ AI_GENERATION_CONFIRMED = FALSE');
    console.log(`   Physical inference failed to produce an output file.`);
    console.log('============================================================\n');
  }
}

runPhysicalAudit().catch(err => {
  console.error('Audit Exception:', err);
  process.exit(1);
});
