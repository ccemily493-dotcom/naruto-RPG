import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';
import { generateSFXHash, getCachedSFX, saveCachedSFX } from './audioCache';
import { SFXGeneratorProvider, SFXGenerateOptions, SFXGenerateResult, SFXGeneratorCapabilities } from './sfxProvider';

export class DashengSFXProvider implements SFXGeneratorProvider {
  private binPath: string;
  private modelName = 'Dasheng-AudioGen-2B';

  constructor() {
    this.binPath = process.env.DASHENG_BIN_PATH || path.join(process.cwd(), 'bin', 'audiogen.exe');
  }

  public isAvailable(): boolean {
    return fs.existsSync(this.binPath);
  }

  public getCapabilities(): SFXGeneratorCapabilities {
    const available = this.isAvailable();
    return {
      providerName: 'Dasheng',
      modelName: this.modelName,
      isLocal: true,
      supportedFormats: ['wav'],
      status: available ? 'READY' : 'UNAVAILABLE (Place binary at bin/audiogen.exe)',
    };
  }

  public async generateSFX(prompt: string, options: SFXGenerateOptions): Promise<SFXGenerateResult> {
    const startTime = Date.now();
    const type = options.type || 'action';
    const event = options.event || 'generic';
    const material = options.material || 'neutral';
    const intensity = options.intensity ?? 0.5;

    const hash = generateSFXHash(type, event, material, intensity, prompt, options.context || '', 'dasheng', this.modelName);
    const cached = getCachedSFX(hash);
    if (cached) {
      return {
        audioUrl: cached.fileUrl,
        fileHash: hash,
        duration: cached.duration,
        provider: 'Dasheng',
        model: this.modelName,
        isCached: true,
        generationTimeMs: Date.now() - startTime,
        acousticPrompt: prompt,
        status: 'READY',
      };
    }

    if (this.isAvailable()) {
      try {
        const outputWav = path.join(process.cwd(), 'data', 'audio', 'generated', `${hash}_dasheng.wav`);
        const cmd = `"${this.binPath}" -p "${prompt.replace(/"/g, '\\"')}" -o "${outputWav}" -l 1.5`;
        const wavBuffer = await new Promise<Buffer>((resolve, reject) => {
          exec(cmd, { timeout: 10000 }, (err, stdout, stderr) => {
            if (!err && fs.existsSync(outputWav)) {
              resolve(fs.readFileSync(outputWav));
            } else {
              reject(err || new Error(`Dasheng execution failed: ${stderr}`));
            }
          });
        });

        const entry = saveCachedSFX(hash, 'Dasheng', this.modelName, event, prompt, wavBuffer, 'wav', 1.5);
        return {
          audioUrl: entry.fileUrl,
          fileHash: hash,
          duration: entry.duration,
          provider: 'Dasheng',
          model: this.modelName,
          isCached: false,
          generationTimeMs: Date.now() - startTime,
          acousticPrompt: prompt,
          status: 'READY',
        };
      } catch (err: any) {
        console.warn('[DashengSFXProvider] Dasheng execution note:', err.message);
      }
    }

    return {
      audioUrl: '',
      fileHash: hash,
      duration: 0,
      provider: 'Dasheng',
      model: this.modelName,
      isCached: false,
      generationTimeMs: Date.now() - startTime,
      acousticPrompt: prompt,
      status: 'UNAVAILABLE',
    };
  }
}
