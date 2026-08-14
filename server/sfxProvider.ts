import { WooshSFXProvider } from './wooshProvider';
import { DashengSFXProvider } from './dashengProvider';
import { ExistingAssetProvider } from './existingAssetProvider';

export interface SFXGenerateOptions {
  type?: 'action' | 'impact';
  event: string;
  material?: string;
  intensity?: number;
  duration?: number;
  context?: string;
}

export interface SFXGeneratorCapabilities {
  providerName: string;
  modelName: string;
  isLocal: boolean;
  supportedFormats: string[];
  status: string;
}

export interface SFXGenerateResult {
  audioUrl: string;
  fileHash: string;
  duration: number;
  provider: string;
  model?: string;
  isCached: boolean;
  generationTimeMs: number;
  acousticPrompt?: string;
  status?: string;
}

export interface SFXGeneratorProvider {
  generateSFX(prompt: string, options: SFXGenerateOptions): Promise<SFXGenerateResult>;
  isAvailable(): boolean;
  getCapabilities(): SFXGeneratorCapabilities;
}

/**
 * Orchestrator implementing the Strict Provider Fallback Chain:
 * 1. CACHE (SHA-256)
 * 2. WOOSH (Primary)
 * 3. DASHENG (Secondary)
 * 4. EXISTING ASSET (Strict Score >= 0.85)
 * 5. SILENCE (Score < 0.85 -> Pure silence maintained. ZERO random sounds / ZERO synth fallbacks)
 */
export async function executeSFXOrchestration(
  prompt: string,
  options: SFXGenerateOptions
): Promise<SFXGenerateResult> {
  const startTime = Date.now();
  const primaryType = (process.env.SFX_GENERATOR_PROVIDER || 'woosh').toLowerCase();
  const fallbackType = (process.env.SFX_GENERATOR_FALLBACK || 'dasheng').toLowerCase();

  const woosh = new WooshSFXProvider();
  const dasheng = new DashengSFXProvider();
  const existingAssets = new ExistingAssetProvider();

  // 1. Try Woosh if preferred or active
  if (primaryType === 'woosh' && woosh.isAvailable()) {
    return await woosh.generateSFX(prompt, options);
  }

  // 2. Try Dasheng if preferred or active
  if (fallbackType === 'dasheng' && dasheng.isAvailable()) {
    return await dasheng.generateSFX(prompt, options);
  }

  if (primaryType === 'dasheng' && dasheng.isAvailable()) {
    return await dasheng.generateSFX(prompt, options);
  }

  // 3. If Woosh/Dasheng unavailable, evaluate ExistingAssetProvider with strict Score >= 0.85 filter
  const existingEval = await existingAssets.evaluateAsset(options.event, options);
  if (existingEval.result && existingEval.match.confidence >= 85) {
    return existingEval.result;
  }

  // 4. Score < 0.85 -> SILENCE. Pure acoustic silence maintained.
  return {
    audioUrl: '',
    fileHash: '',
    duration: 0,
    provider: 'Silence',
    model: 'None',
    isCached: false,
    generationTimeMs: Date.now() - startTime,
    acousticPrompt: prompt,
    status: 'SILENCE (Score < 0.85)',
  };
}

export function getSFXProvider(): SFXGeneratorProvider {
  const primaryType = (process.env.SFX_GENERATOR_PROVIDER || 'woosh').toLowerCase();
  const fallbackType = (process.env.SFX_GENERATOR_FALLBACK || 'dasheng').toLowerCase();

  const woosh = new WooshSFXProvider();
  const dasheng = new DashengSFXProvider();

  if (primaryType === 'woosh' && woosh.isAvailable()) return woosh;
  if (fallbackType === 'dasheng' && dasheng.isAvailable()) return dasheng;
  return woosh;
}
