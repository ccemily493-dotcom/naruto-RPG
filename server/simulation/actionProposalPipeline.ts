import {
  ActionProposal,
  SimulationResult,
} from '../../src/types';
import { persistentShinobiState } from './persistentStateManager';
import { getTechniqueByIdOrName } from './techniqueRegistry';
import { executeTechniqueSimulation } from './shinobiSimulationEngine';

export interface ProposalPipelineResult {
  proposal: ActionProposal;
  simulationResults: SimulationResult[];
  rejectedReason?: string;
}

/**
 * Validates a proposed action against the physical state of the server.
 * Implements the 4-stage pipeline: PROPOSED -> VALIDATED -> SIMULATED -> RESOLVED / REJECTED.
 */
export function processActionProposalPipeline(proposal: ActionProposal): ProposalPipelineResult {
  const currentState = persistentShinobiState.getState();
  const simulationResults: SimulationResult[] = [];

  // Stage 1 -> Stage 2: PROPOSED -> VALIDATED check
  for (const pAction of proposal.proposedActions) {
    if (!pAction.techniqueId) continue;

    const tech = getTechniqueByIdOrName(pAction.techniqueId);
    if (!tech) {
      proposal.status = 'REJECTED';
      proposal.rejectionReason = `REJECTED: La técnica '${pAction.techniqueId}' no está registrada en el motor.`;
      return { proposal, simulationResults, rejectedReason: proposal.rejectionReason };
    }

    // Physical Validation 1: Cooldown
    const activeCooldown = currentState.combatState.cooldowns[tech.id] || 0;
    if (activeCooldown > 0) {
      proposal.status = 'REJECTED';
      proposal.rejectionReason = `REJECTED: Cooldown activo para '${tech.name}' (${activeCooldown} turnos restantes).`;
      return { proposal, simulationResults, rejectedReason: proposal.rejectionReason };
    }

    // Physical Validation 2: Minimum Chakra Requirement
    const totalChakraAvailable = currentState.chakraState.primaryCurrent + currentState.chakraState.secondaryCurrent;
    const baseCost = tech.chakraCostBase === undefined ? 0 : tech.chakraCostBase;
    if (baseCost > 0 && totalChakraAvailable < baseCost) {
      proposal.status = 'REJECTED';
      proposal.rejectionReason = `REJECTED: Chakra insuficiente. Disponible: ${totalChakraAvailable}, Requerido base: ${baseCost}.`;
      return { proposal, simulationResults, rejectedReason: proposal.rejectionReason };
    }

    // Physical Validation 3: Tactical Range check
    if (tech.effectiveRangeMeters !== undefined && tech.effectiveRangeMeters > 0) {
      const currentDist = currentState.combatState.distanceMeters;
      const maxRange = tech.maxRangeMeters || tech.effectiveRangeMeters;
      if (currentDist > maxRange) {
        proposal.status = 'REJECTED';
        proposal.rejectionReason = `REJECTED: Fuera de rango. Distancia actual: ${currentDist}m, Alcance máximo de ${tech.name}: ${maxRange}m.`;
        return { proposal, simulationResults, rejectedReason: proposal.rejectionReason };
      }
    }
  }

  // Proposal passes physical validation!
  proposal.status = 'VALIDATED';
  proposal.validationDetails = {
    chakraAvailable: true,
    rangeValid: true,
    cooldownValid: true,
    fatigueAcceptable: currentState.physicalState.fatigueLevel < 100,
  };

  // Stage 3 -> Stage 4: SIMULATED -> RESOLVED
  proposal.status = 'SIMULATED';

  for (const pAction of proposal.proposedActions) {
    const tech = pAction.techniqueId ? getTechniqueByIdOrName(pAction.techniqueId) : undefined;
    const techQuery = tech ? tech.name : pAction.actionType;

    const simRes = executeTechniqueSimulation({
      techniqueQuery: techQuery,
      chakraState: currentState.chakraState,
      physicalState: currentState.physicalState,
      combatState: currentState.combatState,
      seed: `${proposal.id}_${pAction.techniqueId || pAction.actionType}`,
    });

    if (tech) {
      persistentShinobiState.applySimulationResult(simRes, tech);
    }

    // Special Movement Handling (e.g. Tamushaki acorta distancia)
    if (pAction.techniqueId === 'tamushaki' || pAction.actionType === 'movement') {
      const newDist = Math.max(0, currentState.combatState.distanceMeters - 20);
      persistentShinobiState.setState({
        combatState: { ...currentState.combatState, distanceMeters: newDist },
      });
    }

    simulationResults.push(simRes);
  }

  proposal.status = 'RESOLVED';
  return { proposal, simulationResults };
}
