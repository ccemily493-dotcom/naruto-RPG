import { describe, it, expect } from 'vitest';
import { createDefaultNPCWorld } from '../server/npcEngine';
import { updateN2NRelationship } from '../server/ai/npcSocialGraph';

describe('NPC N2N Social Graph Suite', () => {
  it('should update asymmetric relationships between NPCs', () => {
    const world = createDefaultNPCWorld();

    const updated = updateN2NRelationship(
      world,
      'naruto',
      'sasuke',
      { trust: 0.2, respect: 0.1, sharedExperience: 'Entrenamiento conjunto en Campo 7' },
      'Capítulo 3'
    );

    const narutoViewOfSasuke = updated.profiles['naruto'].relationships['sasuke'];

    expect(narutoViewOfSasuke).toBeDefined();
    expect(narutoViewOfSasuke.trust).toBeGreaterThan(world.profiles['naruto'].relationships['sasuke'].trust);
    expect(narutoViewOfSasuke.sharedExperiences).toContain('Entrenamiento conjunto en Campo 7');
    expect(updated.relationshipEvents.length).toBeGreaterThan(world.relationshipEvents.length);
  });
});
