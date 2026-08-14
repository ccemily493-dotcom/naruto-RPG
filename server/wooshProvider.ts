import fs from 'fs';
import path from 'path';
import { exec, execSync } from 'child_process';
import { generateSFXHash, getCachedSFX, saveCachedSFX } from './audioCache';
import { SFXGenerateOptions, SFXGenerateResult } from './sfxProvider';
import { analyzeWavFile } from './audioAnalyzer';

export interface WooshInferenceResult {
  success: boolean;
  provider: 'Woosh';
  model: string;
  repoPath: string;
  pythonPath: string;
  checkpointPath: string;
  command: string;
  exitCode: number;
  stdout: string;
  stderr: string;
  generationTimeMs: number;
  generatedFile: string | null;
  fileSize: number;
  duration: number;
  isCached: boolean;
  acousticPrompt: string;
  errorReason: string | null;
  aiGenerationConfirmed: boolean;
  /** Detailed availability diagnostics */
  diagnostics?: WooshDiagnostics;
}

export interface WooshDiagnostics {
  repoExists: boolean;
  inferScriptExists: boolean;
  uvAvailable: boolean;
  checkpoints: Record<string, {
    dirExists: boolean;
    configExists: boolean;
    weightFiles: string[];
    totalWeightSizeMB: number;
  }>;
  overallReady: boolean;
  missingComponents: string[];
}

/**
 * Required checkpoint directories and their expected weight file patterns
 * for Woosh-Flow / Woosh-DFlow T2A generation.
 *
 * The official zip files place weights as:
 *   - checkpoints/Woosh-AE/weights.safetensors
 *   - checkpoints/TextConditionerA/weights.safetensors  (or weights_*.safetensors)
 *   - checkpoints/Woosh-CLAP/weights_audio.safetensors + weights_text.safetensors
 *   - checkpoints/Woosh-Flow/weights.safetensors
 *   - checkpoints/Woosh-DFlow/weights.safetensors
 */
const REQUIRED_CHECKPOINTS_FLOW = ['Woosh-Flow', 'Woosh-AE', 'TextConditionerA'];
const REQUIRED_CHECKPOINTS_DFLOW = ['Woosh-DFlow', 'Woosh-AE', 'TextConditionerA'];

export class WooshSFXProvider {
  public repoPath: string;
  public pythonPath: string;
  public modelName: string;
  public checkpointPath: string;

  constructor() {
    this.repoPath = process.env.WOOSH_REPO_PATH || path.join(process.cwd(), 'models', 'woosh');
    this.pythonPath = process.env.WOOSH_PYTHON_PATH || 'uv';
    this.modelName = process.env.WOOSH_MODEL_NAME || 'Woosh-DFlow';
    this.checkpointPath = path.join(this.repoPath, 'checkpoints', this.modelName);
  }

  /**
   * Check if a checkpoint directory has weight files.
   * Accepts any file matching weights*.safetensors, weights*.pt, or weights*.bin
   */
  private checkpointHasWeights(checkpointName: string): { hasWeights: boolean; weightFiles: string[]; totalSizeMB: number } {
    const dir = path.join(this.repoPath, 'checkpoints', checkpointName);
    if (!fs.existsSync(dir)) return { hasWeights: false, weightFiles: [], totalSizeMB: 0 };

    const files = fs.readdirSync(dir);
    const weightFiles = files.filter(f =>
      f.startsWith('weights') && (f.endsWith('.safetensors') || f.endsWith('.pt') || f.endsWith('.bin'))
    );
    const totalSizeMB = weightFiles.reduce((acc, f) => {
      try { return acc + fs.statSync(path.join(dir, f)).size / (1024 * 1024); } catch { return acc; }
    }, 0);

    return { hasWeights: weightFiles.length > 0, weightFiles, totalSizeMB };
  }

  private getUvExecPath(): string {
    if (process.env.WOOSH_PYTHON_PATH) return process.env.WOOSH_PYTHON_PATH;
    const knownPaths = [
      'C:/Users/Usuario/AppData/Local/Programs/Python/Python313/Scripts/uv.exe',
      'C:/Users/Usuario/AppData/Local/Programs/Python/Python313/uv.exe',
    ];
    for (const p of knownPaths) {
      if (fs.existsSync(p)) return p;
    }
    return 'uv';
  }

