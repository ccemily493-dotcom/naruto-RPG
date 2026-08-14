import { CozyAtmosphere, EpisodicEvent, NPCWorldState, TimeOfDay } from '../../src/types';
import { evaluateNPCPerception } from './npcPerception';
import { applyMemoryDecay } from './npcMemory';
import { updateNPCEmotion } from './npcEmotion';
import { generateGOAPPlan } from './npcPlanner';
import { advanceNPCDailyLife } from './npcDailyLife';
import { generateEmergentWorldEvent } from './eventSystem';
import { generateEmergentQuests } from './questSystem';

/**
 * World Simulation AI
 * Off-screen tick engine that updates the entire world deterministically:
 * - Advances time of day / daily routines
 * - Simulates NPC movement & fatigue
 * - Evaluates perception, emotions, and local GOAP intentions for every active NPC
 * - Decays old memories
 * - Generates emergent world events & quests
 */

export function simulateWorldTick(
  worldState: NPCWorldState,
  atmosphere: CozyAtmosphere,
  sceneParticipants: string[] = [],
  recentEvents: EpisodicEvent[] = []
): NPCWorldState {
  let updatedWorld = { ...worldState };
  const timeOfDay: TimeOfDay = atmosphere.timeOfDay || 'mediodía';

  // 1. Advance daily routines & physical state for all active NPCs
  const updatedProfiles = { ...updatedWorld.profiles };
  for (const id in updatedProfiles) {
    const profile = updatedProfiles[id];
    if (!profile.isActive) continue;

    // Daily life step
    const dailyLifeUpdates = advanceNPCDailyLife(profile, timeOfDay);

    // Emotion step (decay extreme arousal towards baseline)
    const newEmotion = updateNPCEmotion(profile.emotionState, { arousalDelta: -0.05 });

    // Perception step
    const perception = evaluateNPCPerception(profile, updatedWorld, atmosphere.locationName, sceneParticipants);

    // Memory decay step
    const freshMemories = applyMemoryDecay(profile.memories || []);

    // GOAP Planner step
    const newIntention = generateGOAPPlan(profile, updatedWorld, timeOfDay);
    const existingIntentions = profile.intentions || [];
    const intentions = newIntention ? [newIntention, ...existingIntentions.slice(0, 2)] : existingIntentions;

    updatedProfiles[id] = {
      ...profile,
      ...dailyLifeUpdates,
      emotionState: newEmotion,
      perceptionState: perception,
      memories: freshMemories,
      intentions,
      currentMood: newEmotion.primaryMood,
      lastUpdatedTimestamp: Date.now(),
    };
  }

  updatedWorld.profiles = updatedProfiles;

  // 2. Generate emergent world event if appropriate
  const newEvent = generateEmergentWorldEvent(updatedWorld);
  if (newEvent) {
    const currentEvents = updatedWorld.activeEvents || [];
    updatedWorld.activeEvents = [newEvent, ...currentEvents.slice(0, 4)];
  }

  // 3. Generate emergent quests
  updatedWorld.activeQuests = generateEmergentQuests(updatedWorld);
  updatedWorld.lastEvaluatedTimestamp = Date.now();

  return updatedWorld;
}
