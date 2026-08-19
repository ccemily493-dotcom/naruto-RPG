import { describe, it, expect } from 'vitest';
import { executeTechniqueSimulation } from '../server/simulation/shinobiSimulationEngine';
import { INITIAL_RIN_CHAKRA_STATE, absorbChakra, transferChakra, consumeChakra } from '../server/simulation/chakraEngine';
import { INITIAL_RIN_PHYSICAL_STATE, INITIAL_RIN_COMBAT_STATE, createEnemyStats } from '../server/simulation/stateEngine';
import { convertResource } from '../server/simulation/resourceFeedbackEngine';
import { ActionQueueManager } from '../server/simulation/actionQueue';
import { getTechniqueByIdOrName } from '../server/simulation/techniqueRegistry';

describe('Validation Phase — 12 Critical Scenarios Suite', () => {
  it('Scenario 1: Single jutsu with sufficient chakra', () => {
    const res = executeTechniqueSimulation({
      techniqueQuery: 'Mokubunshin',
      chakraState: INITIAL_RIN_CHAKRA_STATE,
      seed: 'val_seed_1',
    });

    expect(res.success).toBe(true);
    expect(res.chakraSpent).toBe(22);
    expect(res.failures.length).toBe(0);
  });

  it('Scenario 2: Jutsu with insufficient chakra', () => {
    const lowChakraState = { ...INITIAL_RIN_CHAKRA_STATE, primaryCurrent: 10, secondaryCurrent: 0 };
    const res = executeTechniqueSimulation({
      techniqueQuery: 'Bosque de las Almas Hambrientas', // Base cost 100
      chakraState: lowChakraState,
      seed: 'val_seed_2',
    });

    expect(res.success).toBe(false);
    expect(res.chakraSpent).toBe(0);
    expect(res.failures).toContain('CHAKRA_INSUFICIENTE_AGOTAMIENTO_TOTAL');
  });

  it('Scenario 3: Jutsu executed under high fatigue', () => {
    const fatiguedState = { ...INITIAL_RIN_PHYSICAL_STATE, fatigueLevel: 85 };
    const resFresh = executeTechniqueSimulation({
      techniqueQuery: 'Serpientes Cazadoras',
      chakraState: INITIAL_RIN_CHAKRA_STATE,
      physicalState: INITIAL_RIN_PHYSICAL_STATE,
      seed: 'val_seed_3',
    });

    const resFatigued = executeTechniqueSimulation({
      techniqueQuery: 'Serpientes Cazadoras',
      chakraState: INITIAL_RIN_CHAKRA_STATE,
      physicalState: fatiguedState,
      seed: 'val_seed_3',
    });

    expect(resFatigued.calculationBreakdown.fatiguePenalty).toBeGreaterThan(0);
    expect(resFatigued.calculationBreakdown.finalExecutionScore).toBeLessThan(resFresh.calculationBreakdown.finalExecutionScore);
  });

  it('Scenario 4: Jutsu executed under major injuries', () => {
    const injuredState = { ...INITIAL_RIN_PHYSICAL_STATE, injuriesPenalty: 40 };
    const resInjured = executeTechniqueSimulation({
      techniqueQuery: 'Chidori',
      chakraState: INITIAL_RIN_CHAKRA_STATE,
      physicalState: injuredState,
      seed: 'val_seed_4',
    });

    expect(resInjured.calculationBreakdown.injuryPenalty).toBeGreaterThan(0);
  });

  it('Scenario 5: Experimental / non-mastered jutsu execution risk', () => {
    const res = executeTechniqueSimulation({
      techniqueQuery: 'Loop Adaptativo', // EXPERIMENTAL
      chakraState: INITIAL_RIN_CHAKRA_STATE,
      seed: 'val_seed_5',
    });

    expect(res.calculationBreakdown.masteryModifier).toBeLessThan(0);
  });

  it('Scenario 6: Multi-step strategy execution step-by-step', () => {
    const queue = new ActionQueueManager();
    queue.enqueueAction('Ocultación de presencia');
    queue.enqueueAction('Raíces');
    queue.enqueueAction('Mokubunshin');
    queue.enqueueAction('Mirada Paralizante');
    queue.enqueueAction('Chidori');

    expect(queue.getQueue().length).toBe(5);

    // Resolve Step 1
    const step1 = queue.resolveNextAction(INITIAL_RIN_CHAKRA_STATE, INITIAL_RIN_PHYSICAL_STATE, INITIAL_RIN_COMBAT_STATE);
    expect(step1.resolvedItem?.techniqueId).toBe('Ocultación de presencia');
    expect(step1.remainingQueue.length).toBe(4);
  });

  it('Scenario 7: Chakra absorption with target resistance and capacity caps', () => {
    const state = { ...INITIAL_RIN_CHAKRA_STATE, primaryCurrent: 800 };
    const absRes = absorbChakra(state, 300, {
      extractionPower: 0.8,
      contactFactor: 1.0,
      rinControl: 90,
      targetResistance: 60,
      destination: 'primary',
    });

    expect(absRes.result.actualAbsorbed).toBeLessThan(300);
    expect(absRes.newState.primaryCurrent).toBeLessThanOrEqual(1000);
  });

  it('Scenario 8: Lossy chakra transfer to an ally', () => {
    const state = { ...INITIAL_RIN_CHAKRA_STATE, primaryCurrent: 500 };
    const { newState, result } = transferChakra(state, 100, 0.8);

    expect(result.rinCostPaid).toBe(100);
    expect(result.effectiveTransfer).toBe(80);
    expect(result.transferLoss).toBe(20);
    expect(newState.primaryCurrent + newState.secondaryCurrent).toBe(700);
  });

  it('Scenario 9: Resource feedback & backlash from saturation', () => {
    const chakra = { ...INITIAL_RIN_CHAKRA_STATE, saturationLevel: 85 };
    const physical = { ...INITIAL_RIN_PHYSICAL_STATE, healthCurrent: 100 };

    const { result } = convertResource(chakra, physical, {
      sourceType: 'chakra',
      destinationType: 'health',
      amount: 20,
      efficiency: 0.5,
      maxSafeConversion: 30,
    });

    expect(result.backlashTriggered).toBe(true);
    expect(result.backlashDamage).toBeGreaterThan(0);
  });

  it('Scenario 10: Chakra overload increases cost and instability risk', () => {
    const resNormal = executeTechniqueSimulation({
      techniqueQuery: 'Espiral Maldita',
      intensity: 'NORMAL',
      chakraState: INITIAL_RIN_CHAKRA_STATE,
      seed: 'val_seed_10',
    });

    const resOverload = executeTechniqueSimulation({
      techniqueQuery: 'Espiral Maldita',
      intensity: 'OVERLOAD',
      chakraState: INITIAL_RIN_CHAKRA_STATE,
      seed: 'val_seed_10',
    });

    expect(resOverload.chakraSpent).toBeGreaterThan(resNormal.chakraSpent);
  });

  it('Scenario 11: Interruption/evasion of technique by high enemy reaction and cover (Stage C)', () => {
    const bossEnemy = createEnemyStats('Ninja Élite', { reaction: 95 });
    const coverCombatState = { ...INITIAL_RIN_COMBAT_STATE, coverLevel: 80 };

    const res = executeTechniqueSimulation({
      techniqueQuery: 'Tamushaki Inverso',
      targetEnemy: bossEnemy,
      combatState: coverCombatState,
      chakraState: INITIAL_RIN_CHAKRA_STATE,
      seed: 'val_seed_11',
    });

    expect(res.degree).toBe('COUNTERED');
    expect(res.success).toBe(false);
  });

  it('Scenario 12: Sequence where Action 1 alters state for Action 2', () => {
    let currentChakra = { ...INITIAL_RIN_CHAKRA_STATE, primaryCurrent: 100, secondaryCurrent: 0 };
    const queue = new ActionQueueManager();
    queue.enqueueAction('Barrera de madera'); // Base cost 35
    queue.enqueueAction('Fruto Explosivo'); // Base cost 40

    // Step 1
    const step1 = queue.resolveNextAction(currentChakra, INITIAL_RIN_PHYSICAL_STATE, INITIAL_RIN_COMBAT_STATE);
    expect(step1.simulationResult?.success).toBe(true);
    currentChakra.primaryCurrent -= step1.simulationResult!.chakraSpent;

    // Step 2 with modified lower chakra
    const step2 = queue.resolveNextAction(currentChakra, INITIAL_RIN_PHYSICAL_STATE, INITIAL_RIN_COMBAT_STATE);
    expect(step2.simulationResult).toBeDefined();
  });
});