  /**
   * Full diagnostics of Woosh installation status
   */
  public getDiagnostics(): WooshDiagnostics {
    const repoExists = fs.existsSync(this.repoPath);
    const inferScriptExists = fs.existsSync(path.join(this.repoPath, 'infer_woosh.py'));

    let uvAvailable = false;
    let uvError = '';
    try {
      const uvCmd = this.getUvExecPath();
      execSync(`${uvCmd} --version`, { cwd: this.repoPath, timeout: 5000, stdio: 'pipe' });
      uvAvailable = true;
    } catch (err: any) {
      uvError = err?.message || String(err);
    }

    const requiredCheckpoints = this.modelName === 'Woosh-Flow'
      ? REQUIRED_CHECKPOINTS_FLOW
      : REQUIRED_CHECKPOINTS_DFLOW;

    const checkpoints: WooshDiagnostics['checkpoints'] = {};
    const missingComponents: string[] = [];

    if (!repoExists) missingComponents.push('Repository (models/woosh)');
    if (!inferScriptExists) missingComponents.push('Inference script (infer_woosh.py)');
    if (!uvAvailable) missingComponents.push(`uv package manager (${uvError})`);

    for (const cp of requiredCheckpoints) {
      const dir = path.join(this.repoPath, 'checkpoints', cp);
      const dirExists = fs.existsSync(dir);
      const configExists = dirExists && fs.existsSync(path.join(dir, 'config.yaml'));
      const { hasWeights, weightFiles, totalSizeMB } = this.checkpointHasWeights(cp);

      checkpoints[cp] = {
        dirExists,
        configExists,
        weightFiles,
        totalWeightSizeMB: Math.round(totalSizeMB * 10) / 10,
      };

      if (!dirExists) missingComponents.push(`Checkpoint directory: ${cp}`);
      else if (!configExists) missingComponents.push(`Config file: ${cp}/config.yaml`);
      else if (!hasWeights) missingComponents.push(`Weight files: ${cp}/weights*.safetensors`);
    }

    const overallReady = repoExists && inferScriptExists && uvAvailable && missingComponents.length === 0;

    return { repoExists, inferScriptExists, uvAvailable, checkpoints, overallReady, missingComponents };
  }

  /**
   * STRICT AVAILABILITY CHECK:
   * Returns true ONLY if repository, inference script, uv, AND all required model checkpoints with weights exist.
   * NO SIMULATED AVAILABILITY EVER.
   */
  public isAvailable(): boolean {
    return this.getDiagnostics().overallReady;
  }

  public getCapabilities() {
    const diagnostics = this.getDiagnostics();
    return {
      providerName: 'SonyResearch/Woosh',
      modelName: this.modelName,
      repoPath: this.repoPath,
      pythonPath: this.pythonPath,
      checkpointPath: this.checkpointPath,
      isAvailable: diagnostics.overallReady,
      diagnostics,
      status: diagnostics.overallReady
        ? `READY — All checkpoints verified (${Object.entries(diagnostics.checkpoints).map(([k, v]) => `${k}: ${v.weightFiles.join(', ')}`).join(' | ')})`
        : `WOOSH UNAVAILABLE — Missing: ${diagnostics.missingComponents.join(', ')}`,
    };
  }

  /**
   * Converts narrative intent into an acoustically specific prompt for Woosh
   */
  public buildAcousticPrompt(prompt: string, options: SFXGenerateOptions): string {
    const ev = (options.event || '').toLowerCase();

    if (ev.includes('kunai_throw') || ev.includes('blade_slash')) {
      return 'Short cinematic game foley. Sharp steel projectile rapidly slicing through air. Clean transient, fast movement, dry recording, no music, no ambience, no voice.';
    }
    if (ev.includes('wood') || ev.includes('root') || ev.includes('mokuton')) {
      return 'Organic supernatural wood growth. Thick roots rapidly emerging from soil, fibrous wood cracking and stretching, deep organic creaks, short cinematic game SFX, no music, no voice.';
    }
    if (ev.includes('chakra') || ev.includes('energy')) {
      return 'Supernatural energy charging. Low resonant chakra hum gradually increasing, subtle vibrating energy pulse, short cinematic game SFX, no voice, no music.';
    }
    if (ev.includes('metal_wood_impact') || ev.includes('impact')) {
      return 'Heavy cinematic game impact foley. Sharp steel kunai blade violently slamming and embedding into hard wooden tree trunk, solid wood resonance, dry recording, no music.';
    }

    return `${prompt}. Short cinematic game sound effect, clean transient, dry recording, no music, no background noise, no voice.`;
  }

