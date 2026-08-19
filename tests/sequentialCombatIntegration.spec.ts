import { describe, it, expect } from 'vitest';
import { ActionQueueManager } from '../server/simulation/actionQueue';
import { INITIAL_RIN_CHAKRA_STATE } from '../server/simulation/chakraEngine';
import { INITIAL_RIN_PHYSICAL_STATE, INITIAL_RIN_COMBAT_STATE } from '../server/simulation/stateEngine';

describe('Sequential Combat Integration Test Suite (6-Step Chain)', () => {
  it('Executes 6-step combat chain sequentially inheriting exact state across steps', () => {
    let currentChakra = { ...INITIAL_RIN_CHAKRA_STATE };
    let currentPhysical = { ...INITIAL_RIN_PHYSICAL_STATE };
    let currentCombat = { ...INITIAL_RIN_COMBAT_STATE, distanceMeters: 40 }; // Start 40m away

    const queue = new ActionQueueManager();
    queue.enqueueAction('Ocultación de presencia'); // Step 1: Stealth
    queue.enqueueAction('Tamushaki'); // Step 2: Movement (closes distance by 20m -> 20m)
    queue.enqueueAction('Raíces'); // Step 3: Roots binding (closes distance to 0m)
    queue.enqueueAction('Mokubunshin'); // Step 4: Wood Clone
    queue.enqueueAction('Mirada Paralizante'); // Step 5: Dōjutsu paralyze
    queue.enqueueAction('Chidori'); // Step 6: Chidori strike at 0m range!

    expect(queue.getQueue().length).toBe(6);

    // STEP 1: Ocultación de presencia
    const step1 = queue.resolveNextAction(currentChakra, currentPhysical, currentCombat, undefined, 'seq_step_1');
    expect(step1.resolvedItem?.techniqueId).toBe('Ocultación de presencia');
    expect(step1.simulationResult?.chakraSpent).toBeGreaterThan(0);
    currentChakra.primaryCurrent -= step1.simulationResult!.chakraSpent;
    currentPhysical.fatigueLevel += step1.simulationResult!.stateChanges.fatigueDelta;

    // STEP 2: Tamushaki (Movement)
    const step2 = queue.resolveNextAction(currentChakra, currentPhysical, currentCombat, undefined, 'seq_step_2');
    expect(step2.resolvedItem?.techniqueId).toBe('Tamushaki');
    currentChakra.primaryCurrent -= step2.simulationResult!.chakraSpent;
    currentPhysical.fatigueLevel += step2.simulationResult!.stateChanges.fatigueDelta;
    if (step2.simulationResult?.stateChanges.newDistanceMeters !== undefined) {
      currentCombat.distanceMeters = step2.simulationResult.stateChanges.newDistanceMeters;
    }
    expect(currentCombat.distanceMeters).toBe(20);

    // STEP 3: Raíces
    const step3 = queue.resolveNextAction(currentChakra, currentPhysical, currentCombat, undefined, 'seq_step_3');
    expect(step3.resolvedItem?.techniqueId).toBe('Raíces');
    currentChakra.primaryCurrent -= step3.simulationResult!.chakraSpent;
    currentPhysical.fatigueLevel += step3.simulationResult!.stateChanges.fatigueDelta;
    if (step3.simulationResult?.stateChanges.newDistanceMeters !== undefined) {
      currentCombat.distanceMeters = step3.simulationResult.stateChanges.newDistanceMeters;
    }
    expect(currentCombat.distanceMeters).toBe(0);

    // STEP 4: Mokubunshin
    const step4 = queue.resolveNextAction(currentChakra, currentPhysical, currentCombat, undefined, 'seq_step_4');
    expect(step4.resolvedItem?.techniqueId).toBe('Mokubunshin');
    currentChakra.primaryCurrent -= step4.simulationResult!.chakraSpent;
    currentPhysical.fatigueLevel += step4.simulationResult!.stateChanges.fatigueDelta;

    // STEP 5: Mirada Paralizante
    const step5 = queue.resolveNextAction(currentChakra, currentPhysical, currentCombat, undefined, 'seq_step_5');
    expect(step5.resolvedItem?.techniqueId).toBe('Mirada Paralizante');
    currentChakra.primaryCurrent -= step5.simulationResult!.chakraSpent;
    currentPhysical.fatigueLevel += step5.simulationResult!.stateChanges.fatigueDelta;

    // STEP 6: Chidori at 0m distance!
    const step6 = queue.resolveNextAction(currentChakra, currentPhysical, currentCombat, undefined, 'seq_step_6');
    expect(step6.resolvedItem?.techniqueId).toBe('Chidori');
    expect(step6.simulationResult?.success).toBe(true);

    // Verify state progression
    expect(currentChakra.primaryCurrent).toBeLessThan(1000);
    expect(currentPhysical.fatigueLevel).toBeGreaterThan(0);
    expect(queue.getQueue().length).toBe(0);
  });
});
