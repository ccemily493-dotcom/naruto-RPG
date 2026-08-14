import { useRef, useState, useCallback } from 'react';
import type { Message, Story, OpenAIConfig } from '../types';

export function useChatStream(config: OpenAIConfig) {
  const abortRef = useRef<AbortController | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const send = useCallback(
    async (
      baseMessages: Message[],
      story: Story,
      onChunk: (chunk: string) => void,
      onDone?: (finalText: string) => void,
      modelOverride?: string,
    ) => {
      if (abortRef.current) abortRef.current.abort();
      setIsLoading(true);
      abortRef.current = new AbortController();
      try {
        const res = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            messages: baseMessages.map((m) => ({ role: m.role, content: m.content })),
            memory: story.memory,
            rinStats: story.rinStats,
            chapters: story.chapters,
            storyTitle: story.title,
            model: modelOverride || config.model,
            apiKey: config.apiKey,
          }),
          signal: abortRef.current.signal,
        });

        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const reader = res.body?.getReader();
        if (!reader) throw new Error('No readable stream');
        const decoder = new TextDecoder();
        let accumulated = '';

        while (true) {
          const { value, done } = await reader.read();
          if (done) break;
          const chunk = decoder.decode(value, { stream: true });

          const lines = chunk.split('\n');
          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed) continue;
            if (trimmed.startsWith('data:')) {
              const dataStr = trimmed.slice(5).trim();
              if (!dataStr) continue;
              try {
                const parsed = JSON.parse(dataStr);
                if (parsed.text) {
                  accumulated += parsed.text;
                  onChunk(parsed.text);
                }
                if (parsed.error) {
                  onChunk(`ERROR: ${parsed.error}`);
                }
              } catch {
                // ignore non-json SSE
              }
            }
          }
        }

        onDone?.(accumulated);
      } catch (err: any) {
        if (err.name === 'AbortError') {
          // aborted by user
        } else {
          console.error('Chat stream failed', err);
          onChunk(`(error) ${err.message || 'unknown'}`);
        }
      } finally {
        setIsLoading(false);
        abortRef.current = null;
      }
    },
    [config],
  );

  const stop = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
  }, []);

  return { send, stop, isLoading };
}
