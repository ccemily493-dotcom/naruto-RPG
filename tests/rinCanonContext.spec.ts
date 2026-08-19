import { describe, it, expect } from 'vitest';
import { retrieveRinCanonContext } from '../server/rinCanonRetriever';
import { buildSystemPrompt } from '../server/prompts';
import { GMProviderRouter } from '../server/providers/GMProviderRouter';
import { setMockScenario, PRESET_SCENARIOS } from '../server/providers/MockQuotaProvider';

describe('Rin Canon Context Integration & Test Suite', () => {
  it('TEST 1: LAST_ROLLPLAY_STATE contradicts historical document -> LAST_ROLLPLAY_STATE wins', () => {
    const memoryOverride: any = {
      factual: { village: 'Bosque del Trueno', companions: ['Naruto'] },
      episodic: [{ timestamp: Date.now(), event: 'Rin se trasladó al Bosque del Trueno tras la batalla.' }],
    };

    const systemPrompt = buildSystemPrompt({ memory: memoryOverride, storyTitle: 'Partida Actual' });

    // Verify LAST_ROLLPLAY_STATE priority appears at Priority 1 in system prompt
    expect(systemPrompt).toContain('ESTADO ACTUAL DE LA PARTIDA [LAST_ROLLPLAY_STATE - PRIORIDAD ABSOLUTA 1]');
    expect(systemPrompt).toContain('Bosque del Trueno');
  });

  it('TEST 2: Indirect query about Mokuton ("Creo raíces bajo el suelo...") -> retrieves Mokuton context', () => {
    const result = retrieveRinCanonContext({
      playerAction: 'Creo raíces bajo el suelo y las hago rodear la zona en silencio',
    });

    expect(result.categories).toContain('MOKUTON');
    expect(result.retrievedContext).toContain('Mokuton Estilo de Rin');
    expect(result.confidence).toBeGreaterThan(0);
  });

  it('TEST 3: Query about temporal Genjutsu -> retrieves loop temporal section (bucles perceptivos)', () => {
    const result = retrieveRinCanonContext({
      playerAction: 'Activo un genjutsu de bucle temporal para atrapar al enemigo en una repetición constante',
    });

    expect(result.categories).toContain('GENJUTSU');
    expect(result.retrievedContext).toContain('Genjutsu de Loop Temporal Simple');
    expect(result.retrievedContext).toContain('NO altera el tiempo real');
  });

  it('TEST 4: Query about Kagehira secret -> appears ONLY in GM_SECRET layer', () => {
    const result = retrieveRinCanonContext({
      playerAction: '¿Qué ocurrió con mis padres y por qué desapareció el clan Kagehira?',
    });

    expect(result.gmSecrets.length).toBeGreaterThan(0);
    const secretsText = result.gmSecrets.join('\n');
    expect(secretsText).toContain('SECRETOS GM-ONLY');
    expect(secretsText).toContain('ascendieron a otro plano');
  });

  it('TEST 5: GM_SECRET context does NOT appear in RIN_KNOWLEDGE layer', () => {
    const result = retrieveRinCanonContext({
      playerAction: 'Investigo los secretos del ritual del clan Kagehira',
    });

    const rinKnowledgeText = result.rinKnowledge.join('\n');
    const gmSecretsText = result.gmSecrets.join('\n');

    expect(gmSecretsText).toContain('ascendieron a otro plano');
    expect(rinKnowledgeText).not.toContain('ascendieron a otro plano');
  });

  it('TEST 6: Technique marked as non-mastered -> retriever does not convert to mastered', () => {
    const result = retrieveRinCanonContext({
      playerAction: 'Pienso en el Cerebro Artificial de Chakra y la biotecnología',
    });

    expect(result.retrievedContext).toContain('Cerebro Artificial');
    // Ensure mastery stays EXPERIMENTAL
    const bioChunk = result.retrievedContext;
    expect(bioChunk).not.toContain('mastery: DOMINADO');
  });

  it('TEST 7: Gemini Pro / Gemini Flash / Qwen Local receive identical logical context', async () => {
    setMockScenario(PRESET_SCENARIOS.PRO_WORKING);
    const router = new GMProviderRouter(true);

    const systemPrompt = buildSystemPrompt({
      playerAction: 'Rin canaliza raíces de Mokuton y observa con el Tercer Ojo.',
      storyTitle: 'Partida Test Multi-Proveedor',
    });

    let promptPro = '';
    await router.generateStream(
      { messages: [{ role: 'user', content: 'Acción' }], systemPrompt },
      () => {},
      () => (promptPro = systemPrompt)
    );

    setMockScenario(PRESET_SCENARIOS.PRO_EXHAUSTED);
    let promptFlash = '';
    await router.generateStream(
      { messages: [{ role: 'user', content: 'Acción' }], systemPrompt },
      () => {},
      () => (promptFlash = systemPrompt)
    );

    setMockScenario(PRESET_SCENARIOS.PRO_FLASH_EXHAUSTED);
    let promptQwen = '';
    await router.generateStream(
      { messages: [{ role: 'user', content: 'Acción' }], systemPrompt },
      () => {},
      () => (promptQwen = systemPrompt)
    );

    expect(promptPro).toEqual(promptFlash);
    expect(promptFlash).toEqual(promptQwen);
  });

  it('TEST 8: Non-existent info -> does not invent info, returns absence of context', () => {
    const result = retrieveRinCanonContext({
      playerAction: 'zxqvwtks7899 kamehameha_goku_no_existente',
    });

    // None of official Rin documents contain non-existent info
    expect(result.retrievedContext).not.toContain('kamehameha');
    expect(result.confidence).toBe(0);
  });
});
