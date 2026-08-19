import {
  SimulationResult,
  ExperimentOutcome,
  StrategyOutcome,
  IntensityLevel,
  TechniqueDefinition,
  QuantifiedShinobiStats,
  PhysicalStateQuantified,
  CombatStateQuantified,
  EnemyStatsQuantified,
} from '../../src/types';
import { DeterministicRNG } from './DeterministicRNG';
import { ChakraState, consumeChakra, calculateCost } from './chakraEngine';
import { getTechniqueByIdOrName } from './techniqueRegistry';
import { INITIAL_RIN_QUANTIFIED_STATS, INITIAL_RIN_PHYSICAL_STATE, INITIAL_RIN_COMBAT_STATE } from './stateEngine';

export interface ExecuteTechniqueParams {
  techniqueQuery: string;
  intensity?: IntensityLevel;
  targetEnemy?: EnemyStatsQuantified;
  chakraState: ChakraState;
  stats?: QuantifiedShinobiStats;
  physicalState?: PhysicalStateQuantified;
  combatState?: CombatStateQuantified;
  seed?: string;
}

export function executeTechniqueSimulation(params: ExecuteTechniqueParams): SimulationResult {
  const rng = new DeterministicRNG(params.seed || 'seed_rin_default_simulation');
  const stats = params.stats || INITIAL_RIN_QUANTIFIED_STATS;
  const physical = params.physicalState || INITIAL_RIN_PHYSICAL_STATE;
  const combat = params.combatState || INITIAL_RIN_COMBAT_STATE;
  const intensity = params.intensity || 'NORMAL';

  const technique: TechniqueDefinition | undefined = getTechniqueByIdOrName(params.techniqueQuery);

  const emptyBreakdown = {
    skillScore: 0,
    chakraControlBonus: 0,
    experienceBonus: 0,
    concentrationBonus: 0,
    fatiguePenalty: 0,
    injuryPenalty: 0,
    complexityPenalty: 0,
    environmentPenalty: 0,
    masteryModifier: 0,
    intensityModifier: 0,
    compatibilityModifier: 0,
    finalExecutionScore: 0,
    difficultyThreshold: 50,
  };

  // 1. VALIDATION: Technique existence & Known by Rin
  if (!technique || !technique.knownByRin) {
    return {
      success: false,
      degree: 'FAILURE',
      executionQuality: 0,
      chakraSpent: 0,
      staminaSpent: 0,
      vitalityChange: 0,
      healthChange: 0,
      stateChanges: {},
      triggeredEffects: [],
      failures: ['TECNICA_DESCONOCIDA_O_NO_DISPONIBLE'],
      enemyReactionWindowMs: 500,
      seed: rng.seed,
      calculationBreakdown: emptyBreakdown,
    };
  }

  // 2. INTENSITY MULTIPLIERS
  let intensityCostMultiplier = 1.0;
  let intensityPowerMultiplier = 1.0;
  let intensityModifier = 0;

  switch (intensity) {
    case 'MINIMAL':
      intensityCostMultiplier = 0.6;
      intensityPowerMultiplier = 0.5;
      intensityModifier = -10;
      break;
    case 'LOW':
      intensityCostMultiplier = 0.8;
      intensityPowerMultiplier = 0.75;
      intensityModifier = -5;
      break;
    case 'NORMAL':
      intensityCostMultiplier = 1.0;
      intensityPowerMultiplier = 1.0;
      intensityModifier = 0;
      break;
    case 'HIGH':
      intensityCostMultiplier = 1.3;
      intensityPowerMultiplier = 1.25;
      intensityModifier = 5;
      break;
    case 'MAX_SAFE':
      intensityCostMultiplier = 1.6;
      intensityPowerMultiplier = 1.5;
      intensityModifier = 10;
      break;
    case 'OVERLOAD':
      intensityCostMultiplier = 2.2;
      intensityPowerMultiplier = 1.8;
      intensityModifier = 15;
      break;
  }

  // 3. CHAKRA CHECK (HARD BARRIER: chakra.current >= cost)
  const finalCost = calculateCost({
    baseCost: technique.chakraCostBase,
    powerMultiplier: intensityPowerMultiplier,
    complexityMultiplier: technique.complexityMultiplier,
    chakraControl: stats.chakraControl,
    fatigueLevel: physical.fatigueLevel,
    injuriesPenalty: physical.injuriesPenalty,
  });

  const consumeResult = consumeChakra(params.chakraState, finalCost, 'any');

  if (!consumeResult.success) {
    return {
      success: false,
      degree: 'FAILURE',
      executionQuality: 0,
      chakraSpent: 0,
      staminaSpent: 0,
      vitalityChange: 0,
      healthChange: 0,
      stateChanges: {},
      triggeredEffects: [],
      failures: ['CHAKRA_INSUFICIENTE_AGOTAMIENTO_TOTAL'],
      enemyReactionWindowMs: 600,
      seed: rng.seed,
      calculationBreakdown: emptyBreakdown,
    };
  }

  // 4. MASTERY MODIFIER
  let masteryModifier = 0;
  switch (technique.mastery) {
    case 'MASTERED':
      masteryModifier = 20;
      break;
    case 'CONFIRMED':
      masteryModifier = 15;
      break;
    case 'USED':
      masteryModifier = 10;
      break;
    case 'LEARNED':
      masteryModifier = 5;
      break;
    case 'EXPERIMENTAL':
      masteryModifier = -10;
      break;
    case 'STUDIED':
      masteryModifier = -20;
      break;
    case 'KNOWN':
      masteryModifier = -30;
      break;
  }

  // 5. BREAKDOWN & EXECUTION SCORE
  const skillScore = Math.round(stats.chakraControl * 0.4);
  const chakraControlBonus = Math.round(stats.chakraControl * 0.3);
  const experienceBonus = Math.round(stats.combatExperience * 0.2);
  const concentrationBonus = Math.round(physical.concentrationLevel * 0.2);
  const fatiguePenalty = Math.round(physical.fatigueLevel * 0.4);
  const injuryPenalty = Math.round(physical.injuriesPenalty * 0.6);
  const complexityPenalty = Math.round((technique.complexityMultiplier - 1.0) * 20);
  const environmentPenalty = combat.visibilityRating < 50 ? 10 : 0;
  const compatibilityModifier = 5; // Rin Kagehira high compatibility

  // Add deterministic PRNG small fluctuation (-5 to +5)
  const rngFluctuation = rng.nextInt(-5, 5);

  const finalExecutionScore =
    skillScore +
    chakraControlBonus +
    experienceBonus +
    concentrationBonus +
    masteryModifier +
    intensityModifier +
    compatibilityModifier +
    rngFluctuation -
    fatiguePenalty -
    injuryPenalty -
    complexityPenalty -
    environmentPenalty;

  const difficultyThreshold = Math.round(
    60 + (params.targetEnemy ? params.targetEnemy.reaction * 0.2 : 0)
  );

  // STAGE B: Execution Score & Execution Quality Calculation
  let executionQuality = 0;
  const scoreDiff = finalExecutionScore - difficultyThreshold;

  if (scoreDiff >= 20) {
    executionQuality = Math.min(100, 80 + Math.round(scoreDiff * 0.5));
  } else if (scoreDiff >= 0) {
    executionQuality = Math.min(85, 65 + scoreDiff);
  } else {
    executionQuality = Math.max(0, 50 + scoreDiff);
  }

  // STAGE C: Target Reach & Defense Evaluation (Separates Execution from Impact)
  let success = false;
  let degree: ExperimentOutcome | StrategyOutcome = 'FAILURE';
  const failures: string[] = [];

  const targetReaction = params.targetEnemy ? params.targetEnemy.reaction : 50;
  const targetCover = combat.coverLevel;
  const isMovementTechnique =
    technique.id === 'tamushaki' || technique.id === 'tamushaki_inverso' || technique.id === 'raices';

  const attemptedPower = technique.basePower ? technique.basePower * intensityPowerMultiplier : undefined;
  const isOverloadedExceedingSafe =
    attemptedPower !== undefined &&
    technique.maxSafePower !== undefined &&
    attemptedPower > technique.maxSafePower;

  // 1. Check Range Limit
  if (!isMovementTechnique && technique.maxRangeMeters !== undefined && combat.distanceMeters > technique.maxRangeMeters) {
    success = false;
    degree = 'COUNTERED';
    failures.push('OUT_OF_RANGE_OBJETIVO_FUERA_DE_ALCANCE');
  } else if (isOverloadedExceedingSafe || (technique.mastery === 'EXPERIMENTAL' && intensity === 'OVERLOAD')) {
    // Exceeding maxSafePower triggers mandatory instability/backlash regardless of high chakraControl!
    success = false;
    degree = scoreDiff >= 10 ? 'UNSTABLE_SUCCESS' : 'BACKLASH';
    executionQuality = Math.min( executionQuality, 40 );
    failures.push('SOBRECARGA_EXCEDE_CAPACIDAD_SEGURA_RIESGO_BACKLASH');
  } else if (params.targetEnemy && targetReaction >= 90 && targetCover >= 60 && scoreDiff < 35) {
    // High boss-level reaction (>=90) and high cover (>=60) counters/evades unless Rin has overwhelming scoreDiff >= 35!
    success = false;
    degree = 'COUNTERED';
    failures.push('ENEMIGO_EVADIO_O_CONTRARRESTO_GRACIAS_A_COBERTURA_Y_REACCION');
  } else if (scoreDiff >= 20) {
    success = true;
    degree = 'SUCCESS';
  } else if (scoreDiff >= 0) {
    success = true;
    degree = 'SUCCESS';
  } else if (scoreDiff >= -15) {
    success = false;
    degree = technique.mastery === 'EXPERIMENTAL' ? 'UNSTABLE_SUCCESS' : 'PARTIAL_SUCCESS';
    failures.push('EJECUCION_IMPERFECTA_O_DESVIADA');
  } else if (intensity === 'OVERLOAD' || technique.mastery === 'EXPERIMENTAL') {
    success = false;
    degree = 'BACKLASH';
    failures.push('BACKLASH_POR_SOBRECARGA_O_INEXPERIENCIA');
  } else {
    success = false;
    degree = 'FAILURE';
    failures.push('EJECUCION_FALLIDA_POR_DIFICULTAD');
  }

  let backlashText: string | undefined = undefined;
  if (degree === 'BACKLASH') {
    backlashText = `Retroalimentación negativa por sobrecarga de chakra en ${technique.name}. Rin sufre fatiga y distorsión de chakra.`;
  }

  // Cumulative Fatigue Formula: fatigueDelta = Math.round(finalCost / 8) + Math.round(complexity * 2)
  const calculatedFatigueDelta = Math.round(finalCost / 8) + Math.round(technique.complexityMultiplier * 2);

  const newDistance = isMovementTechnique ? Math.max(0, combat.distanceMeters - 20) : combat.distanceMeters;

  const breakdown = {
    skillScore,
    chakraControlBonus,
    experienceBonus,
    concentrationBonus,
    fatiguePenalty,
    injuryPenalty,
    complexityPenalty,
    environmentPenalty,
    masteryModifier,
    intensityModifier,
    compatibilityModifier,
    finalExecutionScore,
    difficultyThreshold,
  };

  return {
    success,
    degree,
    executionQuality,
    chakraSpent: consumeResult.actualPaid,
    staminaSpent: Math.round(finalCost * 0.15),
    vitalityChange: degree === 'BACKLASH' ? -15 : 0,
    healthChange: degree === 'BACKLASH' ? -15 : 0,
    stateChanges: {
      fatigueDelta: degree === 'BACKLASH' ? calculatedFatigueDelta + 15 : calculatedFatigueDelta,
      newDistanceMeters: newDistance,
    },
    triggeredEffects: success ? [`EFECTO_ACTIVO_${technique.id.toUpperCase()}`] : [],
    failures,
    backlash: backlashText,
    enemyReactionWindowMs: success ? 300 : 700,
    seed: rng.seed,
    calculationBreakdown: breakdown,
  };
}
