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
    return val === 'true' || val === '1' || val === undefined; // Default to free-only for safety
  }

  public getDisplayText(providerId: GMProviderId, isFallback: boolean): string {
    if (providerId === 'offline') return 'GM: Offline — No provider';
    if (providerId === 'gemini-pro') return 'GM: Gemini Pro';
    if (providerId === 'gemini-flash') return 'GM: Gemini Flash — Fallback';
    if (providerId === 'qwen-local') return isFallback ? 'GM: Qwen Local — Fallback' : 'GM: Qwen Local';
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
   * Main Router Generator:
   * Sequentially executes Gemini Pro -> Gemini Flash -> Qwen Local
   * Guarantees 100% identical narrative context to all providers.
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

    let isFallback = false;
    let fallbackReason: string | undefined = undefined;

    for (const provider of this.providers) {
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
          error: `${provider.name} unavailable (API Key or endpoint missing)`,
        });
        isFallback = true;
        fallbackReason = `${provider.name} no disponible`;
        continue;
      }

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

        // Execute provider streaming with exact identical params (system prompt, messages, memory, rules)
        await provider.generateStream(params, onChunk);

        // Success! Failover chain terminates successfully.
        return;
      } catch (err: any) {
        const errorMsg = err?.message || String(err);
        console.warn(
          `[GMProviderRouter] ${provider.name} failed with error: ${errorMsg}. Attempting failover...`
        );
        errorsEncountered.push({ provider: provider.name, error: errorMsg });

        if (isRecoverableFailoverError(err)) {
          isFallback = true;
          fallbackReason = `${provider.name} cuota/límite agotado (${errorMsg})`;
          continue;
        } else {
          // Unrecoverable non-quota error: log and try next provider in chain
          isFallback = true;
          fallbackReason = `${provider.name} error: ${errorMsg}`;
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
