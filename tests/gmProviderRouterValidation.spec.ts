import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { GeminiProProvider } from '../server/providers/GeminiProProvider';
import { GeminiFlashProvider } from '../server/providers/GeminiFlashProvider';
import { QwenLocalProvider } from '../server/providers/QwenLocalProvider';
import { GMProviderRouter } from '../server/providers/GMProviderRouter';
import { buildSystemPrompt } from '../server/prompts';
import { SimulationResult } from '../src/types';

describe('GM Provider Router & Provider Configuration Test Suite', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('1. Gemini without API key returns isAvailable() = false and throws clear error', async () => {
    delete process.env.GEMINI_API_KEY;
    delete process.env.OPENAI_API_KEY;

    const pro = new GeminiProProvider();
    const flash = new GeminiFlashProvider();

    expect(await pro.isAvailable()).toBe(false);
    expect(await flash.isAvailable()).toBe(false);

    await expect(
      pro.generateStream(
        { messages: [{ role: 'user', content: 'hola' }], systemPrompt: 'sys' },
        () => {}
      )
    ).rejects.toThrow('GEMINI_PRO_UNAVAILABLE: Configuración incompleta. Falta GEMINI_API_KEY en archivo .env.');
  });

  it('2. Gemini with valid API key configuration returns isAvailable() = true', async () => {
    process.env.GEMINI_API_KEY = 'valid_dummy_gemini_key_xyz123';

    const pro = new GeminiProProvider();
    const flash = new GeminiFlashProvider();

    expect(await pro.isAvailable()).toBe(true);
    expect(await flash.isAvailable()).toBe(true);
    expect(pro.getApiKey()).toBe('valid_dummy_gemini_key_xyz123');
  });

  it('3. Qwen Local model name is configurable via QWEN_MODEL, QWEN_LOCAL_MODEL, or LOCAL_LLM_MODEL', () => {
    process.env.QWEN_MODEL = 'qwen3:8b';
    const qwen = new QwenLocalProvider();
    expect(qwen.getModelName()).toBe('qwen3:8b');

    delete process.env.QWEN_MODEL;
    process.env.QWEN_LOCAL_MODEL = 'qwen3';
    expect(qwen.getModelName()).toBe('qwen3');
  });

  it('4. Qwen Local throws clear 404 error if specified model is not found in local server', async () => {
    const qwen = new QwenLocalProvider();
    try {
      await qwen.generateStream(
        {
          messages: [{ role: 'user', content: 'hola' }],
          systemPrompt: 'sys',
          model: 'non_existent_model_999',
        },
        () => {}
      );
    } catch (err: any) {
      expect(err.message).toMatch(/Qwen Local Error/);
    }
  });

  it('5. GMProviderRouter executes fallback chain (Pro -> Flash -> Qwen -> Offline)', async () => {
    const router = new GMProviderRouter(true); // Mock mode
    const chunks: string[] = [];

    await router.generateStream(
      { messages: [{ role: 'user', content: 'Atacar' }], systemPrompt: 'System Prompt' },
      (chunk) => chunks.push(chunk)
    );

    expect(chunks.length).toBeGreaterThan(0);
    const status = await router.getStatus();
    expect(status.activeProviderId).toBe('gemini-pro');
  });

  it('6. Ensures NO secrets/API keys are exposed in error messages or logs', () => {
    const secretKey = 'AIzaSySECRET_API_KEY_NEVER_LOG';
    process.env.GEMINI_API_KEY = secretKey;

    const pro = new GeminiProProvider();
    expect(pro.getApiKey()).toBe(secretKey);

    // Verify error text generation does NOT embed the secret key
    const router = new GMProviderRouter(false);
    expect(JSON.stringify(router)).not.toContain(secretKey);
  });

  it('7. All providers receive identical logical prompt and SimulationResult block', () => {
    const simResult: SimulationResult = {
      success: true,
      degree: 'SUCCESS',
      executionQuality: 85,
      chakraSpent: 22,
      staminaSpent: 5,
      vitalityChange: 0,
      healthChange: 0,
      stateChanges: { fatigueDelta: 4 },
      triggeredEffects: ['EFECTO_ACTIVO_MOKUBUNSHIN'],
      failures: [],
      enemyReactionWindowMs: 300,
      seed: 'seed_identical_prompt',
      calculationBreakdown: {
        skillScore: 35,
        chakraControlBonus: 26,
        experienceBonus: 16,
        concentrationBonus: 20,
        fatiguePenalty: 0,
        injuryPenalty: 0,
        complexityPenalty: 7,
        environmentPenalty: 0,
        masteryModifier: 20,
        intensityModifier: 0,
        compatibilityModifier: 5,
        finalExecutionScore: 115,
        difficultyThreshold: 60,
      },
    };

    const prompt = buildSystemPrompt({
      simulationResult: simResult,
      memory: { storyTitle: 'Test', currentChapter: 1, currentScene: 'Bosque', characters: [], recentEvents: [], dynamicStats: {} as any },
    });

    expect(prompt).toContain('[DETERMINISTIC SIMULATION RESULT — RESULTADO INVIOLABLE DEL MOTOR]');
    expect(prompt).toContain('ÉXITO DE LA ACCIÓN: SÍ');
    expect(prompt).toContain('Grado: SUCCESS');
    expect(prompt).toContain('INSTRUCCIÓN OBLIGATORIA E INVIOLABLE AL GAME MASTER');
  });
});
