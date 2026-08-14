import { NPCEmotionState, NPCProfile } from '../../src/types';

/**
 * NPC Emotion AI
 * Persistent emotional state model (Valence, Arousal, Dominance)
 * that modulates risk tolerance, trust shifts, and mood descriptions.
 */

export function createInitialEmotionState(primaryMood = 'Sereno'): NPCEmotionState {
  return {
    valence: 0.1,
    arousal: 0.3,
    dominance: 0.5,
    primaryMood,
  };
}

export function updateNPCEmotion(
  current: NPCEmotionState | undefined,
  impact: { valenceDelta?: number; arousalDelta?: number; dominanceDelta?: number; eventDescription?: string }
): NPCEmotionState {
  const base = current || createInitialEmotionState();

  const valence = Math.max(-1.0, Math.min(1.0, base.valence + (impact.valenceDelta || 0)));
  const arousal = Math.max(0.0, Math.min(1.0, base.arousal + (impact.arousalDelta || 0)));
  const dominance = Math.max(0.0, Math.min(1.0, base.dominance + (impact.dominanceDelta || 0)));

  let primaryMood = 'Sereno';
  if (valence < -0.5 && arousal > 0.6) primaryMood = 'Furiose / Agitado';
  else if (valence < -0.3 && arousal <= 0.4) primaryMood = 'Melancólico / Sombrío';
  else if (arousal > 0.7 && dominance > 0.6) primaryMood = 'Entusiasmado / Dominante';
  else if (arousal > 0.7 && dominance < 0.4) primaryMood = 'Ansioso / Alerta';
  else if (valence > 0.4 && arousal < 0.5) primaryMood = 'Tranquilo / Satisfecho';
  else if (valence < 0.0) primaryMood = 'Tenso';

  return {
    valence: Math.round(valence * 100) / 100,
    arousal: Math.round(arousal * 100) / 100,
    dominance: Math.round(dominance * 100) / 100,
    primaryMood,
  };
}

export function getEmotionBehaviorModifiers(emotion: NPCEmotionState): {
  riskTolerance: number;   // 0.0 (cowardly) to 1.0 (reckless)
  cooperationBonus: number; // -0.5 to +0.5
  impulsivity: number;      // 0.0 to 1.0
} {
  const riskTolerance = Math.max(0, Math.min(1, 0.5 + emotion.dominance * 0.3 + emotion.arousal * 0.2 - (emotion.valence < 0 ? 0.2 : 0)));
  const cooperationBonus = Math.max(-0.5, Math.min(0.5, emotion.valence * 0.4 + (1 - emotion.arousal) * 0.1));
  const impulsivity = Math.max(0, Math.min(1, emotion.arousal * 0.7 + (1 - emotion.dominance) * 0.3));

  return { riskTolerance, cooperationBonus, impulsivity };
}
