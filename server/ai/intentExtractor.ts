import { ActionProposal, ProposedAction } from '../../src/types';
import { RIN_MASTER_TECHNIQUES } from '../simulation/techniqueRegistry';

/**
 * Extracts action proposals from raw user text or player input.
 * Decomposes multi-action strategies into sequential ProposedActions.
 */
export function extractActionProposalFromText(playerText: string): ActionProposal {
  const text = playerText.toLowerCase().trim();
  const proposedActions: ProposedAction[] = [];
  const assumptions: string[] = [];

  // Match known techniques in text
  for (const tech of RIN_MASTER_TECHNIQUES) {
    const techName = tech.name.toLowerCase();
    const techId = tech.id.toLowerCase();

    if (
      text.includes(techName) ||
      text.includes(techId) ||
      (tech.id === 'raices' && text.includes('raíces')) ||
      (tech.id === 'ocultacion_de_presencia' && text.includes('ocultación'))
    ) {
      if (!proposedActions.some((a) => a.techniqueId === tech.id)) {
        proposedActions.push({
          techniqueId: tech.id,
          actionType: tech.category.toLowerCase().includes('taijutsu') ? 'taiJutsu' : 'jutsu',
          tacticalGoal: `Ejecutar ${tech.name}`,
        });
      }
    }
  }

  // Detect implicit movement/desplazamiento intents
  if (text.includes('acercar') || text.includes('aproximar') || text.includes('correr hacia')) {
    if (!proposedActions.some((a) => a.techniqueId === 'tamushaki')) {
      proposedActions.push({
        actionType: 'movement',
        targetPositionMeters: 5,
        tacticalGoal: 'Reducir distancia táctica',
      });
    }
  }

  // Default fallback if no specific jutsu keyword match
  if (proposedActions.length === 0) {
    proposedActions.push({
      actionType: 'special',
      tacticalGoal: playerText,
    });
  }

  return {
    id: `prop_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
    actor: 'rin',
    intentDescription: playerText,
    proposedActions,
    claimedAssumptions: assumptions,
    status: 'PROPOSED',
  };
}
