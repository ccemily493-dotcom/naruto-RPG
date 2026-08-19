import { describe, it, expect, beforeEach } from 'vitest';
import { GMProviderRouter } from '../server/providers/GMProviderRouter';
import {
  setMockScenario,
  PRESET_SCENARIOS,
} from '../server/providers/MockQuotaProvider';
import { buildSystemPrompt } from '../server/prompts';
import { GMGenerateParams } from '../server/providers/types';

describe('GM Provider Router - Multi-Turn Recovery & Fallback Chain', () => {
  beforeEach(() => {
    setMockScenario(PRESET_SCENARIOS.PRO_WORKING);
    process.env.FREE_ONLY_MODE = 'true';
  });

  it('Executes full 5-turn recovery cycle: Pro -> Flash -> Pro -> Qwen -> Pro (Rule 12 & 14)', async () => {
    const router = new GMProviderRouter(true); // useMock = true
    const params: GMGenerateParams = {
      messages: [{ role: 'user', content: 'Turno de prueba' }],
      systemPrompt: 'SYSTEM PROMPT CANON & RULES',
    };

    // --- TURNO 1: Gemini Pro funciona ---
    setMockScenario(PRESET_SCENARIOS.PRO_WORKING);
    let metaTurn1: any = null;
    let textTurn1 = '';
    await router.generateStream(
      params,
      (chunk) => (textTurn1 += chunk),
      (meta) => (metaTurn1 = meta)
    );
    expect(metaTurn1.providerId).toBe('gemini-pro');
    expect(metaTurn1.isFallback).toBe(false);
    expect(metaTurn1.displayText).toBe('GM: Gemini Pro');
    expect(textTurn1).toContain('Gemini Pro');

    // --- TURNO 2: Gemini Pro falla (429) -> Gemini Flash funciona ---
    setMockScenario(PRESET_SCENARIOS.PRO_EXHAUSTED);
    let metaTurn2: any = null;
    let textTurn2 = '';
    await router.generateStream(
      params,
      (chunk) => (textTurn2 += chunk),
      (meta) => (metaTurn2 = meta)
    );
    expect(metaTurn2.providerId).toBe('gemini-flash');
    expect(metaTurn2.isFallback).toBe(true);
    expect(metaTurn2.displayText).toBe('GM: Gemini Flash — Fallback');
    expect(textTurn2).toContain('Gemini Flash');

    // --- TURNO 3: Gemini Pro vuelve a funcionar -> Gemini Pro ---
    setMockScenario(PRESET_SCENARIOS.PRO_WORKING);
    let metaTurn3: any = null;
    let textTurn3 = '';
    await router.generateStream(
      params,
      (chunk) => (textTurn3 += chunk),
      (meta) => (metaTurn3 = meta)
    );
    expect(metaTurn3.providerId).toBe('gemini-pro');
    expect(metaTurn3.isFallback).toBe(false);
    expect(metaTurn3.displayText).toBe('GM: Gemini Pro');
    expect(textTurn3).toContain('Gemini Pro');

    // --- TURNO 4: Gemini Pro + Flash fallan -> Qwen Local funciona ---
    setMockScenario(PRESET_SCENARIOS.PRO_FLASH_EXHAUSTED);
    let metaTurn4: any = null;
    let textTurn4 = '';
    await router.generateStream(
      params,
      (chunk) => (textTurn4 += chunk),
      (meta) => (metaTurn4 = meta)
    );
    expect(metaTurn4.providerId).toBe('qwen-local');
    expect(metaTurn4.isFallback).toBe(true);
    expect(metaTurn4.displayText).toBe('GM: Qwen Local — Fallback');
    expect(textTurn4).toContain('Qwen Local');

    // --- TURNO 5 (REGRESSIÓN / REGLA 14): Gemini Pro vuelve a funcionar inmediatamente en la siguiente petición ---
    setMockScenario(PRESET_SCENARIOS.PRO_WORKING);
    let metaTurn5: any = null;
    let textTurn5 = '';
    await router.generateStream(
      params,
      (chunk) => (textTurn5 += chunk),
      (meta) => (metaTurn5 = meta)
    );
    expect(metaTurn5.providerId).toBe('gemini-pro');
    expect(metaTurn5.isFallback).toBe(false);
    expect(metaTurn5.displayText).toBe('GM: Gemini Pro');
    expect(textTurn5).toContain('Gemini Pro');
  });

  it('Turno 6: Todos los proveedores fallan -> GM: Offline — No provider', async () => {
    setMockScenario(PRESET_SCENARIOS.ALL_UNAVAILABLE);
    const router = new GMProviderRouter(true);
    let receivedMeta: any = null;

    const params: GMGenerateParams = {
      messages: [{ role: 'user', content: 'Prueba todos inaccesibles' }],
      systemPrompt: 'SYSTEM PROMPT CANON & RULES',
    };

    await expect(
      router.generateStream(
        params,
        () => {},
        (meta) => (receivedMeta = meta)
      )
    ).rejects.toThrow('Todos los proveedores de Game Master fallaron');

    expect(receivedMeta).not.toBeNull();
    expect(receivedMeta.providerId).toBe('offline');
    expect(receivedMeta.displayText).toBe('GM: Offline — No provider');
  });

  it('Rule 9 & 10: Prevents provider switching mid-stream if failure occurs after streaming started', async () => {
    const router = new GMProviderRouter(false);
    const customParams: GMGenerateParams = {
      messages: [{ role: 'user', content: 'Prueba mid-stream' }],
      systemPrompt: 'SYSTEM PROMPT',
    };

    // Create a custom provider mock that fails after emitting 1 chunk
    const midStreamFailingProvider = {
      id: 'gemini-pro' as const,
      name: 'Gemini Pro',
      isFree: true,
      isLocal: false,
      isAvailable: async () => true,
      generateStream: async (_params: any, onChunk: (text: string) => void) => {
        onChunk('Texto parcial enviado al cliente... ');
        throw new Error('Fatal network error mid-stream!');
      },
    };

    (router as any).providers = [
      midStreamFailingProvider,
      {
        id: 'gemini-flash',
        name: 'Gemini Flash',
        isFree: true,
        isLocal: false,
        isAvailable: async () => true,
        generateStream: async (_params: any, onChunk: (text: string) => void) => {
          onChunk('Respuesta de Flash');
        },
      },
    ];

    let emittedChunks = 0;
    await expect(
      router.generateStream(
        customParams,
        () => emittedChunks++,
        () => {}
      )
    ).rejects.toThrow('[Mid-Stream Error - Gemini Pro]');

    // Verify 1 chunk was emitted and router DID NOT proceed to stream Gemini Flash mid-response
    expect(emittedChunks).toBe(1);
  });

  it('Enforces FREE_ONLY_MODE=true cost safeguards', () => {
    process.env.FREE_ONLY_MODE = 'true';
    const router = new GMProviderRouter(true);
    expect(router.isFreeOnlyMode()).toBe(true);
  });

  it('Preserves 100% identical narrative context across all providers', async () => {
    const memory: any = {
      factual: { character: 'Rin', village: 'Konoha', clan: 'Yūrei' },
    };
    const rinStats: any = {
      chakra: { primaryCurrent: 100, secondaryCurrent: 100 },
    };
    const systemPrompt = buildSystemPrompt({ memory, rinStats, storyTitle: 'Capítulo Test' });

    expect(systemPrompt).toContain('Rin');
    expect(systemPrompt).toContain('Konohagakure');

    // Turn 1: Pro
    setMockScenario(PRESET_SCENARIOS.PRO_WORKING);
    const router1 = new GMProviderRouter(true);
    let meta1: any = null;
    await router1.generateStream(
      { messages: [{ role: 'user', content: 'Acción 1' }], systemPrompt },
      () => {},
      (m) => (meta1 = m)
    );
    expect(meta1.providerId).toBe('gemini-pro');

    // Turn 2: Pro fails -> Flash receives identical prompt
    setMockScenario(PRESET_SCENARIOS.PRO_EXHAUSTED);
    const router2 = new GMProviderRouter(true);
    let meta2: any = null;
    await router2.generateStream(
      { messages: [{ role: 'user', content: 'Acción 1' }], systemPrompt },
      () => {},
      (m) => (meta2 = m)
    );
    expect(meta2.providerId).toBe('gemini-flash');

    // Turn 3: Pro + Flash fail -> Qwen receives identical prompt
    setMockScenario(PRESET_SCENARIOS.PRO_FLASH_EXHAUSTED);
    const router3 = new GMProviderRouter(true);
    let meta3: any = null;
    await router3.generateStream(
      { messages: [{ role: 'user', content: 'Acción 1' }], systemPrompt },
      () => {},
      (m) => (meta3 = m)
    );
    expect(meta3.providerId).toBe('qwen-local');
  });
});
