import { NPCWorldState, QuestItem } from '../../src/types';

/**
 * Quest AI
 * Generates emergent quests deriving from real NPC goals, faction mandates,
 * and unresolved world events.
 */

export function generateEmergentQuests(worldState: NPCWorldState): QuestItem[] {
  const quests: QuestItem[] = [];

  for (const id in worldState.profiles) {
    const npc = worldState.profiles[id];
    if (!npc.goals || npc.goals.length === 0) continue;

    // Turn top goal into an emergent quest if appropriate
    const topGoal = npc.goals[0];
    if (topGoal.toLowerCase().includes('ramen') || topGoal.toLowerCase().includes('cita')) continue;

    quests.push({
      id: `quest_${npc.id}_${Date.now()}`,
      title: `Petición de ${npc.name}: ${topGoal}`,
      description: `${npc.name} busca apoyo para avanzar en su objetivo: "${topGoal}".`,
      issuedBy: npc.id,
      targetTarget: npc.currentLocation,
      reward: 'Aumento de confianza y afinidad relacional',
      status: 'active',
      createdAt: Date.now(),
    });
  }

  return quests.slice(0, 3); // Max 3 active emergent quests
}
