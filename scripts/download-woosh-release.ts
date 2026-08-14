/**
 * Download missing Woosh v1.0.0 release assets one at a time,
 * extracting and deleting each zip to save disk space.
 */
import fs from 'fs';
import path from 'path';
import https from 'https';
import { execSync } from 'child_process';

const WOOSH_DIR = path.join(process.cwd(), 'models', 'woosh');
const CHECKPOINTS_DIR = path.join(WOOSH_DIR, 'checkpoints');
const BASE_URL = 'https://github.com/SonyResearch/Woosh/releases/download/v1.0.0/';

// Required assets for T2A generation and what file(s) they should produce
const REQUIRED_ASSETS: Array<{
  zip: string;
  checkDir: string;
  requiredFiles: string[];
}> = [
  {
    zip: 'TextConditionerA.zip',
    checkDir: 'TextConditionerA',
    requiredFiles: ['config.yaml'], // weights might have different names
  },
  {
    zip: 'Woosh-Flow.zip',
    checkDir: 'Woosh-Flow',
    requiredFiles: ['config.yaml'],
  },
  {
    zip: 'Woosh-DFlow.zip',
    checkDir: 'Woosh-DFlow',
    requiredFiles: ['config.yaml'],
  },
];

function hasWeights(checkDir: string): boolean {
  const dir = path.join(CHECKPOINTS_DIR, checkDir);
  if (!fs.existsSync(dir)) return false;
  const files = fs.readdirSync(dir);
  return files.some(f => f.startsWith('weights.'));
}

function followRedirects(url: string, maxRedirects = 5): Promise<NodeJS.ReadableStream> {
  return new Promise((resolve, reject) => {
    const doRequest = (location: string, redirectsLeft: number) => {
      const mod = location.startsWith('https') ? https : require('http');
      mod.get(location, (res: any) => {
        if ((res.statusCode === 301 || res.statusCode === 302) && res.headers.location) {
          if (redirectsLeft <= 0) return reject(new Error('Too many redirects'));
          return doRequest(res.headers.location, redirectsLeft - 1);
        }
        if (res.statusCode !== 200) {
          return reject(new Error(`HTTP ${res.statusCode} for ${url}`));
        }
        resolve(res);
      }).on('error', reject);
    };
    doRequest(url, maxRedirects);
  });
}

async function downloadFile(url: string, dest: string): Promise<void> {
  const stream = await followRedirects(url);
  const file = fs.createWriteStream(dest);
  return new Promise((resolve, reject) => {
    (stream as any).pipe(file);
    file.on('finish', () => { file.close(); resolve(); });
    file.on('error', (err: Error) => { fs.unlinkSync(dest); reject(err); });
  });
}

async function main() {
  console.log('============================================================');
  console.log('WOOSH v1.0.0 — SEQUENTIAL DOWNLOAD & EXTRACT');
  console.log('============================================================\n');

  for (const asset of REQUIRED_ASSETS) {
    // Skip if weights already extracted
    if (hasWeights(asset.checkDir)) {
      console.log(`[SKIP] ${asset.checkDir} — weights already present.`);
      continue;
    }

    const zipPath = path.join(WOOSH_DIR, asset.zip);

    // Download if zip not present
    if (!fs.existsSync(zipPath)) {
      const url = BASE_URL + asset.zip;
      console.log(`\n[DOWNLOAD] ${asset.zip} from ${url} ...`);
      const start = Date.now();
      try {
        await downloadFile(url, zipPath);
        const sizeMB = (fs.statSync(zipPath).size / (1024 * 1024)).toFixed(1);
        const elapsed = ((Date.now() - start) / 1000).toFixed(0);
        console.log(`[PASS] Downloaded ${asset.zip} (${sizeMB} MB) in ${elapsed}s`);
      } catch (err: any) {
        console.error(`[FAIL] Download ${asset.zip}: ${err.message}`);
        continue;
      }
    } else {
      console.log(`[EXISTS] ${asset.zip} already on disk.`);
    }

    // Extract
    console.log(`[EXTRACT] ${asset.zip} → models/woosh/ ...`);
    try {
      const psCmd = `powershell -Command "Expand-Archive -Path '${zipPath.replace(/'/g, "''")}' -DestinationPath '${WOOSH_DIR.replace(/'/g, "''")}' -Force"`;
      execSync(psCmd, { stdio: 'inherit', timeout: 300000 });
      console.log(`[PASS] Extracted ${asset.zip}`);
    } catch (err: any) {
      console.error(`[FAIL] Extract ${asset.zip}: ${err.message}`);
      continue;
    }

    // Verify extraction
    const dir = path.join(CHECKPOINTS_DIR, asset.checkDir);
    if (fs.existsSync(dir)) {
      const contents = fs.readdirSync(dir);
      console.log(`[VERIFY] ${asset.checkDir}/ contents: ${contents.join(', ')}`);
      if (hasWeights(asset.checkDir)) {
        console.log(`[PASS] Weights found for ${asset.checkDir}`);
      } else {
        console.warn(`[WARN] No weights.* file found in ${asset.checkDir}/`);
      }
    }

    // Delete zip to save disk space
    console.log(`[CLEANUP] Deleting ${asset.zip} to free disk space...`);
    try {
      fs.unlinkSync(zipPath);
      console.log(`[PASS] Deleted ${asset.zip}`);
    } catch (err: any) {
      console.warn(`[WARN] Could not delete ${asset.zip}: ${err.message}`);
    }
  }

  // Final summary
  console.log('\n============================================================');
  console.log('CHECKPOINT SUMMARY');
  console.log('============================================================');
  const allDirs = ['Woosh-AE', 'Woosh-CLAP', 'Woosh-Flow', 'Woosh-DFlow', 'TextConditionerA'];
  for (const d of allDirs) {
    const dir = path.join(CHECKPOINTS_DIR, d);
    if (!fs.existsSync(dir)) {
      console.log(`  ${d}: [MISSING]`);
      continue;
    }
    const files = fs.readdirSync(dir);
    const wf = files.filter(f => f.startsWith('weights.'));
    if (wf.length > 0) {
      const sizes = wf.map(f => `${f} (${(fs.statSync(path.join(dir, f)).size / (1024*1024)).toFixed(1)} MB)`);
      console.log(`  ${d}: [OK] ${sizes.join(', ')}`);
    } else {
      console.log(`  ${d}: [MISSING WEIGHTS] files: ${files.join(', ')}`);
    }
  }
}

main().catch(err => {
  console.error('FATAL:', err);
  process.exit(1);
});
