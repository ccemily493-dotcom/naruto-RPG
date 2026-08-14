import {
  NPCWorldState,
  NPCProfile,
  CozyAtmosphere,
  EpisodicEvent,
  NPCIntention,
  TimeOfDay,
  RelationshipEvent,
  NPCMemoryEntry
} from '../src/types';
import { DEFAULT_NPC_PROFILES } from './npcProfiles';
import { simulateWorldTick } from './ai/worldSimulator';
import { updateN2NRelationship } from './ai/npcSocialGraph';
import { recallRelevantMemories } from './ai/npcMemory';

export function createDefaultNPCWorld(): NPCWorldState {
  return {
    profiles: JSON.parse(JSON.stringify(DEFAULT_NPC_PROFILES)),
    relationshipEvents: [],
    globalScheduleOverrides: [],
    activeEvents: [],
    activeQuests: [],
    villageTension: 15,
    lastEvaluatedTimestamp: Date.now()
  };
}

export function getRelevantNPCs(
  npcWorld: NPCWorldState,
  companions: string[],
  locationName: string
): NPCProfile[] {
  const relevant: NPCProfile[] = [];

  for (const id in npcWorld.profiles) {
    const profile = npcWorld.profiles[id];
    const isCompanion = companions.some(c => c.toLowerCase().includes(profile.name.toLowerCase()) || profile.name.toLowerCase().includes(c.toLowerCase()));

    if (isCompanion || profile.currentLocation === locationName || profile.isPresent) {
      profile.isPresent = true;
      relevant.push(profile);
    } else {
      profile.isPresent = false;
    }
  }

  return relevant;
}

export function evaluateNPCInitiative(
  npcWorld: NPCWorldState,
  atmosphere: CozyAtmosphere,
  recentEvents: EpisodicEvent[],
  currentChapter?: string
): NPCIntention[] {
  const initiatives: NPCIntention[] = [];

  for (const id in npcWorld.profiles) {
    const profile = npcWorld.profiles[id];
    if (!profile.isActive) continue;

    for (const intent of profile.intentions || []) {
      if (!intent.blockedBy) {
        initiatives.push(intent);
      }
    }
  }

  return initiatives;
}

export function getNPCScheduleContext(
  npcWorld: NPCWorldState,
  timeOfDay: TimeOfDay
): Array<{ npc: string; activity: string; location: string }> {
  const schedule: Array<{ npc: string; activity: string; location: string }> = [];

  let targetSlot = 'morning';
  if (timeOfDay === 'amanecer') targetSlot = 'dawn';
  else if (timeOfDay === 'mediodía' || timeOfDay === 'tarde') targetSlot = 'afternoon';
  else if (timeOfDay === 'atardecer') targetSlot = 'evening';
  else if (timeOfDay === 'noche' || timeOfDay === 'madrugada') targetSlot = 'night';

  for (const id in npcWorld.profiles) {
    const profile = npcWorld.profiles[id];
    const slot = profile.schedule.find(s => s.slot === targetSlot);
    if (slot) {
      schedule.push({
        npc: profile.name,
        activity: slot.activity,
        location: slot.location
      });
    }
  }

  return schedule;
}

function translateRelationshipStage(stage: string): string {
  switch (stage) {
    case 'stranger': return 'Desconocido';
    case 'acquaintance': return 'Conocido';
    case 'companion': return 'Compañero';
    case 'trusted': return 'De confianza';
    case 'strong_bond': return 'Vínculo fuerte';
    case 'deep_relationship': return 'Relación profunda';
    default: return 'Indefinido';
  }
}

