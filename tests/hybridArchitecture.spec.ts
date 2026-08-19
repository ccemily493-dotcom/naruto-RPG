import { describe, it, expect, beforeEach } from 'vitest';
import { extractActionProposalFromText } from '../server/ai/intentExtractor';
import { processActionProposalPipeline } from '../server/simulation/actionProposalPipeline';
import { calculateHybridPerception } from '../server/simulation/perceptionEngine';
import { persistentShinobiState } from '../server/simulation/persistentStateManager';

describe('Hybrid Architecture: ActionProposal Pipeline & Perception Engine', () => {
  beforeEach(() => {
    persistentShinobiState.resetToDefault();
  });

  it('1. AI Intent Extractor decomposes multi-action strategy into sequential proposed actions', () => {
    const rawText = 'Activo Ocultación de presencia, me acerco usando Tamushaki y lanzo Raíces contra el enemigo.';
    const proposal = extractActionProposalFromText(rawText);

    expect(proposal.status).toBe('PROPOSED');
    expect(proposal.proposedActions.length).toBeGreaterThanOrEqual(2);
    expect(proposal.proposedActions.some((a) => a.techniqueId === 'ocultacion_de_presencia')).toBe(true);
    expect(proposal.proposedActions.some((a) => a.techniqueId === 'tamushaki')).toBe(true);
  });

  it('2. ActionProposal Pipeline advances PROPOSED -> VALIDATED -> SIMULATED -> RESOLVED for valid actions', () => {
    const proposal = extractActionProposalFromText('Mokubunshin');
    const result = processActionProposalPipeline(proposal);

    expect(result.proposal.status).toBe('RESOLVED');
    expect(result.proposal.validationDetails?.chakraAvailable).toBe(true);
    expect(result.simulationResults.length).toBe(1);
    expect(result.simulationResults[0].success).toBe(true);
  });

  it('3. ActionProposal Pipeline REJECTS proposal if chakra is insufficient or cooldown active', () => {
    // Force chakra to 0
    persistentShinobiState.setState({
      chakraState: { primaryCurrent: 0, primaryMax: 1000, secondaryCurrent: 0, secondaryMax: 300, saturationLevel: 0 },
    });

    const proposal = extractActionProposalFromText('Chidori');
    const result = processActionProposalPipeline(proposal);

    expect(result.proposal.status).toBe('REJECTED');
    expect(result.rejectedReason).toContain('Chakra insuficiente');
  });

  it('4. ActionProposal Pipeline REJECTS proposal if target distance exceeds maxRangeMeters', () => {
    // Set distance to 100 meters (Chidori max range is 15m)
    persistentShinobiState.setState({
      combatState: { ...persistentShinobiState.getState().combatState, distanceMeters: 100 },
    });

    const proposal = extractActionProposalFromText('Chidori');
    const result = processActionProposalPipeline(proposal);

    expect(result.proposal.status).toBe('REJECTED');
    expect(result.rejectedReason).toContain('Fuera de rango');
  });

  it('5. PerceptionEngine calculates visibility, Tercer Ojo detection, and Ocultacion deterministically', () => {
    // Test case 1: Target at 15m, line of sight clear, target chakra active
    const p1 = calculateHybridPerception({
      targetDistanceMeters: 15,
      targetChakraActive: true,
      lineOfSightBlocked: false,
    });
    expect(p1.visible).toBe(true);
    expect(p1.chakraSignatureDetected).toBe(true);

    // Test case 2: Target behind wall, but Tercer Ojo is active
    persistentShinobiState.setState({
      activeTurnJutsus: [{ techniqueId: 'tercer_ojo', name: 'Tercer Ojo', turnsActive: 1, maintenanceCost: 2 }],
    });

    const p2 = calculateHybridPerception({
      targetDistanceMeters: 10,
      targetChakraActive: true,
      lineOfSightBlocked: true,
    });
    expect(p2.visible).toBe(false);
    expect(p2.tercerOjoActive).toBe(true);
    expect(p2.chakraSignatureDetected).toBe(true);
  });
});
