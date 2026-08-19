import { describe, it, expect } from 'vitest';
import { convertResource } from '../server/simulation/resourceFeedbackEngine';
import { INITIAL_RIN_CHAKRA_STATE } from '../server/simulation/chakraEngine';
import { INITIAL_RIN_PHYSICAL_STATE } from '../server/simulation/stateEngine';

describe('Resource Feedback Engine Tests', () => {
  it('TEST 9: Resource conversion with explicit lossiness', () => {
    const chakra = { ...INITIAL_RIN_CHAKRA_STATE, primaryCurrent: 500 };
    const physical = { ...INITIAL_RIN_PHYSICAL_STATE, staminaCurrent: 50 };

    const { newChakra, newPhysical, result } = convertResource(chakra, physical, {
      sourceType: 'chakra',
      destinationType: 'stamina',
      amount: 40,
      efficiency: 0.8,
      maxSafeConversion: 50,
    });

    expect(result.convertedAmount).toBe(40);
    expect(result.actualReceived).toBe(32); // 40 * 0.8
    expect(result.loss).toBe(8);
    expect(newChakra.primaryCurrent).toBe(460);
    expect(newPhysical.staminaCurrent).toBe(82);
  });

  it('TEST 10: High saturation triggers BACKLASH and negative feedback', () => {
    const chakra = { ...INITIAL_RIN_CHAKRA_STATE, saturationLevel: 85 };
    const physical = { ...INITIAL_RIN_PHYSICAL_STATE, healthCurrent: 100 };

    const { newPhysical, result } = convertResource(chakra, physical, {
      sourceType: 'chakra',
      destinationType: 'health',
      amount: 10,
      efficiency: 0.5,
      maxSafeConversion: 20,
    });

    expect(result.backlashTriggered).toBe(true);
    expect(result.backlashDamage).toBeGreaterThan(0);
    expect(newPhysical.healthCurrent).toBeLessThan(100);
  });
});
