import { describe, it, expect } from 'vitest';
import {
  INITIAL_RIN_CHAKRA_STATE,
  consumeChakra,
  restoreChakra,
  absorbChakra,
  transferChakra,
  calculateCost,
} from '../server/simulation/chakraEngine';

describe('Chakra Simulation Engine Tests', () => {
  it('TEST 1: Chakra nunca es negativo (Hard Barrier current >= 0)', () => {
    const state = { ...INITIAL_RIN_CHAKRA_STATE, primaryCurrent: 50 };
    const result = consumeChakra(state, 100, 'primary');

    expect(result.success).toBe(false);
    expect(result.newState.primaryCurrent).toBe(50); // Untouched because failed
    expect(result.newState.primaryCurrent).toBeGreaterThanOrEqual(0);
  });

  it('TEST 2: Chakra máximo nunca es excedido en restauración', () => {
    const state = { ...INITIAL_RIN_CHAKRA_STATE, primaryCurrent: 950 };
    const { newState, actualRestored, overflow } = restoreChakra(state, 100, 'primary');

    expect(newState.primaryCurrent).toBe(1000);
    expect(actualRestored).toBe(50);
    expect(overflow).toBe(50);
  });

  it('TEST 3: Segundo flujo funciona como circuito independiente', () => {
    const state = { ...INITIAL_RIN_CHAKRA_STATE, primaryCurrent: 100, secondaryCurrent: 250 };
    const result = consumeChakra(state, 50, 'secondary');

    expect(result.success).toBe(true);
    expect(result.newState.secondaryCurrent).toBe(200);
    expect(result.newState.primaryCurrent).toBe(100);
  });

  it('TEST 4 & 5: Absorción de chakra y efecto de resistencia del objetivo', () => {
    const state = { ...INITIAL_RIN_CHAKRA_STATE, primaryCurrent: 500 };

    const absLowRes = absorbChakra(state, 200, {
      extractionPower: 0.8,
      contactFactor: 1.0,
      rinControl: 90,
      targetResistance: 10,
      destination: 'primary',
    });

    const absHighRes = absorbChakra(state, 200, {
      extractionPower: 0.8,
      contactFactor: 1.0,
      rinControl: 90,
      targetResistance: 80,
      destination: 'primary',
    });

    expect(absLowRes.result.actualAbsorbed).toBeGreaterThan(absHighRes.result.actualAbsorbed);
  });

  it('TEST 6 & 7: Overflow y Saturación al absorber cerca de la capacidad máxima', () => {
    const state = { ...INITIAL_RIN_CHAKRA_STATE, primaryCurrent: 980, secondaryCurrent: 290, mokutonNetworkCurrent: 1300 };

    const { newState, result } = absorbChakra(state, 300, {
      extractionPower: 1.0,
      contactFactor: 1.0,
      rinControl: 90,
      targetResistance: 0,
      destination: 'primary',
    });

    expect(result.overflow).toBeGreaterThan(0);
    expect(result.saturationDelta).toBeGreaterThan(0);
    expect(newState.saturationLevel).toBeGreaterThan(0);
  });

  it('TEST 8: Transferencia de chakra a un aliado con pérdidas de eficiencia', () => {
    const state = { ...INITIAL_RIN_CHAKRA_STATE, primaryCurrent: 500 };
    const { newState, result } = transferChakra(state, 100, 0.85);

    expect(result.rinCostPaid).toBe(100);
    expect(result.effectiveTransfer).toBe(85);
    expect(result.transferLoss).toBe(15);
    expect(newState.secondaryCurrent).toBe(200);
    expect(newState.primaryCurrent).toBe(500);
  });

  it('TEST 20: Chakra insuficiente impide la ejecución', () => {
    const state = { ...INITIAL_RIN_CHAKRA_STATE, primaryCurrent: 10, secondaryCurrent: 0 };
    const result = consumeChakra(state, 50, 'any');

    expect(result.success).toBe(false);
  });

  it('TEST 29 & 30: Recuperación de chakra tiene límites y no permite bucle infinito', () => {
    let state = { ...INITIAL_RIN_CHAKRA_STATE, primaryCurrent: 900 };

    // Attempt restoring 500 5 times
    for (let i = 0; i < 5; i++) {
      const res = restoreChakra(state, 500, 'primary');
      state = res.newState;
    }

    expect(state.primaryCurrent).toBe(1000);
  });
});
