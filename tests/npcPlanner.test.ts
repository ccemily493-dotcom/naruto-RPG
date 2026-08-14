import { describe, it, expect } from 'vitest';
import { createDefaultNPCWorld } from '../server/npcEngine';
import { generateGOAPPlan } from '../server/ai/npcPlanner';

describe('NPC GOAP / Utility Planner Suite', () => {
  it('should generate goal-oriented actions deterministically without LLM', () => {
    const world = createDefaultNPCWorld();
    const sasuke = world.profiles['sasuke'];

    const plan = generateGOAPPlan(sasuke, world, 'mañana');

    expect(plan).toBeDefined();
    expect(plan?.action).toBeDefined();
    expect(plan?.motivation).toBeDefined();
    expect(['low', 'medium', 'high']).toContain(plan?.urgency);
  });

  it('should prioritize physical recovery when NPC is exhausted or injured', () => {
    const world = createDefaultNPCWorld();
    const naruto = { ...world.profiles['naruto'], physicalState: 'Gravemente herido / Exhausted' };

    const plan = generateGOAPPlan(naruto, world, 'noche');

    expect(plan).toBeDefined();
    expect(plan?.urgency).toBe('high');
    expect(plan?.action.toLowerCase()).toContain('descanso');
  });
});
