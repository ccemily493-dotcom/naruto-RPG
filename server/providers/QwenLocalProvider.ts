import OpenAI from 'openai';
import { IGMProvider, GMProviderId, GMGenerateParams, isRecoverableFailoverError } from './types';

export class QwenLocalProvider implements IGMProvider {
  public id: GMProviderId = 'qwen-local';
  public name = 'Qwen Local';
  public isFree = true;
  public isLocal = true;

  private getBaseUrl(): string {
    return process.env.QWEN_LOCAL_URL || 'http://localhost:11434/v1';
  }

  private getModelName(): string {
    return process.env.QWEN_LOCAL_MODEL || 'qwen2.5';
  }

  public async isAvailable(): Promise<boolean> {
    const baseUrl = this.getBaseUrl();
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 1500);
      const res = await fetch(`${baseUrl.replace(/\/v1\/?$/, '')}/v1/models`, {
        signal: controller.signal,
      }).catch(() => null);
      clearTimeout(timeoutId);
      return Boolean(res && res.ok);
    } catch {
      return false;
    }
  }

  public async generateStream(
    params: GMGenerateParams,
    onChunk: (text: string) => void
  ): Promise<void> {
    const baseUrl = this.getBaseUrl();
    const model = this.getModelName();

    const openai = new OpenAI({
      baseURL: baseUrl,
      apiKey: 'local-qwen-key', // Local servers like Ollama/LMStudio accept dummy key
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
      const error = new Error(`Qwen Local Error: ${msg}`);
      (error as any).code = err?.code || 'QWEN_LOCAL_FAILED';
      throw error;
    }
  }
}
