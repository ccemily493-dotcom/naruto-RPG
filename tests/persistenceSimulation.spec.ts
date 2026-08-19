import { describe, it, expect, beforeEach } from 'vitest';
import { persistentShinobiState } from '../server/simulation/persistentStateManager';
import { executeTechniqueSimulation } from '../server/simulation/shinobiSimulationEngine';
import { getTechniqueByIdOrName } from '../server/simulation/techniqueRegistry';
import { ActionQueueManager } from '../server/simulation/actionQueue';

describe('Server Persistence Simulation Suite', () => {
  beforeEach(() => {
    persistentShinobiState.resetToDefault();
  });

  it('1. PERSISTENCE BETWEEN REQUESTS: State evolves continuously across independent requests', () => {
    // Initial state
    const init = persistentShinobiState.getState();
    expect(init.chakraState.primaryCurrent).toBe(1000);
    expect(init.physicalState.fatigueLevel).toBe(0);

    // Request 1: Cast Mokubunshin
    const tech1 = getTechniqueByIdOrName('Mokubunshin')!;
    const res1 = executeTechniqueSimulation({
      techniqueQuery: 'Mokubunshin',
      chakraState: init.chakraState,
      physicalState: init.physicalState,
      combatState: init.combatState,
      seed: 'p_seed_1',
    });

    const stateAfterReq1 = persistentShinobiState.applySimulationResult(res1, tech1);
    expect(stateAfterReq1.chakraState.primaryCurrent).toBeLessThan(1000);
    expect(stateAfterReq1.physicalState.fatigueLevel).toBeGreaterThan(0);

    // Request 2: Independent request (server state is source of truth)
    const currentServerState = persistentShinobiState.getState();
    const tech2 = getTechniqueByIdOrName('Raíces')!;
    const res2 = executeTechniqueSimulation({
      techniqueQuery: 'Raíces',
      chakraState: currentServerState.chakraState,
      physicalState: currentServerState.physicalState,
      combatState: currentServerState.combatState,
      seed: 'p_seed_2',
    });

    const stateAfterReq2 = persistentShinobiState.applySimulationResult(res2, tech2);

    // Verify exact continuity (no reset to 1000/0)
    expect(stateAfterReq2.chakraState.primaryCurrent).toBeLessThan(stateAfterReq1.chakraState.primaryCurrent);
    expect(stateAfterReq2.physicalState.fatigueLevel).toBeGreaterThan(stateAfterReq1.physicalState.fatigueLevel);
  });

  it('2. MAINTENANCE COST PER TURN: Active jutsus charge maintenance each turn and cancel if chakra depleted', () => {
    const tech = getTechniqueByIdOrName('Mokubunshin')!; // maintenanceCostPerTurn: 5
    const res = executeTechniqueSimulation({
      techniqueQuery: 'Mokubunshin',
      chakraState: persistentShinobiState.getState().chakraState,
      seed: 'maint_seed_1',
    });

    persistentShinobiState.applySimulationResult(res, tech);
    const stateTurn1 = persistentShinobiState.getState();
    expect(stateTurn1.activeTurnJutsus.length).toBe(1);
    expect(stateTurn1.activeTurnJutsus[0].techniqueId).toBe('mokubunshin');
    const primaryChakraAfterTurn1 = stateTurn1.chakraState.primaryCurrent;

    // Turn 2: Advance turn without re-launching jutsu
    const turn2Res = persistentShinobiState.processTurnMaintenance();
    expect(turn2Res.maintenancePaidTotal).toBe(5);
    expect(turn2Res.state.chakraState.secondaryCurrent).toBe(295);
    expect(turn2Res.state.chakraState.primaryCurrent).toBe(primaryChakraAfterTurn1);

    // Turn 3: Advance turn again
    const turn3Res = persistentShinobiState.processTurnMaintenance();
    expect(turn3Res.maintenancePaidTotal).toBe(5);

    // Drain chakra to force cancellation
    persistentShinobiState.setState({
      chakraState: { ...persistentShinobiState.getState().chakraState, primaryCurrent: 2, secondaryCurrent: 0 },
    });

    const turn4Res = persistentShinobiState.processTurnMaintenance();
    expect(turn4Res.canceledJutsus).toContain('Mokubunshin');
    expect(turn4Res.state.activeTurnJutsus.length).toBe(0);
  });

  it('3. REAL TIME ACCUMULATION IN ACTION QUEUE: Execution times accumulate and are not instant', () => {
    const queue = new ActionQueueManager();
    // Action A = 4.0s (Bosque de las Almas Hambrientas)
    // Action B = 3.0s (Loop Temporal Simple)
    // Action C = 2.0s (Fruto Explosivo)
    queue.enqueueAction('Bosque de las Almas Hambrientas');
    queue.enqueueAction('Loop Temporal Simple');
    queue.enqueueAction('Fruto Explosivo');

    const state = persistentShinobiState.getState();

    // Step A
    const stepA = queue.resolveNextAction(state.chakraState, state.physicalState, state.combatState);
    const techA = getTechniqueByIdOrName('Bosque de las Almas Hambrientas')!;
    persistentShinobiState.applySimulationResult(stepA.simulationResult!, techA);
    expect(persistentShinobiState.getState().accumulatedTimeSeconds).toBe(4.0);

    // Step B
    const stepB = queue.resolveNextAction(state.chakraState, state.physicalState, state.combatState);
    const techB = getTechniqueByIdOrName('Loop Temporal Simple')!;
    persistentShinobiState.applySimulationResult(stepB.simulationResult!, techB);
    expect(persistentShinobiState.getState().accumulatedTimeSeconds).toBe(7.0);

    // Step C
    const stepC = queue.resolveNextAction(state.chakraState, state.physicalState, state.combatState);
    const techC = getTechniqueByIdOrName('Fruto Explosivo')!;
    persistentShinobiState.applySimulationResult(stepC.simulationResult!, techC);

    // Total accumulated execution time must equal 4.0 + 3.0 + 2.0 = 9.0 seconds
    expect(persistentShinobiState.getState().accumulatedTimeSeconds).toBe(9.0);
  });

  it('4. REBOOT / SEQUENTIAL TURN PROGRESSION & REST: State progresses, rests, and never auto-resets', () => {
    // Turn 1: Cast Chidori
    const tech1 = getTechniqueByIdOrName('Chidori')!;
    const res1 = executeTechniqueSimulation({
      techniqueQuery: 'Chidori',
      chakraState: persistentShinobiState.getState().chakraState,
      seed: 'prog_1',
    });
    persistentShinobiState.applySimulationResult(res1, tech1);

    const s1 = persistentShinobiState.getState();
    const chakraTurn1 = s1.chakraState.primaryCurrent;
    const fatigueTurn1 = s1.physicalState.fatigueLevel;

    // Turn 2: Cast Espiral Maldita
    const tech2 = getTechniqueByIdOrName('Espiral Maldita')!;
    const res2 = executeTechniqueSimulation({
      techniqueQuery: 'Espiral Maldita',
      chakraState: s1.chakraState,
      physicalState: s1.physicalState,
      seed: 'prog_2',
    });
    persistentShinobiState.applySimulationResult(res2, tech2);

    const s2 = persistentShinobiState.getState();
    expect(s2.chakraState.primaryCurrent).toBeLessThan(chakraTurn1);
    expect(s2.physicalState.fatigueLevel).toBeGreaterThan(fatigueTurn1);

    // Turn 3: Rest 15 minutes
    const s3 = persistentShinobiState.rest(15);
    expect(s3.chakraState.primaryCurrent).toBeGreaterThan(s2.chakraState.primaryCurrent);
    expect(s3.physicalState.fatigueLevel).toBeLessThan(s2.physicalState.fatigueLevel);

    // Turn 4: Cast Raíces from recovered state
    const tech4 = getTechniqueByIdOrName('Raíces')!;
    const res4 = executeTechniqueSimulation({
      techniqueQuery: 'Raíces',
      chakraState: s3.chakraState,
      physicalState: s3.physicalState,
      seed: 'prog_4',
    });
    persistentShinobiState.applySimulationResult(res4, tech4);

    const s4 = persistentShinobiState.getState();
    expect(s4.chakraState.primaryCurrent).toBeLessThan(s3.chakraState.primaryCurrent);
  });
});
