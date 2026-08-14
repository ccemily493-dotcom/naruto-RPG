import { NPCIntention, NPCProfile, NPCWorldState } from '../../src/types';

/**
 * Group / Team AI
 * Coordinates squads (Team 7, ANBU patrols, Orochimaru scouts)
 * so NPCs execute synchronized team actions.
 */

export interface TeamSquad {
  id: string;
  name: string;
  leaderId: string;
  memberIds: string[];
  currentFormation: 'line' | 'wedge' | 'recon' | 'defensive_circle';
  sharedObjective: string;
}

export const CANONICAL_SQUADS: TeamSquad[] = [
  {
    id: 'team7',
    name: 'Equipo 7 (Kakashi, Naruto, Sasuke, Sakura)',
    leaderId: 'kakashi',
    memberIds: ['naruto', 'sasuke', 'sakura'],
    currentFormation: 'wedge',
    sharedObjective: 'Entrenamiento de equipo y misiones de Konoha',
  },
];

export function evaluateTeamCoordination(
  squad: TeamSquad,
  worldState: NPCWorldState
): NPCIntention[] {
  const intentions: NPCIntention[] = [];
  const leader = worldState.profiles[squad.leaderId];

  if (leader && leader.isPresent) {
    intentions.push({
      action: `Coordinación del ${squad.name}: ${leader.name} da instrucciones tácticas en formación ${squad.currentFormation}`,
      motivation: squad.sharedObjective,
      urgency: 'medium',
      createdAt: Date.now(),
    });
  }

  return intentions;
}