export function buildNPCPromptContext(
  npcWorld: NPCWorldState,
  relevantNPCs: NPCProfile[],
  activeInitiatives: NPCIntention[],
  timeOfDay: TimeOfDay
): string {
  let context = `[SISTEMA MULTI-AGENTE DE IA: ESTADO DEL MUNDO Y NPCs]\n`;

  // World Events
  if (npcWorld.activeEvents && npcWorld.activeEvents.length > 0) {
    context += `[ACONTECIMIENTOS ACTIVOS EN EL MUNDO]\n`;
    for (const ev of npcWorld.activeEvents) {
      context += `- **${ev.title}** (${ev.location}): ${ev.description}\n`;
    }
    context += `\n`;
  }

  // Active Emergent Quests
  if (npcWorld.activeQuests && npcWorld.activeQuests.length > 0) {
    context += `[MISIONES Y NECESIDADES EMERGENTES DE NPCs]\n`;
    for (const q of npcWorld.activeQuests) {
      context += `- ${q.title}: ${q.description}\n`;
    }
    context += `\n`;
  }

  context += `[NPCs PRESENTES O RELEVANTES EN ESCENA]\n`;

  if (relevantNPCs.length === 0) {
    context += `No hay NPCs principales de los perfiles activos presentes en este momento.\n`;
  } else {
    for (const npc of relevantNPCs) {
      const rinRel = npc.relationships['rin'];
      const relDesc = rinRel ? `Vínculo con Rin: ${translateRelationshipStage(rinRel.stage)} (Confianza: ${Math.round(rinRel.trust * 100)}%)` : 'Sin relación directa';
      const secrets = rinRel?.secrets?.length ? `Secretos que sabe de Rin: ${rinRel.secrets.join(', ')}` : '';
      const mood = npc.emotionState ? `${npc.emotionState.primaryMood} (Valence: ${npc.emotionState.valence}, Arousal: ${npc.emotionState.arousal})` : npc.currentMood;

      context += `- **${npc.name}**: Estado físico: ${npc.physicalState}. Estado emocional: ${mood}. ${relDesc}. ${secrets}\n`;
      
      // Sensory & Memory Recall Context
      if (npc.perceptionState && npc.perceptionState.visibleEntities.length > 0) {
        context += `  (Percibe en escena: ${npc.perceptionState.visibleEntities.join(', ')})\n`;
      }

      const recalled = recallRelevantMemories(npc, 'rin chakra jutsu combate');
      if (recalled.length > 0) {
        context += `  (Memorias relevantes recordadas: ${recalled.map(m => m.event).join(' / ')})\n`;
      }

      if (npc.lastInternalThought) {
        context += `  (Pensamiento interno actual: "${npc.lastInternalThought}")\n`;
      }
      context += `  (Conocimientos activos: ${npc.knowledge.slice(-2).join(' / ')} - IGNORA: ${npc.forbiddenKnowledge.join(', ')})\n`;
    }
  }

  context += `\n[RUTINAS NPC ACTIVAS EN OTROS PUNTOS DE LA ALDEA (${timeOfDay.toUpperCase()})]\n`;
  const routines = getNPCScheduleContext(npcWorld, timeOfDay);
  for (const r of routines) {
    if (!relevantNPCs.some(n => n.name === r.npc)) {
      context += `- ${r.npc} se encuentra en: ${r.location} (Actividad: ${r.activity})\n`;
    }
  }

  context += `\n[INICIATIVAS Y PLANES NPC PENDIENTES (GOAP)]\n`;
  if (activeInitiatives.length === 0) {
    context += `Ninguna por el momento.\n`;
  } else {
    for (const init of activeInitiatives) {
      context += `- Acción propuesta: ${init.action} (Motivación: ${init.motivation}, Urgencia: ${init.urgency})\n`;
    }
  }

  return context;
}

export function runWorldSimulationStep(
  worldState: NPCWorldState,
  atmosphere: CozyAtmosphere,
  sceneParticipants: string[] = [],
  recentEvents: EpisodicEvent[] = []
): NPCWorldState {
  return simulateWorldTick(worldState, atmosphere, sceneParticipants, recentEvents);
}

export function recordRelationshipEvent(
  npcWorld: NPCWorldState,
  event: RelationshipEvent
): NPCWorldState {
  return { ...npcWorld, relationshipEvents: [...npcWorld.relationshipEvents, event] };
}

export function addNPCMemory(
  npcWorld: NPCWorldState,
  npcId: string,
  memory: NPCMemoryEntry
): NPCWorldState {
  const profile = npcWorld.profiles[npcId];
  if (!profile) return npcWorld;

  return {
    ...npcWorld,
    profiles: {
      ...npcWorld.profiles,
      [npcId]: {
        ...profile,
        memories: [...profile.memories, memory]
      }
    }
  };
}

export function updateNPCState(
  npcWorld: NPCWorldState,
  npcId: string,
  updates: Partial<NPCProfile>
): NPCWorldState {
  const profile = npcWorld.profiles[npcId];
  if (!profile) return npcWorld;

  return {
    ...npcWorld,
    profiles: {
      ...npcWorld.profiles,
      [npcId]: { ...profile, ...updates, lastUpdatedTimestamp: Date.now() }
    }
  };
}

export { updateN2NRelationship };
