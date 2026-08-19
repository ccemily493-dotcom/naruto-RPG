import { GoogleGenAI } from '@google/genai';
import { IGMProvider, GMProviderId, GMGenerateParams, isRecoverableFailoverError } from './types';

export class GeminiProProvider implements IGMProvider {
  public id: GMProviderId = 'gemini-pro';
  public name = 'Gemini Pro';
  public isFree = true;
  public isLocal = false;

  private getApiKey(params?: GMGenerateParams): string | null {
    const key =
      params?.apiKey ||
      process.env.GEMINI_API_KEY ||
      process.env.OPENAI_API_KEY;
    if (!key || key.trim() === '' || key === 'MY_GEMINI_API_KEY' || key === 'MY_OPENAI_API_KEY') {
      return null;
    }
    return key.trim();
  }

  public async isAvailable(params?: GMGenerateParams): Promise<boolean> {
    return Boolean(this.getApiKey(params));
  }

  public async generateStream(
    params: GMGenerateParams,
    onChunk: (text: string) => void
  ): Promise<void> {
    const apiKey = this.getApiKey(params);
    if (!apiKey) {
      throw new Error('GEMINI_PRO_UNAVAILABLE: No Gemini API Key configured in env or request.');
    }

    const modelName = params.model || process.env.GEMINI_PRO_MODEL || 'gemini-1.5-pro';

    try {
      const ai = new GoogleGenAI({ apiKey });

      // Format contents for Gemini SDK
      const contents = params.messages.map((m) => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.content }],
      }));

      const responseStream = await ai.models.generateContentStream({
        model: modelName,
        contents,
        config: {
          systemInstruction: params.systemPrompt,
          temperature: params.temperature ?? 0.85,
        },
      });

      for await (const chunk of responseStream) {
        const text = chunk.text;
        if (text) {
          onChunk(text);
        }
      }
    } catch (err: any) {
      if (isRecoverableFailoverError(err)) {
        throw err;
      }
      // Wrap in recoverable error if status/msg indicates quota or rate limit
      const msg = err?.message || String(err);
      if (msg.includes('429') || msg.includes('quota') || msg.includes('RESOURCE_EXHAUSTED')) {
        const error = new Error(`Gemini Pro Quota/Rate Limit Exhausted: ${msg}`);
        (error as any).status = 429;
        throw error;
      }
      throw err;
    }
  }
}
