/**
 * SONYRESEARCH/WOOSH — REAL PHYSICAL INSTALLER V6
 * 
 * Verifies the complete Woosh installation:
 * [1/6] Repository clone
 * [2/6] Python & uv environment  
 * [3/6] uv sync (Woosh dependencies via pyproject.toml)
 * [4/6] Checkpoint weight files for all required models
 * [5/6] TextConditionerA + Woosh-AE dependencies
 * [6/6] Direct inference test
 */
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

const wooshDir = path.join(process.cwd(), 'models', 'woosh');
const checkpointsDir = path.join(wooshDir, 'checkpoints');

function checkWeights(name: string): { ok: boolean; files: string[] } {
  const dir = path.join(checkpointsDir, name);
  if (!fs.existsSync(dir)) return { ok: false, files: [] };
  const files = fs.readdirSync(dir).filter(f => f.startsWith('weights') && (f.endsWith('.safetensors') || f.endsWith('.pt') || f.endsWith('.bin')));
  return { ok: files.length > 0, files };
}

async function main() {
  console.log('============================================================');
  console.log('SONYRESEARCH/WOOSH — REAL PHYSICAL INSTALLER V6');
  console.log('============================================================\n');

  // STEP 1: Repository
  console.log('[1/6] Checking Repository (models/woosh)...');
  if (!fs.existsSync(wooshDir)) {
    console.log('      Cloning repository...');
    try {
      execSync('git clone https://github.com/SonyResearch/Woosh.git models/woosh', { stdio: 'inherit' });
      console.log('      [PASS] Repository cloned.');
    } catch (e: any) {
      console.error('      [FAIL] Could not clone repository:', e.message);
      process.exit(1);
    }
  } else {
    console.log(`      [PASS] Repository exists at ${wooshDir}`);
  }

  // STEP 2: Python & uv
  console.log('\n[2/6] Checking Python & uv...');
  try {
    const pyVer = execSync('python --version', { encoding: 'utf8' }).trim();
    console.log(`      [PASS] Python: ${pyVer}`);
  } catch {
    console.error('      [FAIL] Python not found.');
    process.exit(1);
  }
  try {
    const uvVer = execSync('uv --version', { encoding: 'utf8' }).trim();
    console.log(`      [PASS] uv: ${uvVer}`);
  } catch {
    console.error('      [FAIL] uv not found. Install with: pip install uv');
    process.exit(1);
  }

  // STEP 3: uv sync
  console.log('\n[3/6] Syncing Woosh Python environment (uv sync)...');
  try {
    execSync('uv sync --extra cpu', { cwd: wooshDir, stdio: 'inherit', timeout: 300000 });
    console.log('      [PASS] Woosh Python environment synced.');
  } catch (e: any) {
    console.warn('      [WARN] uv sync failed:', e.message);
    console.log('      Attempting uv sync without extras...');
    try {
      execSync('uv sync', { cwd: wooshDir, stdio: 'inherit', timeout: 300000 });
      console.log('      [PASS] Woosh Python environment synced (no extras).');
    } catch (e2: any) {
      console.error('      [FAIL] uv sync failed:', e2.message);
      process.exit(1);
    }
  }

  // STEP 4: Checkpoint Weight Files
  console.log('\n[4/6] Checking Checkpoint Weight Files...');
  const requiredModels = ['Woosh-AE', 'TextConditionerA', 'Woosh-Flow', 'Woosh-DFlow'];
  let allPresent = true;
  for (const model of requiredModels) {
    const { ok, files } = checkWeights(model);
    if (ok) {
      const totalMB = files.reduce((acc, f) => {
        try { return acc + fs.statSync(path.join(checkpointsDir, model, f)).size / (1024 * 1024); } catch { return acc; }
      }, 0);
      console.log(`      [PASS] ${model}: ${files.join(', ')} (${totalMB.toFixed(1)} MB)`);
    } else {
      console.error(`      [FAIL] ${model}: NO weight files found in checkpoints/${model}/`);
      allPresent = false;
    }
  }

  // Optional models
  const optionalModels = ['Woosh-CLAP'];
  for (const model of optionalModels) {
    const { ok, files } = checkWeights(model);
    if (ok) {
      console.log(`      [OK]   ${model}: ${files.join(', ')} (optional)`);
    } else {
      console.log(`      [SKIP] ${model}: not present (optional for T2A)`);
    }
  }

  if (!allPresent) {
    console.error('\n============================================================');
    console.error('WOOSH INSTALLATION INCOMPLETE — Missing Checkpoint Weights');
    console.error('============================================================');
    console.error('Run: npx tsx scripts/download-woosh-release.ts');
    console.error('Or manually download from: https://github.com/SonyResearch/Woosh/releases/tag/v1.0.0\n');
    process.exit(1);
  }

  // STEP 5: Verify dependency chain (config.yaml references)
  console.log('\n[5/6] Verifying Model Dependency Chain...');
  for (const model of ['Woosh-Flow', 'Woosh-DFlow']) {
    const configPath = path.join(checkpointsDir, model, 'config.yaml');
    if (fs.existsSync(configPath)) {
      const config = fs.readFileSync(configPath, 'utf8');
      const deps: string[] = [];
      if (config.includes('checkpoints/Woosh-AE')) deps.push('Woosh-AE');
      if (config.includes('checkpoints/TextConditionerA')) deps.push('TextConditionerA');
      if (config.includes('checkpoints/Woosh-CLAP')) deps.push('Woosh-CLAP');

      let allDepsOk = true;
      for (const dep of deps) {
        const { ok } = checkWeights(dep);
        if (!ok) {
          console.error(`      [FAIL] ${model} requires ${dep} but weights are missing`);
          allDepsOk = false;
        }
      }
      if (allDepsOk) {
        console.log(`      [PASS] ${model} dependencies: ${deps.join(', ')}`);
      }
    }
  }

  // STEP 6: Inference Test
  console.log('\n[6/6] Running Direct Inference Test...');
  console.log('      Testing with Woosh-DFlow (faster, 4 steps)...');
  const testOutputPath = path.join(wooshDir, 'outputs', 'setup_test.wav');
  try {
    const testCmd = `uv run infer_woosh.py --prompt "short cinematic game sound effect, supernatural chakra energy charging, deep resonant hum, subtle energy pulses, no music, no voice" --output "${testOutputPath}" --model Woosh-DFlow`;
    console.log(`      Command: ${testCmd}`);
    const startTime = Date.now();
    const result = execSync(testCmd, { cwd: wooshDir, encoding: 'utf8', timeout: 600000 });
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`      Inference completed in ${elapsed}s`);

    // Parse JSON result
    try {
      const jsonLine = result.trim().split('\n').pop() || '';
      const parsed = JSON.parse(jsonLine);
      console.log(`      Model: ${parsed.model}`);
      console.log(`      Device: ${parsed.device}`);
      console.log(`      Steps: ${parsed.steps}`);
      console.log(`      Generation Time: ${parsed.generation_time_s}s`);
    } catch {}

    if (fs.existsSync(testOutputPath) && fs.statSync(testOutputPath).size > 0) {
      const size = fs.statSync(testOutputPath).size;
      console.log(`      Output: ${testOutputPath} (${(size / 1024).toFixed(1)} KB)`);
      console.log('      [PASS] ✅ AI_GENERATION_CONFIRMED = TRUE');
    } else {
      console.error('      [FAIL] Output file not created or empty');
      console.error('      ❌ AI_GENERATION_CONFIRMED = FALSE');
      process.exit(1);
    }
  } catch (e: any) {
    console.error('      [FAIL] Inference test failed:', e.message);
    if (e.stderr) console.error('      stderr:', e.stderr);
    console.error('      ❌ AI_GENERATION_CONFIRMED = FALSE');
    process.exit(1);
  }

  console.log('\n============================================================');
  console.log('WOOSH INSTALLATION COMPLETE — ALL CHECKS PASSED');
  console.log('============================================================\n');
}

main().catch(err => {
  console.error('FATAL:', err);
  process.exit(1);
});
