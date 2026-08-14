import { NPCRelationshipVector, NPCWorldState, RelationshipEvent, RelationshipStage } from '../../src/types';

/**
 * NPC Social AI & Relationship Graph
 * Manages asymmetric N2N (NPC-to-NPC) relationship dynamics, trust shifts,
 * rivalry evolution, and rumor propagation across the social graph.
 */

export function updateN2NRelationship(
  worldState: NPCWorldState,
  sourceNpcId: string,
  targetNpcId: string,
  delta: {
    trust?: number;
    respect?: number;
    affinity?: number;
    resentment?: number;
    sharedExperience?: string;
    conflict?: string;
    secretLearned?: string;
  },
  chapter?: string
): NPCWorldState {
  const sourceProfile = worldState.profiles[sourceNpcId];
  if (!sourceProfile) return worldState;

  const currentRel: NPCRelationshipVector = sourceProfile.relationships[targetNpcId] || {
    trust: 0.1,
    familiarity: 0.1,
    respect: 0.1,
    affinity: 0.0,
    concern: 0.1,
    admiration: 0.0,
    resentment: 0.0,
    emotionalSignificance: 0.1,
    stage: 'stranger',
    sharedExperiences: [],
    conflicts: [],
    secrets: [],
  };

  const newTrust = Math.max(-1.0, Math.min(1.0, currentRel.trust + (delta.trust || 0)));
  const newRespect = Math.max(-1.0, Math.min(1.0, currentRel.respect + (delta.respect || 0)));
  const newAffinity = Math.max(-1.0, Math.min(1.0, currentRel.affinity + (delta.affinity || 0)));
  const newResentment = Math.max(0.0, Math.min(1.0, currentRel.resentment + (delta.resentment || 0)));

  // Calculate Relationship Stage
  let newStage: RelationshipStage = currentRel.stage;
  if (newTrust >= 0.8 && newAffinity >= 0.7) newStage = 'deep_relationship';
  else if (newTrust >= 0.6) newStage = 'strong_bond';
  else if (newTrust >= 0.4) newStage = 'trusted';
  else if (newTrust >= 0.2) newStage = 'companion';
  else if (newTrust >= 0.0) newStage = 'acquaintance';
  else newStage = 'stranger';

  const updatedRel: NPCRelationshipVector = {
    ...currentRel,
    trust: Math.round(newTrust * 100) / 100,
    respect: Math.round(newRespect * 100) / 100,
    affinity: Math.round(newAffinity * 100) / 100,
    resentment: Math.round(newResentment * 100) / 100,
    stage: newStage,
    sharedExperiences: delta.sharedExperience ? [...currentRel.sharedExperiences, delta.sharedExperience] : currentRel.sharedExperiences,
    conflicts: delta.conflict ? [...currentRel.conflicts, delta.conflict] : currentRel.conflicts,
    secrets: delta.secretLearned ? [...currentRel.secrets, delta.secretLearned] : currentRel.secrets,
    lastInteractionChapter: chapter || currentRel.lastInteractionChapter,
  };

  const relEvent: RelationshipEvent = {
    id: `relevent_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    npc: sourceNpcId,
    target: targetNpcId,
    event: delta.sharedExperience || delta.conflict || 'Interacción social',
    significance: Math.abs(delta.trust || 0.1),
    change: `Confianza: ${newTrust.toFixed(2)}, Vínculo: ${newStage}`,
    memoryCreated: true,
    timestamp: Date.now(),
    chapter,
  };

  return {
    ...worldState,
    profiles: {
      ...worldState.profiles,
      [sourceNpcId]: {
        ...sourceProfile,
        relationships: {
          ...sourceProfile.relationships,
          [targetNpcId]: updatedRel,
        },
      },
    },
    relationshipEvents: [...worldState.relationshipEvents, relEvent],
  };
}
