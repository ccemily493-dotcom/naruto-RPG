// Type definitions for GM Provider Router Architecture

export type GMProviderId = 'gemini-pro' | 'gemini-flash' | 'qwen-local' | 'mock-quota' | 'offline';

export interface GMProviderStatus {
  activeProviderId: GMProviderId;
  activeProviderName: string;
  isFallback: boolean;
  fallbackReason?: string;
  displayText: 'GM: Gemini Pro' | 'GM: Gemini Flash — Fallback' | 'GM: Qwen Local — Fallback' | 'GM: Offline — No provider' | string;
  availableProviders: GMProviderId[];
}

export interface ChatMessageParam {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface GMGenerateParams {
  messages: ChatMessageParam[];
  systemPrompt: string;
  temperature?: number;
  apiKey?: string;
  model?: string;
}

export interface GMStreamChunk {
  text?: string;
  error?: string;
  done?: boolean;
  providerId?: GMProviderId;
  providerName?: string;
  isFallback?: boolean;
  displayText?: string;
}

export interface IGMProvider {
  id: GMProviderId;
  name: string;
  isFree: boolean;
  isLocal: boolean;
  isAvailable(): Promise<boolean>;
  generateStream(
    params: GMGenerateParams,
    onChunk: (text: string) => void
  ): Promise<void>;
}

// Error Classifier for Recoverable Failover Errors
export function isRecoverableFailoverError(err: any): boolean {
  if (!err) return false;
  const msg = (err.message || String(err)).toLowerCase();
  const status = err.status || err.statusCode || err.response?.status;

  // HTTP 429 Too Many Requests / Rate Limit
  if (status === 429 || msg.includes('429') || msg.includes('too many requests') || msg.includes('rate limit')) {
    return true;
  }

  // Quota Exhaustion / RESOURCE_EXHAUSTED
  if (
    msg.includes('resource_exhausted') ||
    msg.includes('quota') ||
    msg.includes('exceeded your current quota') ||
    msg.includes('insufficient_quota') ||
    msg.includes('out of quota')
  ) {
    return true;
  }

  // Timeouts
  if (msg.includes('timeout') || msg.includes('timed out') || err.code === 'ETIMEDOUT') {
    return true;
  }

  // Provider Unavailable / Network Failures / 503 Service Unavailable / ECONNREFUSED
  if (
    status === 503 ||
    status === 502 ||
    status === 504 ||
    err.code === 'ECONNREFUSED' ||
    err.code === 'ENOTFOUND' ||
    msg.includes('unavailable') ||
    msg.includes('failed to fetch') ||
    msg.includes('connection refused')
  ) {
    return true;
  }

  return false;
}
