import { describe, it, expect } from 'vitest';
import { createDefaultNPCWorld, runWorldSimulationStep } from '../server/npcEngine';
import { CozyAtmosphere } from '../src/types';

describe('Multi-Agent World Simulation Suite', () => {
  it('should advance world tick and update NPC routines off-screen', () => {
    const initialWorld = createDefaultNPCWorld();
    const atmosphere: CozyAtmosphere = {
      timeOfDay: 'mañana',
      weather: 'despejado',
      locationName: 'Aldea Oculta de la Hoja',
      moodDescription: 'Tranquilo',
      acousticDetails: '',
    };

    const simulated = runWorldSimulationStep(initialWorld, atmosphere, ['Naruto Uzumaki']);

    expect(simulated).toBeDefined();
    expect(simulated.profiles['naruto']).toBeDefined();
    expect(simulated.profiles['naruto'].emotionState).toBeDefined();
    expect(simulated.profiles['naruto'].perceptionState).toBeDefined();
    expect(simulated.profiles['naruto'].intentions.length).toBeGreaterThan(0);
    expect(simulated.lastEvaluatedTimestamp).toBeGreaterThan(0);
  });

  it('should generate emergent events and quests over ticks', () => {
    const world = createDefaultNPCWorld();
    const atmosphere: CozyAtmosphere = {
      timeOfDay: 'tarde',
      weather: 'lluvia_suave',
      locationName: 'Campo de Entrenamiento 7',
      moodDescription: 'Tenso',
      acousticDetails: '',
    };

    const simulated = runWorldSimulationStep(world, atmosphere);

    expect(simulated.activeQuests).toBeDefined();
    expect(Array.isArray(simulated.activeQuests)).toBe(true);
  });
});