  /**
   * Direct Woosh Inference Execution via uv run infer_woosh.py
   * Strictly isolated from fallbacks when AI_ONLY_TEST_MODE or bypassFallback is active.
   */
  public async generateWooshDirect(
    prompt: string,
    options: SFXGenerateOptions & { bypassCache?: boolean }
  ): Promise<WooshInferenceResult> {
    const startTime = Date.now();
    const acousticPrompt = this.buildAcousticPrompt(prompt, options);
    const hash = generateSFXHash('action', options.event || 'generic', options.material || 'neutral', options.intensity || 0.5, prompt, options.context || '', 'woosh', this.modelName);

    // 1. Check Cache if not bypassed
    if (!options.bypassCache) {
      const cached = getCachedSFX(hash);
      if (cached) {
        const analysis = analyzeWavFile(cached.filePath);
        return {
          success: true,
          provider: 'Woosh',
          model: this.modelName,
          repoPath: this.repoPath,
          pythonPath: this.pythonPath,
          checkpointPath: this.checkpointPath,
          command: 'CACHE_HIT (SHA-256)',
          exitCode: 0,
          stdout: `Loaded from persistent cache: ${cached.filePath}`,
          stderr: '',
          generationTimeMs: Date.now() - startTime,
          generatedFile: cached.fileUrl,
          fileSize: fs.existsSync(cached.filePath) ? fs.statSync(cached.filePath).size : 0,
          duration: analysis.duration || cached.duration,
          isCached: true,
          acousticPrompt,
          errorReason: null,
          aiGenerationConfirmed: true,
        };
      }
    }

    // 2. Strict Check for Woosh Prerequisites
    const diagnostics = this.getDiagnostics();
    if (!diagnostics.overallReady) {
      return {
        success: false,
        provider: 'Woosh',
        model: this.modelName,
        repoPath: this.repoPath,
        pythonPath: this.pythonPath,
        checkpointPath: this.checkpointPath,
        command: 'N/A (Woosh Not Available)',
        exitCode: -1,
        stdout: '',
        stderr: `WOOSH UNAVAILABLE: ${diagnostics.missingComponents.join(', ')}`,
        generationTimeMs: Date.now() - startTime,
        generatedFile: null,
        fileSize: 0,
        duration: 0,
        isCached: false,
        acousticPrompt,
        errorReason: `WOOSH UNAVAILABLE: Missing: ${diagnostics.missingComponents.join(', ')}. Run: npx tsx scripts/download-woosh-release.ts`,
        aiGenerationConfirmed: false,
        diagnostics,
      };
    }

    // 3. Physical Woosh Execution via uv run infer_woosh.py
    const outputFilename = `woosh_${hash}.wav`;
    const outputPath = path.join(process.cwd(), 'data', 'audio', 'generated', outputFilename);

    // Ensure output directory exists
    const outputDir = path.dirname(outputPath);
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    // Escape the prompt for shell (replace double quotes)
    const escapedPrompt = acousticPrompt.replace(/"/g, '\\"');

    // Use uv run to execute within the Woosh project environment
    const uvCmd = this.getUvExecPath();
    const cmd = `${uvCmd} run infer_woosh.py --prompt "${escapedPrompt}" --output "${outputPath}" --model ${this.modelName}`;

    const customEnv = {
      ...process.env,
      PATH: `${process.env.PATH || ''};C:\\Users\\Usuario\\AppData\\Local\\Programs\\Python\\Python313\\Scripts;C:\\Users\\Usuario\\AppData\\Local\\Programs\\Python\\Python313`,
    };

    try {
      const execResult = await new Promise<{ stdout: string; stderr: string; exitCode: number }>((resolve) => {
        // Allow up to 10 minutes for CPU inference (model loading + generation can be very slow on CPU)
        exec(cmd, { cwd: this.repoPath, timeout: 600000, maxBuffer: 10 * 1024 * 1024, env: customEnv, shell: true } as any, (error: any, stdout: any, stderr: any) => {
          resolve({
            stdout: stdout || '',
            stderr: stderr || (error ? error.message : ''),
            exitCode: error ? (typeof error.code === 'number' ? error.code : 1) : 0,
          });
        });
      });

      const fileCreated = fs.existsSync(outputPath);
      const isWavFileInGeneratedDir = outputPath.includes(path.join('data', 'audio', 'generated'));
      const fileSize = fileCreated ? fs.statSync(outputPath).size : 0;
      const analysis = fileCreated ? analyzeWavFile(outputPath) : { duration: 0, isValidWav: false };

      // Parse JSON result from stdout if available
      let wooshResult: any = null;
      try {
        const jsonLine = execResult.stdout.trim().split('\n').pop() || '';
        wooshResult = JSON.parse(jsonLine);
      } catch {}

      const isPhysicalConfirmed = fileCreated && isWavFileInGeneratedDir && fileSize > 0 && (analysis.isValidWav !== false);

      if (isPhysicalConfirmed) {
        saveCachedSFX(hash, 'Woosh', this.modelName, options.event || 'woosh_gen', acousticPrompt, fs.readFileSync(outputPath), 'wav', analysis.duration);
        return {
          success: true,
          provider: 'Woosh',
          model: this.modelName,
          repoPath: this.repoPath,
          pythonPath: this.pythonPath,
          checkpointPath: this.checkpointPath,
          command: cmd,
          exitCode: execResult.exitCode,
          stdout: execResult.stdout,
          stderr: execResult.stderr,
          generationTimeMs: Date.now() - startTime,
          generatedFile: `/audio/generated/${outputFilename}`,
          fileSize,
          duration: analysis.duration,
          isCached: false,
          acousticPrompt,
          errorReason: null,
          aiGenerationConfirmed: true,
          diagnostics,
        };
      } else {
        // Determine specific error reason
        let errorReason = `Woosh execution finished with exitCode ${execResult.exitCode}`;
        if (!fileCreated) errorReason += ' — No output file generated';
        if (fileSize === 0) errorReason += ' — Output file is empty (0 bytes)';
        if (wooshResult?.error) errorReason += ` — Python error: ${wooshResult.error}`;
        if (execResult.stderr.includes('CUDA')) errorReason += ' — CUDA/GPU error detected';
        if (execResult.stderr.includes('OutOfMemoryError')) errorReason += ' — Out of memory';
        if (execResult.stderr.includes('ModuleNotFoundError')) errorReason += ' — Missing Python dependency';
        if (execResult.stderr.includes('FileNotFoundError')) errorReason += ' — Missing checkpoint file';

        return {
          success: false,
          provider: 'Woosh',
          model: this.modelName,
          repoPath: this.repoPath,
          pythonPath: this.pythonPath,
          checkpointPath: this.checkpointPath,
          command: cmd,
          exitCode: execResult.exitCode,
          stdout: execResult.stdout,
          stderr: execResult.stderr,
          generationTimeMs: Date.now() - startTime,
          generatedFile: null,
          fileSize: 0,
          duration: 0,
          isCached: false,
          acousticPrompt,
          errorReason,
          aiGenerationConfirmed: false,
          diagnostics,
        };
      }
    } catch (err: any) {
      return {
        success: false,
        provider: 'Woosh',
        model: this.modelName,
        repoPath: this.repoPath,
        pythonPath: this.pythonPath,
        checkpointPath: this.checkpointPath,
        command: cmd,
        exitCode: -1,
        stdout: '',
        stderr: err.message,
        generationTimeMs: Date.now() - startTime,
        generatedFile: null,
        fileSize: 0,
        duration: 0,
        isCached: false,
        acousticPrompt,
        errorReason: `Woosh execution exception: ${err.message}`,
        aiGenerationConfirmed: false,
        diagnostics,
      };
    }
  }
}
