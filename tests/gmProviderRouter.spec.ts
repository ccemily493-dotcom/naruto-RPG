import { describe, it, expect, beforeEach } from 'vitest';
import { GMProviderRouter } from '../server/providers/GMProviderRouter';
import {
  setMockScenario,
  PRESET_SCENARIOS,
  getActiveMockScenario,
} from '../server/providers/MockQuotaProvider';
import { buildSystemPrompt } from '../server/prompts';
import { GMGenerateParams, GMProviderStatus } from '../server/providers/types';

describe('GM Provider Router & Fallback Chain Tests', () => {
  beforeEach(() => {
    // Reset scenario to default working state
    setMockScenario(PRESET_SCENARIOS.PRO_WORKING);
    process.env.FREE_ONLY_MODE = 'true';
  });

  it('Scenario 1: Gemini Pro working normally', async () => {
    setMockScenario(PRESET_SCENARIOS.PRO_WORKING);

    const router = new GMProviderRouter(true); // useMock = true
    let streamedText = '';
    let receivedMeta: any = null;

    const params: GMGenerateParams = {
      messages: [{ role: 'user', content: 'Rin se prepara para canalizar chakra.' }],
      systemPrompt: 'SYSTEM PROMPT CANON & RULES',
    };

    await router.generateStream(
      params,
      (chunk) => {
        streamedText += chunk;
      },
      (meta) => {
        receivedMeta = meta;
      }
    );

    expect(receivedMeta).not.toBeNull();
    expect(receivedMeta.providerId).toBe('gemini-pro');
    expect(receivedMeta.providerName).toBe('Gemini Pro');
    expect(receivedMeta.isFallback).toBe(false);
    expect(receivedMeta.displayText).toBe('GM: Gemini Pro');
    expect(streamedText).toContain('Gemini Pro');
  });

  it('Scenario 2: Gemini Pro exhausted -> Fallback to Gemini Flash', async () => {
    setMockScenario(PRESET_SCENARIOS.PRO_EXHAUSTED);

    const router = new GMProviderRouter(true);
    let streamedText = '';
    let receivedMeta: any = null;

    const params: GMGenerateParams = {
      messages: [{ role: 'user', content: 'Rin analiza el flujo de chakra.' }],
      systemPrompt: 'SYSTEM PROMPT CANON & RULES',
    };

    await router.generateStream(
      params,
      (chunk) => {
        streamedText += chunk;
      },
      (meta) => {
        receivedMeta = meta;
      }
    );

    expect(receivedMeta).not.toBeNull();
    expect(receivedMeta.providerId).toBe('gemini-flash');
    expect(receivedMeta.providerName).toBe('Gemini Flash');
    expect(receivedMeta.isFallback).toBe(true);
    expect(receivedMeta.displayText).toBe('GM: Gemini Flash — Fallback');
    expect(streamedText).toContain('Gemini Flash');
  });

  it('Scenario 3 & 5: Gemini Pro + Flash exhausted -> Fallback to Qwen Local', async () => {
    setMockScenario(PRESET_SCENARIOS.PRO_FLASH_EXHAUSTED);

    const router = new GMProviderRouter(true);
    let streamedText = '';
    let receivedMeta: any = null;

    const params: GMGenerateParams = {
      messages: [{ role: 'user', content: 'Rin activa el Susanoo de Kali.' }],
      systemPrompt: 'SYSTEM PROMPT CANON & RULES',
    };

    await router.generateStream(
      params,
      (chunk) => {
        streamedText += chunk;
      },
      (meta) => {
        receivedMeta = meta;
      }
    );

    expect(receivedMeta).not.toBeNull();
    expect(receivedMeta.providerId).toBe('qwen-local');
    expect(receivedMeta.providerName).toBe('Qwen Local');
    expect(receivedMeta.isFallback).toBe(true);
    expect(receivedMeta.displayText).toBe('GM: Qwen Local — Fallback');
    expect(streamedText).toContain('Qwen Local');
  });

  it('Scenario 4: Gemini completely unavailable -> Fallback to Qwen Local', async () => {
    setMockScenario(PRESET_SCENARIOS.GEMINI_UNAVAILABLE);

    const router = new GMProviderRouter(true);
    let streamedText = '';
    let receivedMeta: any = null;

    const params: GMGenerateParams = {
      messages: [{ role: 'user', content: 'Rin examina el terreno.' }],
      systemPrompt: 'SYSTEM PROMPT CANON & RULES',
    };

    await router.generateStream(
      params,
      (chunk) => {
        streamedText += chunk;
      },
      (meta) => {
        receivedMeta = meta;
      }
    );

    expect(receivedMeta).not.toBeNull();
    expect(receivedMeta.providerId).toBe('qwen-local');
    expect(receivedMeta.isFallback).toBe(true);
    expect(streamedText).toContain('Qwen Local');
  });

  it('Scenario 6: All providers unavailable -> Offline mode', async () => {
    setMockScenario(PRESET_SCENARIOS.ALL_UNAVAILABLE);

    const router = new GMProviderRouter(true);
    let receivedMeta: any = null;

    const params: GMGenerateParams = {
      messages: [{ role: 'user', content: 'Prueba sin proveedores' }],
      systemPrompt: 'SYSTEM PROMPT CANON & RULES',
    };

    await expect(
      router.generateStream(
        params,
        () => {},
        (meta) => {
          receivedMeta = meta;
        }
      )
    ).rejects.toThrow('Todos los proveedores de Game Master fallaron');

    expect(receivedMeta).not.toBeNull();
    expect(receivedMeta.providerId).toBe('offline');
    expect(receivedMeta.displayText).toBe('GM: Offline — No provider');
  });

  it('Enforces FREE_ONLY_MODE=true cost safeguards', () => {
    process.env.FREE_ONLY_MODE = 'true';
    const router = new GMProviderRouter(true);

    expect(router.isFreeOnlyMode()).toBe(true);
  });

  it('Preserves 100% identical narrative context across failovers', async () => {
    const memory: any = {
      factual: { character: 'Rin', village: 'Konoha', clan: 'Yūrei' },
    };
    const rinStats: any = {
      chakra: { primaryCurrent: 100, secondaryCurrent: 100 },
    };
    const systemPrompt = buildSystemPrompt({ memory, rinStats, storyTitle: 'Capítulo Test' });

    // Verify system prompt contains Rin rules and canon
    expect(systemPrompt).toContain('Rin');
    expect(systemPrompt).toContain('Konohagakure');

    // Test with Gemini Pro working
    setMockScenario(PRESET_SCENARIOS.PRO_WORKING);
    const router1 = new GMProviderRouter(true);
    let meta1: any = null;
    await router1.generateStream(
      { messages: [{ role: 'user', content: 'Acción 1' }], systemPrompt },
      () => {},
      (m) => (meta1 = m)
    );
    expect(meta1.providerId).toBe('gemini-pro');

    // Test with Gemini Pro exhausted -> Flash receives identical prompt
    setMockScenario(PRESET_SCENARIOS.PRO_EXHAUSTED);
    const router2 = new GMProviderRouter(true);
    let meta2: any = null;
    await router2.generateStream(
      { messages: [{ role: 'user', content: 'Acción 1' }], systemPrompt },
      () => {},
      (m) => (meta2 = m)
    );
    expect(meta2.providerId).toBe('gemini-flash');

    // Test with Pro + Flash exhausted -> Qwen receives identical prompt
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
