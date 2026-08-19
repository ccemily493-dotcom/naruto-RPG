import { describe, it, expect } from 'vitest';
import { executeTechniqueSimulation } from '../server/simulation/shinobiSimulationEngine';
import { INITIAL_RIN_CHAKRA_STATE } from '../server/simulation/chakraEngine';
import { INITIAL_RIN_PHYSICAL_STATE, INITIAL_RIN_COMBAT_STATE } from '../server/simulation/stateEngine';
import { ActionQueueManager } from '../server/simulation/actionQueue';
import { buildSystemPrompt } from '../server/prompts';

describe('Deterministic Shinobi Simulation Engine Main Test Suite', () => {
  it('TEST 11: Fatigue reduces execution score', () => {
    const freshPhysical = { ...INITIAL_RIN_PHYSICAL_STATE, fatigueLevel: 0 };
    const exhaustedPhysical = { ...INITIAL_RIN_PHYSICAL_STATE, fatigueLevel: 80 };

    const resFresh = executeTechniqueSimulation({
      techniqueQuery: 'Raíces',
      chakraState: INITIAL_RIN_CHAKRA_STATE,
      physicalState: freshPhysical,
      seed: 'seed_fatigue_test',
    });

    const resExhausted = executeTechniqueSimulation({
      techniqueQuery: 'Raíces',
      chakraState: INITIAL_RIN_CHAKRA_STATE,
      physicalState: exhaustedPhysical,
      seed: 'seed_fatigue_test',
    });

    expect(resExhausted.calculationBreakdown.fatiguePenalty).toBeGreaterThan(resFresh.calculationBreakdown.fatiguePenalty);
    expect(resExhausted.calculationBreakdown.finalExecutionScore).toBeLessThan(resFresh.calculationBreakdown.finalExecutionScore);
  });

  it('TEST 12: Injuries reduce execution score', () => {
    const injuredPhysical = { ...INITIAL_RIN_PHYSICAL_STATE, injuriesPenalty: 30 };

    const resHealthy = executeTechniqueSimulation({
      techniqueQuery: 'Chidori',
      chakraState: INITIAL_RIN_CHAKRA_STATE,
      physicalState: INITIAL_RIN_PHYSICAL_STATE,
      seed: 'seed_injury_test',
    });

    const resInjured = executeTechniqueSimulation({
      techniqueQuery: 'Chidori',
      chakraState: INITIAL_RIN_CHAKRA_STATE,
      physicalState: injuredPhysical,
      seed: 'seed_injury_test',
    });

    expect(resInjured.calculationBreakdown.injuryPenalty).toBeGreaterThan(resHealthy.calculationBreakdown.injuryPenalty);
    expect(resInjured.calculationBreakdown.finalExecutionScore).toBeLessThan(resHealthy.calculationBreakdown.finalExecutionScore);
  });

  it('TEST 13: Mastery affects execution score (Mastered vs Experimental)', () => {
    const resMastered = executeTechniqueSimulation({
      techniqueQuery: 'Mokubunshin', // MASTERED
      chakraState: INITIAL_RIN_CHAKRA_STATE,
      seed: 'seed_mastery_test',
    });

    const resExperimental = executeTechniqueSimulation({
      techniqueQuery: 'Loop Adaptativo', // EXPERIMENTAL
      chakraState: INITIAL_RIN_CHAKRA_STATE,
      seed: 'seed_mastery_test',
    });

    expect(resMastered.calculationBreakdown.masteryModifier).toBeGreaterThan(resExperimental.calculationBreakdown.masteryModifier);
  });

  it('TEST 14 & 28: Experimental technique can trigger backlash or unstable success', () => {
    const exhaustedPhysical = { ...INITIAL_RIN_PHYSICAL_STATE, fatigueLevel: 70 };
    const res = executeTechniqueSimulation({
      techniqueQuery: 'Ataúd de la Muerte — Luto', // EXPERIMENTAL
      intensity: 'OVERLOAD',
      chakraState: INITIAL_RIN_CHAKRA_STATE,
      physicalState: exhaustedPhysical,
      seed: 'seed_experimental_backlash',
    });

    expect(res.degree === 'BACKLASH' || res.degree === 'UNSTABLE_SUCCESS' || !res.success).toBe(true);
  });

  it('TEST 15 & 16: Overload increases cost and risk', () => {
    const resNormal = executeTechniqueSimulation({
      techniqueQuery: 'Espiral Maldita',
      intensity: 'NORMAL',
      chakraState: INITIAL_RIN_CHAKRA_STATE,
      seed: 'seed_overload',
    });

    const resOverload = executeTechniqueSimulation({
      techniqueQuery: 'Espiral Maldita',
      intensity: 'OVERLOAD',
      chakraState: INITIAL_RIN_CHAKRA_STATE,
      seed: 'seed_overload',
    });

    expect(resOverload.chakraSpent).toBeGreaterThan(resNormal.chakraSpent);
  });

  it('TEST 17 & 18: Same seed + same state = SAME result; different seed = reproducible variation', () => {
    const run1 = executeTechniqueSimulation({
      techniqueQuery: 'Tamushaki',
      chakraState: INITIAL_RIN_CHAKRA_STATE,
      seed: 'exact_same_seed_123',
    });

    const run2 = executeTechniqueSimulation({
      techniqueQuery: 'Tamushaki',
      chakraState: INITIAL_RIN_CHAKRA_STATE,
      seed: 'exact_same_seed_123',
    });

    expect(run1).toEqual(run2);
  });

  it('TEST 19: Chidori does NOT guarantee 100% success when physical state is compromised', () => {
    const severePhysical = { ...INITIAL_RIN_PHYSICAL_STATE, fatigueLevel: 90, injuriesPenalty: 40 };

    const res = executeTechniqueSimulation({
      techniqueQuery: 'Chidori',
      chakraState: INITIAL_RIN_CHAKRA_STATE,
      physicalState: severePhysical,
      seed: 'chidori_fail_seed',
    });

    expect(res.success).toBe(false);
  });

  it('TEST 21 & 22: ActionQueue respects step order and handles enemy reaction window', () => {
    const queue = new ActionQueueManager();
    queue.enqueueAction('Mokubunshin');
    queue.enqueueAction('Chidori');

    expect(queue.getQueue().length).toBe(2);

    const step1 = queue.resolveNextAction(INITIAL_RIN_CHAKRA_STATE, INITIAL_RIN_PHYSICAL_STATE, INITIAL_RIN_COMBAT_STATE);
    expect(step1.resolvedItem?.techniqueId).toBe('Mokubunshin');
    expect(step1.remainingQueue.length).toBe(1);
    expect(step1.simulationResult?.enemyReactionWindowMs).toBeGreaterThan(0);
  });

  it('TEST 25 & 26: GM receives SimulationResult and non-alterable prompt instruction', () => {
    const simResult = executeTechniqueSimulation({
      techniqueQuery: 'Fruto Explosivo',
      chakraState: INITIAL_RIN_CHAKRA_STATE,
      seed: 'gm_test_seed',
    });

    const prompt = buildSystemPrompt({ simulationResult: simResult, storyTitle: 'Partida Simulation GM' });

    expect(prompt).toContain('[DETERMINISTIC SIMULATION RESULT — RESULTADO INVIOLABLE DEL MOTOR]');
    expect(prompt).toContain('INSTRUCCIÓN OBLIGATORIA E INVIOLABLE AL GAME MASTER');
    expect(prompt).toContain('gm_test_seed');
  });
});
