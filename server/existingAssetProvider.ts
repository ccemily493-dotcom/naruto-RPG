import { matchSemanticAudio, MatchResult } from './semanticMatcher';
import { SFXGenerateOptions, SFXGenerateResult } from './sfxProvider';

export class ExistingAssetProvider {
  public isAvailable(): boolean {
    return true;
  }

  public getCapabilities() {
    return {
      providerName: 'Existing Asset Catalog (Score >= 0.85 Strict Filter)',
      isLocal: true,
      supportedFormats: ['ogg', 'mp3', 'wav'],
    };
  }

  public async evaluateAsset(
    event: string,
    options: SFXGenerateOptions
  ): Promise<{ match: MatchResult; result: SFXGenerateResult | null }> {
    const startTime = Date.now();
    const match = matchSemanticAudio({
      event: event,
      layer: 'action',
      material: options.material,
      intensity: options.intensity,
      combat: true,
    });

    // STRICT RULE: Only use existing asset if score >= 85 pts (0.85).
    // If score < 85, produce SILENCE / NO_SFX. NEVER return library[0] or random fallbacks!
    if (match.matchedItem && match.confidence >= 85) {
      return {
        match,
        result: {
          audioUrl: match.matchedItem.file,
          fileHash: match.matchedItem.id,
          duration: match.matchedItem.duration || 1.5,
          provider: `Existing Asset Catalog (Score: ${match.confidence}%)`,
          isCached: true,
          generationTimeMs: Date.now() - startTime,
        },
      };
    }

    // Score < 85 -> Pure Silence / No SFX
    return {
      match: {
        matchedItem: null,
        confidence: match.confidence,
        reason: `Score < 0.85 (${match.confidence} pts). Pura exigencia semántica: Silencio acústico mantenido en lugar de sonido incorrecto.`,
        query: match.query,
      },
      result: null,
    };
  }
}
