import { WooshSFXProvider } from '../server/wooshProvider';
import path from 'path';
import fs from 'fs';

async function runPhysicalWooshAudit() {
  console.log('============================================================');
  console.log('PHYSICAL WOOSH PROVIDER AUDIT SUITE');
  console.log('============================================================\n');

  const woosh = new WooshSFXProvider();
  const caps = woosh.getCapabilities();

  console.log('--- STEP 1: Repository & Checkpoint Path Inspection ---');
  console.log(`Repository Path:  ${caps.repoPath}`);
  console.log(`Python Path:      ${caps.pythonPath}`);
  console.log(`Model Checkpoint: ${caps.checkpointPath}`);
  console.log(`Available Status: ${caps.isAvailable ? 'READY' : 'UNAVAILABLE'}\n`);

  if (!woosh.isAvailable()) {
    console.log('--- RESULT REPORT: WOOSH CHECKPOINTS NOT INSTALLED ---');
    console.log('AI_GENERATION_CONFIRMED = FALSE');
    console.log('WOOSH FAILED');
    console.log(`Reason: Missing repository or model weights at ${caps.checkpointPath}`);
    console.log('Strict Mode Action: No sound played. Pure silence maintained. ZERO fallback simulation.\n');
    console.log('============================================================');
    console.log('PHYSICAL AUDIT COMPLETED (UNPASSIVE SIMULATION PREVENTED)');
    console.log('============================================================');
    process.exit(0); // Expected clean exit reporting unavailable status cleanly
  }

  console.log('--- STEP 2: Executing Fresh Woosh Physical Inference ---');
  const result = await woosh.generateWooshDirect('short cinematic game foley. sharp steel blade slicing rapidly through air', {
    event: 'kunai_throw',
    material: 'metal',
    intensity: 0.85,
    bypassCache: true,
  });

  if (result.success && result.generatedFile) {
    const fullFilePath = path.join(process.cwd(), 'data', result.generatedFile.replace('/audio/', 'audio/'));
    const inGeneratedDir = result.generatedFile.startsWith('/audio/generated/');
    const notInSfxDir = !result.generatedFile.includes('audio/sfx/') && !result.generatedFile.includes('audio/ambience/');

    console.log('\n--- STEP 3: Physical File Verification ---');
    console.log(`File Exists:             ${fs.existsSync(fullFilePath)}`);
    console.log(`In data/audio/generated: ${inGeneratedDir}`);
    console.log(`Isolated from catalog:   ${notInSfxDir}`);
    console.log(`File Size:               ${result.fileSize} bytes`);
    console.log(`Duration:                ${result.duration} s`);
    console.log(`Generation Time:         ${result.generationTimeMs} ms\n`);

    if (fs.existsSync(fullFilePath) && inGeneratedDir && notInSfxDir && result.fileSize > 0) {
      console.log('============================================================');
      console.log('AI_GENERATION_CONFIRMED = TRUE');
      console.log('============================================================');
      process.exit(0);
    }
  }

  console.error('============================================================');
  console.error('AI_GENERATION_CONFIRMED = FALSE');
  console.error('WOOSH FAILED');
  console.error(`Reason: ${result.errorReason || 'Physical output file missing'}`);
  console.error('============================================================');
  process.exit(1);
}

runPhysicalWooshAudit().catch((err) => {
  console.error('Audit exception:', err);
  process.exit(1);
});
