import { NPCProfile, NPCPerceptionState, NPCWorldState } from '../../src/types';

/**
 * NPC Perception AI
 * Calculates what an NPC can see, hear, sense via chakra, or learn through rumors.
 * Enforces strict sensory boundaries so NPCs don't have omniscient knowledge.
 */

export function evaluateNPCPerception(
  npc: NPCProfile,
  worldState: NPCWorldState,
  currentSceneLocation: string,
  sceneParticipants: string[],
  recentSoundEvents: string[] = []
): NPCPerceptionState {
  const visibleEntities: string[] = [];
  const heardEvents: string[] = [...recentSoundEvents];
  const chakraSensings: string[] = [];
  const learnedRumors: string[] = [];

  // 1. Sight: Entities in the exact same location
  if (npc.currentLocation === currentSceneLocation || npc.isPresent) {
    for (const pName of sceneParticipants) {
      if (pName.toLowerCase() !== npc.name.toLowerCase()) {
        visibleEntities.push(pName);
      }
    }
  }

  // 2. Chakra Sensing: Higher perception for ninja with sensory skills (Kakashi, Orochimaru, Sensory Rin)
  for (const id in worldState.profiles) {
    const other = worldState.profiles[id];
    if (other.id === npc.id) continue;

    const sameLoc = other.currentLocation === npc.currentLocation;
    const isSensory = npc.id === 'kakashi' || npc.id === 'orochimaru';

    if (sameLoc || (isSensory && other.physicalState.toLowerCase().includes('chakra'))) {
      chakraSensings.push(`Resonancia de chakra de ${other.name} (${other.physicalState || 'normal'})`);
    }
  }

  // 3. Rumors: Information from recent world events
  if (worldState.activeEvents) {
    for (const ev of worldState.activeEvents) {
      if (!ev.resolved && (ev.location === npc.currentLocation || ev.importance === 'critical')) {
        learnedRumors.push(`Rumor: ${ev.title} en ${ev.location}`);
      }
    }
  }

  return {
    visibleEntities,
    heardEvents,
    chakraSensings,
    learnedRumors,
  };
}
