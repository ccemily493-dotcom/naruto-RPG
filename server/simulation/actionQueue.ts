import { ActionQueueItem, SimulationResult, EnemyStatsQuantified } from '../../src/types';
import { ChakraState } from './chakraEngine';
import { PhysicalStateQuantified, CombatStateQuantified } from './stateEngine';
import { executeTechniqueSimulation } from './shinobiSimulationEngine';

export class ActionQueueManager {
  private queue: ActionQueueItem[] = [];

  private actionCounter = 0;

  public getQueue(): ActionQueueItem[] {
    return [...this.queue];
  }

  public enqueueAction(techniqueId: string, target?: string, intensity?: any): ActionQueueItem {
    this.actionCounter += 1;
    const item: ActionQueueItem = {
      id: `action_seq_${this.actionCounter}_${techniqueId}`,
      techniqueId,
      target,
      intensity,
      status: 'pending',
    };
    this.queue.push(item);
    return item;
  }

  public clearQueue(): void {
    this.queue = [];
  }

  /**
   * Resolves the next single action in the queue step by step.
   * Player retains control between actions. If an action fails,
   * enemy reaction window opens and can invalidate remaining queue.
   */
  public resolveNextAction(
    chakraState: ChakraState,
    physicalState: PhysicalStateQuantified,
    combatState: CombatStateQuantified,
    enemy?: EnemyStatsQuantified,
    seed?: string
  ): {
    resolvedItem: ActionQueueItem | undefined;
    simulationResult: SimulationResult | undefined;
    remainingQueue: ActionQueueItem[];
  } {
    if (this.queue.length === 0) {
      return { resolvedItem: undefined, simulationResult: undefined, remainingQueue: [] };
    }

    const item = this.queue[0];
    item.status = 'executing';

    const simResult = executeTechniqueSimulation({
      techniqueQuery: item.techniqueId,
      intensity: item.intensity,
      targetEnemy: enemy,
      chakraState,
      physicalState,
      combatState,
      seed,
    });

    item.result = simResult;
    if (simResult.success) {
      item.status = 'completed';
    } else if (simResult.degree === 'COUNTERED') {
      item.status = 'countered';
    } else {
      item.status = 'failed';
    }

    // Remove executed item
    this.queue.shift();

    // If step failed or had backlash, remaining queued items are invalidated to give player control
    if (!simResult.success) {
      for (const remaining of this.queue) {
        remaining.status = 'invalidated';
      }
    }

    return {
      resolvedItem: item,
      simulationResult: simResult,
      remainingQueue: [...this.queue],
    };
  }
}
