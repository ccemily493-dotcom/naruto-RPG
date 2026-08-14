import { NPCCombatState, NPCProfile, NPCWorldState } from '../../src/types';

/**
 * NPC Combat AI
 * Autonomous combat decision engine.
 * Allows NPCs to fight, defend, cooperate, and retreat independently of Rin.
 */

export interface TacticalCombatDecision {
  action: 'jutsu' | 'taijutsu' | 'defend' | 'cooperate' | 'retreat';
  jutsuName?: string;
  target: string;
  rationale: string;
  chakraCost: number;
}

export function evaluateNPCCombatTactics(
  npc: NPCProfile,
  opponents: string[],
  allies: string[],
  worldState: NPCWorldState
): TacticalCombatDecision {
  const combat: NPCCombatState = npc.combatState || {
    hp: 100,
    maxHp: 100,
    chakra: 100,
    maxChakra: 100,
    fatigue: 10,
    stance: 'balanced' as any,
  };

  const primaryTarget = opponents[0] || 'Enemigo hostil';
  const primaryAlly = allies.find((a) => a.toLowerCase() !== npc.name.toLowerCase());

  // 1. Check for Tactical Retreat (low HP or exhausted chakra)
  if (combat.hp < 25 || combat.chakra < 10) {
    return {
      action: 'retreat',
      target: primaryTarget,
      rationale: `${npc.name} se encuentra gravemente herido o sin chakra. Realiza una maniobra de retirada táctica usando bombas de humo.`,
      chakraCost: 5,
    };
  }

  // 2. Defensive Stance / Cooperation if ally is under heavy pressure
  if (primaryAlly && combat.stance === 'defensive') {
    return {
      action: 'cooperate',
      target: primaryAlly,
      rationale: `${npc.name} proporciona cobertura táctica a ${primaryAlly} usando posición defensiva.`,
      chakraCost: 10,
    };
  }

  // 3. Jutsu Strike based on NPC profile & available chakra
  if (combat.chakra >= 25 && npc.knowledge && npc.knowledge.length > 0) {
    const knownJutsu = npc.knowledge.find((k) => k.toLowerCase().includes('jutsu') || k.toLowerCase().includes('rasengan') || k.toLowerCase().includes('katon') || k.toLowerCase().includes('chidori')) || npc.knowledge[0];

    return {
      action: 'jutsu',
      jutsuName: knownJutsu,
      target: primaryTarget,
      rationale: `${npc.name} canaliza su chakra y desata ${knownJutsu} contra ${primaryTarget}.`,
      chakraCost: 25,
    };
  }

  // 4. Fallback Taijutsu Strike
  return {
    action: 'taijutsu',
    target: primaryTarget,
    rationale: `${npc.name} ejecuta una serie de golpes de taijutsu rápido a corta distancia contra ${primaryTarget}.`,
    chakraCost: 0,
  };
}
