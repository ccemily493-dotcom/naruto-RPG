import { NPCGoalItem, NPCProfile } from '../../src/types';

/**
 * NPC Goal AI
 * Manages active goals, subgoals, priority stacks, and completion status.
 */

export function buildDefaultGoalStack(npc: NPCProfile): NPCGoalItem[] {
  if (npc.goalStack && npc.goalStack.length > 0) {
    return npc.goalStack;
  }

  const stack: NPCGoalItem[] = [];

  // Convert string goals into structured GoalItems
  (npc.goals || []).forEach((gStr, index) => {
    let category: NPCGoalItem['category'] = 'duty';
    const lower = gStr.toLowerCase();

    if (lower.includes('vengar') || lower.includes('matar') || lower.includes('itachi')) category = 'revenge';
    else if (lower.includes('hokage') || lower.includes('mejorar') || lower.includes('jutsu') || lower.includes('poder')) category = 'mastery';
    else if (lower.includes('amigo') || lower.includes('cita') || lower.includes('traer')) category = 'relationship';
    else if (lower.includes('sobrevivir') || lower.includes('proteger')) category = 'survival';

    stack.push({
      id: `goal_${npc.id}_${index}`,
      description: gStr,
      category,
      priority: 10 - index,
      completed: false,
    });
  });

  return stack;
}

export function evaluateGoalPriorities(npc: NPCProfile): NPCGoalItem[] {
  const stack = buildDefaultGoalStack(npc);

  // If injured/fatigued, survival becomes priority 10
  if (npc.physicalState.toLowerCase().includes('herid') || npc.physicalState.toLowerCase().includes('fatig')) {
    stack.forEach((g) => {
      if (g.category === 'survival') g.priority = 10;
    });
  }

  // Sort descending by priority
  return stack.sort((a, b) => b.priority - a.priority);
}
