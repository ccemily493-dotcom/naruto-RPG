import { ChakraState, INITIAL_RIN_CHAKRA_STATE, consumeChakra } from './chakraEngine';
import {
  PhysicalStateQuantified,
  CombatStateQuantified,
  INITIAL_RIN_PHYSICAL_STATE,
  INITIAL_RIN_COMBAT_STATE,
  updatePhysicalState,
} from './stateEngine';
import { SimulationResult, TechniqueDefinition } from '../../src/types';
import { getTechniqueByIdOrName } from './techniqueRegistry';

export interface ActiveJutsuMaintenance {
  techniqueId: string;
  name: string;
  maintenanceCost: number;
  turnsActive: number;
}

export interface PersistentShinobiState {
  chakraState: ChakraState;
  physicalState: PhysicalStateQuantified;
  combatState: CombatStateQuantified;
  activeTurnJutsus: ActiveJutsuMaintenance[];
  accumulatedTimeSeconds: number;
  turnCount: number;
}

class ServerShinobiStateManager {
  private state: PersistentShinobiState;

  constructor() {
    this.state = this.createDefaultState();
  }

  private createDefaultState(): PersistentShinobiState {
    return {
      chakraState: { ...INITIAL_RIN_CHAKRA_STATE },
      physicalState: { ...INITIAL_RIN_PHYSICAL_STATE },
      combatState: { ...INITIAL_RIN_COMBAT_STATE, activeJutsu: [], cooldowns: {} },
      activeTurnJutsus: [],
      accumulatedTimeSeconds: 0,
      turnCount: 1,
    };
  }

  public getState(): PersistentShinobiState {
    return {
      chakraState: { ...this.state.chakraState },
      physicalState: { ...this.state.physicalState },
      combatState: {
        ...this.state.combatState,
        activeJutsu: [...this.state.combatState.activeJutsu],
        cooldowns: { ...this.state.combatState.cooldowns },
      },
      activeTurnJutsus: [...this.state.activeTurnJutsus],
      accumulatedTimeSeconds: this.state.accumulatedTimeSeconds,
      turnCount: this.state.turnCount,
    };
  }

  public setState(newState: Partial<PersistentShinobiState>): PersistentShinobiState {
    if (newState.chakraState) this.state.chakraState = { ...newState.chakraState };
    if (newState.physicalState) this.state.physicalState = updatePhysicalState(this.state.physicalState, newState.physicalState);
    if (newState.combatState) this.state.combatState = { ...newState.combatState };
    if (newState.activeTurnJutsus) this.state.activeTurnJutsus = [...newState.activeTurnJutsus];
    if (newState.accumulatedTimeSeconds !== undefined) this.state.accumulatedTimeSeconds = newState.accumulatedTimeSeconds;
    if (newState.turnCount !== undefined) this.state.turnCount = newState.turnCount;
    return this.getState();
  }

  public resetToDefault(): PersistentShinobiState {
    this.state = this.createDefaultState();
    return this.getState();
  }

  /**
   * Applies simulation result to update server state persistently
   */
  public applySimulationResult(result: SimulationResult, technique?: TechniqueDefinition): PersistentShinobiState {
    // 1. Update Chakra
    this.state.chakraState.primaryCurrent = Math.max(
      0,
      this.state.chakraState.primaryCurrent - result.chakraSpent
    );

    // 2. Update Physical State (Fatigue, Stamina, Health)
    const fatigueDelta = result.stateChanges.fatigueDelta || 0;
    this.state.physicalState.fatigueLevel = Math.min(100, this.state.physicalState.fatigueLevel + fatigueDelta);
    this.state.physicalState.staminaCurrent = Math.max(0, this.state.physicalState.staminaCurrent - result.staminaSpent);
    this.state.physicalState.healthCurrent = Math.max(0, this.state.physicalState.healthCurrent + result.healthChange);

    this.state.physicalState = updatePhysicalState(this.state.physicalState, {});

    // 3. Update Combat State (Distance, Execution Time, Active Jutsus)
    if (result.stateChanges.newDistanceMeters !== undefined) {
      this.state.combatState.distanceMeters = result.stateChanges.newDistanceMeters;
    }

    if (technique) {
      this.state.accumulatedTimeSeconds += technique.executionTimeSeconds;

      // Add to active jutsus if technique requires maintenance
      if (technique.maintenanceCostPerTurn && result.success) {
        const existing = this.state.activeTurnJutsus.find((j) => j.techniqueId === technique.id);
        if (!existing) {
          this.state.activeTurnJutsus.push({
            techniqueId: technique.id,
            name: technique.name,
            maintenanceCost: technique.maintenanceCostPerTurn,
            turnsActive: 1,
          });
          this.state.combatState.activeJutsu.push(technique.name);
        }
      }
    }

    return this.getState();
  }

  /**
   * Advances turn and processes maintenance costs for active jutsus
   */
  public processTurnMaintenance(): {
    state: PersistentShinobiState;
    maintenancePaidTotal: number;
    canceledJutsus: string[];
  } {
    this.state.turnCount += 1;
    let maintenancePaidTotal = 0;
    const canceledJutsus: string[] = [];

    for (let i = this.state.activeTurnJutsus.length - 1; i >= 0; i--) {
      const active = this.state.activeTurnJutsus[i];
      active.turnsActive += 1;

      // Try consuming maintenance from primary or secondary
      const consumeRes = consumeChakra(this.state.chakraState, active.maintenanceCost, 'any');
      if (consumeRes.success) {
        this.state.chakraState = consumeRes.newState;
        maintenancePaidTotal += consumeRes.actualPaid;
      } else {
        // Insufficient chakra -> Cancel active jutsu
        canceledJutsus.push(active.name);
        this.state.activeTurnJutsus.splice(i, 1);
        this.state.combatState.activeJutsu = this.state.combatState.activeJutsu.filter(
          (name) => name !== active.name
        );
      }
    }

    return {
      state: this.getState(),
      maintenancePaidTotal,
      canceledJutsus,
    };
  }

  /**
   * Rest action: Recovers chakra, reduces fatigue, restores stamina
   */
  public rest(durationMinutes = 15): PersistentShinobiState {
    const chakraRecovery = durationMinutes * 15;
    const fatigueRecovery = durationMinutes * 2;
    const staminaRecovery = durationMinutes * 4;

    this.state.chakraState.primaryCurrent = Math.min(
      this.state.chakraState.primaryMax,
      this.state.chakraState.primaryCurrent + chakraRecovery
    );
    this.state.chakraState.secondaryCurrent = Math.min(
      this.state.chakraState.secondaryMax,
      this.state.chakraState.secondaryCurrent + Math.round(chakraRecovery * 0.3)
    );

    this.state.physicalState.fatigueLevel = Math.max(0, this.state.physicalState.fatigueLevel - fatigueRecovery);
    this.state.physicalState.staminaCurrent = Math.min(
      this.state.physicalState.staminaMax,
      this.state.physicalState.staminaCurrent + staminaRecovery
    );

    this.state.physicalState = updatePhysicalState(this.state.physicalState, {});
    this.state.accumulatedTimeSeconds += durationMinutes * 60;
    return this.getState();
  }
}

export const persistentShinobiState = new ServerShinobiStateManager();
