import { NPCProfile, TimeOfDay } from '../../src/types';

/**
 * NPC Daily Life AI
 * Simulates routines, training progression, fatigue/hunger/rest cycles,
 * and physical location shifts.
 */

export function advanceNPCDailyLife(
  npc: NPCProfile,
  timeOfDay: TimeOfDay
): Partial<NPCProfile> {
  // Map timeOfDay to slot
  let targetSlot = 'morning';
  if (timeOfDay === 'amanecer') targetSlot = 'dawn';
  else if (timeOfDay === 'mediodía' || timeOfDay === 'tarde') targetSlot = 'afternoon';
  else if (timeOfDay === 'atardecer') targetSlot = 'evening';
  else if (timeOfDay === 'noche' || timeOfDay === 'madrugada') targetSlot = 'night';

  const entry = npc.schedule.find((s) => s.slot === targetSlot);
  if (!entry) return {};

  let newPhysicalState = npc.physicalState;

  // Fatigue recovery during sleep
  if (targetSlot === 'dawn' || targetSlot === 'night') {
    newPhysicalState = 'Descansado / Enérgico';
  } else if (entry.activity.toLowerCase().includes('entren')) {
    newPhysicalState = 'Entrenado / Leve fatiga de chakra';
  }

  return {
    currentLocation: entry.location,
    currentActivity: entry.activity,
    physicalState: newPhysicalState,
    lastUpdatedTimestamp: Date.now(),
  };
}
