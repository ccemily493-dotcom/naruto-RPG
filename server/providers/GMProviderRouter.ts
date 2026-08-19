import {
  IGMProvider,
  GMProviderId,
  GMGenerateParams,
  GMProviderStatus,
  isRecoverableFailoverError,
} from './types';
import { GeminiProProvider } from './GeminiProProvider';
import { GeminiFlashProvider } from './GeminiFlashProvider';
import { QwenLocalProvider } from './QwenLocalProvider';
import { MockProvider } from './MockQuotaProvider';

export class GMProviderRouter {
  private providers: IGMProvider[];
  private useMock: boolean;
  private lastActiveProviderId: GMProviderId = 'gemini-pro';
  private lastIsFallback = false;
  private lastFallbackReason: string | undefined = undefined;

  constructor(useMock = false) {
    this.useMock = useMock;
    if (useMock) {
      this.providers = [
        new MockProvider('gemini-pro', 'Gemini Pro', 'proState', false),
        new MockProvider('gemini-flash', 'Gemini Flash', 'flashState', false),
        new MockProvider('qwen-local', 'Qwen Local', 'qwenState', true),
      ];
    } else {
      this.providers = [
        new GeminiProProvider(),
        new GeminiFlashProvider(),
        new QwenLocalProvider(),
      ];
    }
  }

  public isFreeOnlyMode(): boolean {
    const val = process.env.FREE_ONLY_MODE;
    return val === 'true' || val === '1' || val === undefined;
  }

  public getDisplayText(providerId: GMProviderId, isFallback: boolean): string {
    if (providerId === 'offline') return 'GM: Offline — No provider';
    if (providerId === 'gemini-pro') return isFallback ? 'GM: Gemini Pro — Fallback' : 'GM: Gemini Pro';
    if (providerId === 'gemini-flash') return 'GM: Gemini Flash — Fallback';
    if (providerId === 'qwen-local') return 'GM: Qwen Local — Fallback';
    return `GM: ${providerId}`;
  }

  public async getStatus(): Promise<GMProviderStatus> {
    const available: GMProviderId[] = [];
    for (const p of this.providers) {
      if (await p.isAvailable()) {
        available.push(p.id);
      }
    }

    const displayText = this.getDisplayText(this.lastActiveProviderId, this.lastIsFallback);

    return {
      activeProviderId: this.lastActiveProviderId,
      activeProviderName:
        this.providers.find((p) => p.id === this.lastActiveProviderId)?.name || 'Offline',
      isFallback: this.lastIsFallback,
      fallbackReason: this.lastFallbackReason,
      displayText,
      availableProviders: available,
    };
  }

  /**
   * Logs provider availability status at server startup without exposing secrets
   */
  public async logStartupStatus(): Promise<void> {
    console.log('==================================================');
    console.log('🤖 GAME MASTER PROVIDER STATUS AT STARTUP:');

    for (const p of this.providers) {
      const avail = await p.isAvailable().catch(() => false);
      const statusText = avail ? '✅ DISPONIBLE' : '❌ NO DISPONIBLE';
      let details = '';

      if (p.id === 'gemini-pro') {
        const proProv = p as GeminiProProvider;
        const hasKey = Boolean(proProv.getApiKey());
        details = hasKey
          ? `(Modelo: ${proProv.getModelName()})`
          : '(Falta GEMINI_API_KEY en .env)';
      } else if (p.id === 'gemini-flash') {
        const flashProv = p as GeminiFlashProvider;
        const hasKey = Boolean(flashProv.getApiKey());
        details = hasKey
          ? `(Modelo: ${flashProv.getModelName()})`
          : '(Falta GEMINI_API_KEY en .env)';
      } else if (p.id === 'qwen-local') {
        const qwenProv = p as QwenLocalProvider;
        details = `(URL: ${qwenProv.getBaseUrl()} / Modelo: ${qwenProv.getModelName()})`;
      }

      console.log(`- ${p.name.padEnd(14)}: ${statusText} ${details}`);
    }

    console.log(`- Modo Gratuito  : FREE_ONLY_MODE=${this.isFreeOnlyMode()}`);
    console.log('==================================================');
  }

