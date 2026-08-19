import OpenAI from 'openai';
import { IGMProvider, GMProviderId, GMGenerateParams, isRecoverableFailoverError } from './types';

export class QwenLocalProvider implements IGMProvider {
  public id: GMProviderId = 'qwen-local';
  public name = 'Qwen Local';
  public isFree = true;
  public isLocal = true;

  public getBaseUrl(): string {
    return process.env.QWEN_LOCAL_URL || process.env.LOCAL_LLM_URL || 'http://localhost:11434/v1';
  }

  public getModelName(): string {
    const envModel =
      process.env.QWEN_MODEL ||
      process.env.QWEN_LOCAL_MODEL ||
      process.env.LOCAL_LLM_MODEL;

    if (envModel && envModel.trim()) {
      return envModel.trim();
    }

    // Default fallback if no env variable is specified
    return 'qwen3:8b';
  }

  /**
   * Pings the local LLM server (Ollama / LM Studio) and verifies backend availability
   */
  public async isAvailable(): Promise<boolean> {
    const baseUrl = this.getBaseUrl();
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2000);
      
      // Ping OpenAI-compatible models endpoint or Ollama tags endpoint
      const rawBase = baseUrl.replace(/\/v1\/?$/, '');
      const modelsRes = await fetch(`${rawBase}/v1/models`, {
        signal: controller.signal,
      }).catch(() => null);

      clearTimeout(timeoutId);

      if (modelsRes && modelsRes.ok) {
        return true;
      }

      // Secondary check: ping Ollama native /api/tags
      const tagsRes = await fetch(`${rawBase}/api/tags`, {
        signal: controller.signal,
      }).catch(() => null);

      return Boolean(tagsRes && tagsRes.ok);
    } catch {
      return false;
    }
  }

  public async generateStream(
    params: GMGenerateParams,
    onChunk: (text: string) => void
  ): Promise<void> {
    const baseUrl = this.getBaseUrl();
    const model = params.model || this.getModelName();

    const openai = new OpenAI({
      baseURL: baseUrl,
      apiKey: 'local-qwen-key', // Local servers accept dummy key
      dangerouslyAllowBrowser: true,
    });

    try {
      const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
        { role: 'system', content: params.systemPrompt },
        ...params.messages.map((m) => ({
          role: m.role,
          content: m.content,
        })),
      ];

      const stream = await openai.chat.completions.create({
        model,
        messages,
        temperature: params.temperature ?? 0.85,
        stream: true,
      });

      for await (const chunk of stream) {
        const delta = chunk.choices[0]?.delta?.content || '';
        if (delta) {
          onChunk(delta);
        }
      }
    } catch (err: any) {
      if (isRecoverableFailoverError(err)) {
        throw err;
      }
      const msg = err?.message || String(err);
      if (msg.includes('404') || msg.includes('not found')) {
        const error = new Error(`Qwen Local Error: 404 modelo '${model}' no encontrado en el servidor local LLM (${baseUrl}). Configura QWEN_MODEL en .env con un modelo instalado.`);
        (error as any).code = 'QWEN_MODEL_NOT_FOUND';
        throw error;
      }
      const error = new Error(`Qwen Local Error: ${msg}`);
      (error as any).code = err?.code || 'QWEN_LOCAL_FAILED';
      throw error;
    }
  }
}
