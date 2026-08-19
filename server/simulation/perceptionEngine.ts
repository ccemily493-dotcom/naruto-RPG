import { PerceptionResult } from '../../src/types';
import { persistentShinobiState } from './persistentStateManager';

export interface PerceptionQueryParams {
  targetDistanceMeters: number;
  targetChakraActive?: boolean;
  targetOcultacionActive?: boolean;
  lineOfSightBlocked?: boolean;
}

/**
 * Calculates physical perception, visibility, and chakra signature detection deterministically.
 * The AI GM translates this JSON output into somatosensory narrative prose without inventing information.
 */
export function calculateHybridPerception(params: PerceptionQueryParams): PerceptionResult {
  const currentState = persistentShinobiState.getState();
  const activeTurnJutsus = currentState.activeTurnJutsus.map((j) => j.techniqueId.toLowerCase());

  const tercerOjoActive = activeTurnJutsus.includes('tercer_ojo') || activeTurnJutsus.includes('percepcion_remota');
  const ocultacionActive = Boolean(params.targetOcultacionActive);

  // Line of sight and physical distance check
  const distance = params.targetDistanceMeters;
  const visible = !params.lineOfSightBlocked && distance <= 50;

  // Chakra detection confidence calculation
  let confidenceScore = 0.5;

  if (tercerOjoActive) {
    confidenceScore += 0.4;
  }

  if (params.targetChakraActive) {
    confidenceScore += 0.2;
  }

  if (ocultacionActive) {
    confidenceScore -= 0.5;
  }

  confidenceScore = Math.max(0.0, Math.min(1.0, confidenceScore));
  const chakraSignatureDetected = confidenceScore >= 0.4;

  let hint = '';
  if (visible && chakraSignatureDetected) {
    hint = 'Objetivo visible en línea de visión y firma de chakra claramente detectada.';
  } else if (tercerOjoActive && chakraSignatureDetected) {
    hint = 'Tercer Ojo capta una firma tenue de chakra filtrándose a través de la cobertura física.';
  } else if (ocultacionActive && !visible) {
    hint = 'Presencia totalmente oculta. No se percibe vibración de chakra ni contacto visual.';
  } else {
    hint = 'Percepción limitada por distancia o cobertura.';
  }

  return {
    visible,
    chakraSignatureDetected,
    approximateDirection: distance < 20 ? 'cerca / contacto directo' : 'norte / media distancia',
    distanceMeters: distance,
    confidenceScore: Number(confidenceScore.toFixed(2)),
    tercerOjoActive,
    ocultacionActive,
    perceptionProseHint: hint,
  };
}
