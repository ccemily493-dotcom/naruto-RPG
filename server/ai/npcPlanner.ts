import { NPCIntention, NPCProfile, NPCWorldState } from '../../src/types';
import { getEmotionBehaviorModifiers } from './npcEmotion';
import { evaluateGoalPriorities } from './npcGoals';

/**
 * NPC Planning AI (GOAP / Utility AI)
 * Evaluates world state, goals, emotions, and schedule to pick concrete NPC actions
 * deterministically without requiring an LLM call.
 */

export interface GOAPAction {
  name: string;
  targetLocation?: string;
  targetPerson?: string;
  preconditions: (npc: NPCProfile, world: NPCWorldState) => boolean;
  effect: (npc: NPCProfile, world: NPCWorldState) => Partial<NPCProfile>;
  cost: number;
  urgency: 'low' | 'medium' | 'high';
  motivation: string;
}

export function generateGOAPPlan(
  npc: NPCProfile,
  worldState: NPCWorldState,
  timeOfDay: string
): NPCIntention | null {
  if (!npc.isActive) return null;

  const topGoals = evaluateGoalPriorities(npc);
  const topGoal = topGoals.find((g) => !g.completed);
  const emotionMods = npc.emotionState ? getEmotionBehaviorModifiers(npc.emotionState) : { riskTolerance: 0.5, cooperationBonus: 0, impulsivity: 0.3 };

  // 1. Check if NPC has urgent physical needs (injured/fatigued)
  if (npc.physicalState.toLowerCase().includes('exhausted') || npc.physicalState.toLowerCase().includes('herid')) {
    return {
      action: `Buscar descanso y atención médica en su residencia o hospital de la aldea`,
      motivation: 'Preservación física y recuperación de chakra',
      urgency: 'high',
      createdAt: Date.now(),
    };
  }

  // 2. Schedule & Routine Evaluation
  const currentSlotEntry = npc.schedule.find((s) => {
    if (timeOfDay === 'amanecer' && s.slot === 'dawn') return true;
    if (timeOfDay === 'mañana' && s.slot === 'morning') return true;
    if ((timeOfDay === 'mediodía' || timeOfDay === 'tarde') && s.slot === 'afternoon') return true;
    if (timeOfDay === 'atardecer' && s.slot === 'evening') return true;
    if ((timeOfDay === 'noche' || timeOfDay === 'madrugada') && s.slot === 'night') return true;
    return false;
  });

  // 3. Goal-driven GOAP Action vs Routine Action
  if (topGoal && (!currentSlotEntry || currentSlotEntry.flexible || emotionMods.impulsivity > 0.6)) {
    let actionDesc = `Avanzar en su objetivo: ${topGoal.description}`;
    let targetLoc = npc.currentLocation;

    if (topGoal.category === 'mastery') {
      targetLoc = 'Campo de Entrenamiento 7';
      actionDesc = `Desplazarse a ${targetLoc} para entrenar y perfeccionar su jutsu`;
    } else if (topGoal.category === 'revenge') {
      targetLoc = 'Bosque aledaño / sombras de Konoha';
      actionDesc = `Meditar obsesivamente en soledad en ${targetLoc} sobre el Sello Maldito y su venganza`;
    } else if (topGoal.category === 'relationship') {
      targetLoc = 'Calles comerciales / Ichiraku Ramen';
      actionDesc = `Buscar a sus compañeros cerca de ${targetLoc}`;
    }

    return {
      action: actionDesc,
      target: topGoal.description,
      motivation: `Objetivo activo: ${topGoal.description}`,
      urgency: emotionMods.impulsivity > 0.5 ? 'high' : 'medium',
      createdAt: Date.now(),
    };
  }

  // 4. Default Routine Action
  if (currentSlotEntry) {
    return {
      action: `Rutina (${currentSlotEntry.slot}): ${currentSlotEntry.activity} en ${currentSlotEntry.location}`,
      motivation: 'Rutina diaria',
      urgency: 'low',
      createdAt: Date.now(),
    };
  }

  return null;
}
