import {
  QuantifiedShinobiStats,
  PhysicalStateQuantified,
  CombatStateQuantified,
  EnemyStatsQuantified,
} from '../../src/types';

export type {
  QuantifiedShinobiStats,
  PhysicalStateQuantified,
  CombatStateQuantified,
  EnemyStatsQuantified,
};

/**
 * Initial Quantified Stats for Rin Kagehira at start of Shippuden
 * Backed by 3 years of training with Itachi & Orochimaru via Ataúd Divino
 */
export const INITIAL_RIN_QUANTIFIED_STATS: QuantifiedShinobiStats = {
  chakraControl: 88,
  precision: 85,
  concentration: 85,
  perception: 90,
  reactionSpeed: 82,
  coordination: 80,
  physicalPower: 65,
  physicalSpeed: 75,
  physicalEndurance: 70,
  mentalEndurance: 85,
  adaptability: 85,
  analysis: 92,
  combatExperience: 78,
  technicalKnowledge: 90,
  mokutonAffinity: 85,
  yinAffinity: 88,
  yinYangAffinity: 75,
};

export const INITIAL_RIN_PHYSICAL_STATE: PhysicalStateQuantified = {
  healthCurrent: 100,
  healthMax: 100,
  staminaCurrent: 100,
  staminaMax: 100,
  fatigueLevel: 0,
  painPenalty: 0,
  injuriesPenalty: 0,
  mobilityRating: 100,
  concentrationLevel: 100,
  chakraControlRating: 88,
  stressLevel: 10,
  bodyDamage: 0,
  chakraDistortion: 0,
};

export const INITIAL_RIN_COMBAT_STATE: CombatStateQuantified = {
  position: { x: 0, y: 0, z: 0 },
  distanceMeters: 10,
  heightMeters: 0,
  velocityMetersPerSec: 0,
  facingDirection: 'frontal',
  visibilityRating: 100,
  terrainType: 'bosque_templado',
  coverLevel: 20,
  activeEffects: [],
  activeJutsu: [],
  cooldowns: {},
  initiativeScore: 75,
  reactionWindowMs: 400,
};

/**
 * Creates default quantifiable enemy stats for combat resolution
 */
export function createEnemyStats(
  name: string,
  overrides?: Partial<EnemyStatsQuantified>
): EnemyStatsQuantified {
  return {
    name,
    health: 100,
    maxHealth: 100,
    chakra: 100,
    maxChakra: 100,
    stamina: 100,
    speed: 70,
    reaction: 70,
    perception: 70,
    chakraControl: 70,
    techniqueMastery: 70,
    knowledgeOfRin: 30,
    injuries: 0,
    fatigue: 0,
    activeEffects: [],
    ...overrides,
  };
}

/**
 * Updates physical state with fatigue, damage, and injuries penalties
 */
export function updatePhysicalState(
  state: PhysicalStateQuantified,
  delta: Partial<PhysicalStateQuantified>
): PhysicalStateQuantified {
  const s = { ...state, ...delta };

  s.healthCurrent = Math.max(0, Math.min(s.healthMax, s.healthCurrent));
  s.staminaCurrent = Math.max(0, Math.min(s.staminaMax, s.staminaCurrent));
  s.fatigueLevel = Math.max(0, Math.min(100, s.fatigueLevel));
  s.painPenalty = Math.max(0, Math.min(50, s.painPenalty));
  s.injuriesPenalty = Math.max(0, Math.min(50, s.injuriesPenalty));

  // Dynamic calculation of concentration & control ratings based on fatigue/injuries
  s.concentrationLevel = Math.max(
    10,
    Math.round(100 - s.fatigueLevel * 0.4 - s.painPenalty * 0.5)
  );

  s.chakraControlRating = Math.max(
    20,
    Math.round(INITIAL_RIN_QUANTIFIED_STATS.chakraControl - s.fatigueLevel * 0.3 - s.injuriesPenalty * 0.4)
  );

  return s;
}