  /**
   * Main Router Generator (Per-Request Recovery Chain):
   * ALWAYS starts by trying Gemini Pro on every new request.
   * Order: Gemini Pro -> Gemini Flash -> Qwen Local -> Offline
   * Fallback is strictly temporary per-request and resets on every new turn.
   */
  public async generateStream(
    params: GMGenerateParams,
    onChunk: (text: string) => void,
    onMetadata?: (meta: {
      providerId: GMProviderId;
      providerName: string;
      isFallback: boolean;
      displayText: string;
    }) => void
  ): Promise<void> {
    const freeOnly = this.isFreeOnlyMode();
    const errorsEncountered: Array<{ provider: string; error: string }> = [];

    // Reset per-request fallback state: ALWAYS start clean with Gemini Pro (index 0)
    let isFallback = false;
    let fallbackReason: string | undefined = undefined;

    for (let i = 0; i < this.providers.length; i++) {
      const provider = this.providers[i];

      // If we are on index > 0, we are in a fallback state for this request
      if (i > 0) {
        isFallback = true;
      }

      // Cost Safeguard: Skip non-free/non-local providers if FREE_ONLY_MODE=true
      if (freeOnly && !provider.isFree && !provider.isLocal) {
        console.warn(
          `[GMProviderRouter] Skipping ${provider.name} because FREE_ONLY_MODE=true and provider is not free/local.`
        );
        continue;
      }

      // Check if provider is available
      const available = await provider.isAvailable().catch(() => false);
      if (!available) {
        errorsEncountered.push({
          provider: provider.name,
          error: `${provider.name} no disponible (Falta API Key o endpoint/modelo no encontrado)`,
        });
        fallbackReason = `${provider.name} no disponible`;
        continue;
      }

      let hasEmittedChunk = false;

      try {
        this.lastActiveProviderId = provider.id;
        this.lastIsFallback = isFallback;
        this.lastFallbackReason = fallbackReason;

        const displayText = this.getDisplayText(provider.id, isFallback);

        if (onMetadata) {
          onMetadata({
            providerId: provider.id,
            providerName: provider.name,
            isFallback,
            displayText,
          });
        }

        // Execute provider streaming
        await provider.generateStream(params, (chunkText: string) => {
          hasEmittedChunk = true;
          onChunk(chunkText);
        });

        // Success! Failover chain terminates successfully for this turn.
        return;
      } catch (err: any) {
        const errorMsg = err?.message || String(err);
        console.warn(
          `[GMProviderRouter] ${provider.name} failed with error: ${errorMsg}.`
        );
        errorsEncountered.push({ provider: provider.name, error: errorMsg });

        // Rule 10: If a provider fails AFTER having already started streaming,
        // DO NOT switch providers mid-stream. Throw immediately to end request gracefully.
        if (hasEmittedChunk) {
          console.error(
            `[GMProviderRouter] ${provider.name} failed MID-STREAM. Aborting mid-stream failover to avoid mixing provider outputs.`
          );
          throw new Error(`[Mid-Stream Error - ${provider.name}]: ${errorMsg}`);
        }

        // Before streaming started: failover to next provider in chain
        fallbackReason = `${provider.name} error/quota: ${errorMsg}`;
        if (isRecoverableFailoverError(err)) {
          continue;
        } else {
          continue;
        }
      }
    }

    // If all providers failed or were unavailable
    this.lastActiveProviderId = 'offline';
    this.lastIsFallback = true;
    this.lastFallbackReason = 'Todos los proveedores de GM no están disponibles';

    const offlineDisplayText = 'GM: Offline — No provider';

    if (onMetadata) {
      onMetadata({
        providerId: 'offline',
        providerName: 'Offline',
        isFallback: true,
        displayText: offlineDisplayText,
      });
    }

    const fullErrMessage = `Todos los proveedores de Game Master fallaron. Detalle de errores:\n${errorsEncountered
      .map((e) => `- ${e.provider}: ${e.error}`)
      .join('\n')}`;

    throw new Error(fullErrMessage);
  }
}
