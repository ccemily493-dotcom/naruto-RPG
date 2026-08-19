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

    // Default fallback: qwen3:8b (exact installed model)
    return 'qwen3:8b';
  }

  /**
   * Fetches installed models from local LLM backend (Ollama / LM Studio)
   */
  public async getInstalledModels(): Promise<string[]> {
    const baseUrl = this.getBaseUrl();
    const rawBase = baseUrl.replace(/\/v1\/?$/, '');

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2000);

      // Try Ollama native /api/tags
      const tagsRes = await fetch(`${rawBase}/api/tags`, {
        signal: controller.signal,
      }).catch(() => null);

      if (tagsRes && tagsRes.ok) {
        const data = (await tagsRes.json().catch(() => ({}))) as any;
        clearTimeout(timeoutId);
        if (Array.isArray(data.models)) {
          return data.models.map((m: any) => m.name || m.model);
        }
      }

      // Try OpenAI /v1/models
      const modelsRes = await fetch(`${rawBase}/v1/models`, {
        signal: controller.signal,
      }).catch(() => null);

      clearTimeout(timeoutId);
      if (modelsRes && modelsRes.ok) {
        const data = (await modelsRes.json().catch(() => ({}))) as any;
        if (Array.isArray(data.data)) {
          return data.data.map((m: any) => m.id);
        }
      }
    } catch {
      // Return empty array if backend is unreachable
    }

    return [];
  }

  /**
   * Pings the local LLM server (Ollama / LM Studio)
   */
  public async isAvailable(): Promise<boolean> {
    const installed = await this.getInstalledModels();
    return installed.length > 0;
  }

  /**
   * Checks if configured QWEN_MODEL is actually installed on the local server
   */
  public async isModelAvailable(targetModel?: string): Promise<boolean> {
    const modelToMatch = targetModel || this.getModelName();
    const installed = await this.getInstalledModels();

    if (installed.length === 0) return false;

    // Check exact match or fuzzy prefix match (e.g. qwen3:8b vs qwen3)
    return installed.some(
      (m) =>
        m.toLowerCase() === modelToMatch.toLowerCase() ||
        m.toLowerCase().startsWith(`${modelToMatch.toLowerCase()}:`) ||
        modelToMatch.toLowerCase().startsWith(`${m.toLowerCase()}:`)
    );
  }

  public async generateStream(
    params: GMGenerateParams,
    onChunk: (text: string) => void
  ): Promise<void> {
    const baseUrl = this.getBaseUrl();
    
    // Ignore proprietary model names sent from frontend (e.g. gpt-4o) for local provider
    let model = params.model || this.getModelName();
    if (model.toLowerCase().includes('gpt-') || model.toLowerCase().includes('claude')) {
      model = this.getModelName();
    }

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
        const error = new Error(`Qwen: Modelo configurado '${model}' no está instalado`);
        (error as any).code = 'QWEN_MODEL_NOT_FOUND';
        throw error;
      }
      const error = new Error(`Qwen Local Error: ${msg}`);
      (error as any).code = err?.code || 'QWEN_LOCAL_FAILED';
      throw error;
    }
  }
}
