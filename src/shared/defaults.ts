/* Small shared defaults for client-side to avoid importing server-only modules */
import type { NPCWorldState } from '../types';

export function createDefaultNPCWorld(): NPCWorldState {
  return {
    profiles: {},
    relationshipEvents: [],
    globalScheduleOverrides: [],
    activeEvents: [],
    activeQuests: [],
    villageTension: 0,
    lastEvaluatedTimestamp: Date.now(),
  };
}
