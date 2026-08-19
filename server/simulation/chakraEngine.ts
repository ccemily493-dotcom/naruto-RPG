/**
 * Chakra Simulation Engine
 * Manages Rin's Primary Chakra (1000 max), Secondary Flow (300 max), and Mokuton Network.
 * Hard Rule: current chakra NEVER < 0.
 * Near capacity absorption triggers overflow / saturation / backlash (never disappears silently).
 */

export interface ChakraState {
  primaryCurrent: number;
  primaryMax: number;
  secondaryCurrent: number;
  secondaryMax: number;
  mokutonNetworkCapacity: number;
  mokutonNetworkCurrent: number;
  flowState: 'balanced' | 'draining' | 'absorbing' | 'overcharged';
  saturationLevel: number; // 0 - 100
}

export interface ChakraCostParams {
  baseCost: number | undefined; // UNSET allowed
  powerMultiplier: number;
  complexityMultiplier: number;
  chakraControl: number; // 0-100
  fatigueLevel: number; // 0-100
  injuriesPenalty: number;
  maintenanceTurns?: number;
}

export interface AbsorptionResult {
  actualAbsorbed: number;
  primaryRestored: number;
  secondaryRestored: number;
  mokutonStored: number;
  overflow: number;
  saturationDelta: number;
  backlashDamage: number;
  targetResistanceEffect: number;
}

export interface TransferResult {
  requestedAmount: number;
  effectiveTransfer: number;
  transferLoss: number;
  rinCostPaid: number;
}

export const INITIAL_RIN_CHAKRA_STATE: ChakraState = {
  primaryCurrent: 1000,
  primaryMax: 1000,
  secondaryCurrent: 300,
  secondaryMax: 300,
  mokutonNetworkCapacity: 1300,
  mokutonNetworkCurrent: 0,
  flowState: 'balanced',
  saturationLevel: 0,
};

/**
 * Calculates final cost of a technique based on real state variables.
 * Enforces maximum control discount of 25% (control / 400).
 */
export function calculateCost(params: ChakraCostParams): number {
  if (params.baseCost === undefined) {
    return 0; // UNSET base cost defaults to 0 extra
  }

  // Max 25% discount for control (control = 100 -> 0.25 discount; Rin control = 88 -> 0.22 discount)
  const controlDiscount = Math.min(0.25, params.chakraControl / 400);
  const fatiguePenalty = params.fatigueLevel * 0.25;
  const injuryPenalty = params.injuriesPenalty * 0.35;

  const rawCost =
    params.baseCost *
    (1 - controlDiscount) *
    params.powerMultiplier *
    params.complexityMultiplier;

  const finalCost = Math.max(1, Math.round(rawCost + fatiguePenalty + injuryPenalty));
  return finalCost;
}

/**
 * Calculates per-turn maintenance cost
 */
export function calculateMaintenance(baseMaintenance?: number, turns = 1): number {
  if (!baseMaintenance) return 0;
  return Math.max(1, Math.round(baseMaintenance * turns));
}

/**
 * Consumes chakra from specified circuit (primary or secondary)
 * Enforces HARD RULE: current >= 0
 */
export function consumeChakra(
  state: ChakraState,
  amount: number,
  sourceCircuit: 'primary' | 'secondary' | 'any' = 'primary'
): { newState: ChakraState; success: boolean; actualPaid: number } {
  const s = { ...state };

  if (sourceCircuit === 'secondary') {
    if (s.secondaryCurrent >= amount) {
      s.secondaryCurrent -= amount;
      return { newState: s, success: true, actualPaid: amount };
    }
    return { newState: s, success: false, actualPaid: 0 };
  }

  if (sourceCircuit === 'primary') {
    if (s.primaryCurrent >= amount) {
      s.primaryCurrent -= amount;
      return { newState: s, success: true, actualPaid: amount };
    }
    return { newState: s, success: false, actualPaid: 0 };
  }

  // Any circuit: try secondary first, then primary
  let remainingNeeded = amount;
  let paidSecondary = 0;
  let paidPrimary = 0;

  if (s.secondaryCurrent > 0) {
    paidSecondary = Math.min(s.secondaryCurrent, remainingNeeded);
    s.secondaryCurrent -= paidSecondary;
    remainingNeeded -= paidSecondary;
  }

  if (remainingNeeded > 0 && s.primaryCurrent >= remainingNeeded) {
    paidPrimary = remainingNeeded;
    s.primaryCurrent -= paidPrimary;
    remainingNeeded = 0;
  }

  if (remainingNeeded === 0) {
    return { newState: s, success: true, actualPaid: amount };
  }

  // Insufficient chakra -> revert
  return { newState: state, success: false, actualPaid: 0 };
}

/**
 * Restores chakra with strict max capacity cap
 */
export function restoreChakra(
  state: ChakraState,
  amount: number,
  targetCircuit: 'primary' | 'secondary' = 'primary'
): { newState: ChakraState; actualRestored: number; overflow: number } {
  const s = { ...state };

  if (targetCircuit === 'secondary') {
    const freeSpace = s.secondaryMax - s.secondaryCurrent;
    const restored = Math.min(freeSpace, Math.max(0, amount));
    const overflow = Math.max(0, amount - freeSpace);
    s.secondaryCurrent += restored;
    return { newState: s, actualRestored: restored, overflow };
  }

  const freeSpace = s.primaryMax - s.primaryCurrent;
  const restored = Math.min(freeSpace, Math.max(0, amount));
  const overflow = Math.max(0, amount - freeSpace);
  s.primaryCurrent += restored;
  return { newState: s, actualRestored: restored, overflow };
}

/**
 * Calculates chakra absorption considering target resistance and capacity limits.
 * Excess chakra beyond storage capacity creates overflow, saturation, or backlash.
 */
export function absorbChakra(
  state: ChakraState,
  rawTargetChakra: number,
  params: {
    extractionPower: number; // 0-1.0
    contactFactor: number; // 0-1.0
    rinControl: number; // 0-100
    targetResistance: number; // 0-100
    destination: 'primary' | 'secondary' | 'mokuton';
  }
): { newState: ChakraState; result: AbsorptionResult } {
  const s = { ...state };

  const resistanceFactor = Math.max(0.1, 1 - params.targetResistance / 100);
  const controlFactor = Math.min(1.5, 0.5 + params.rinControl / 100);

  const potentialAbsorbed = Math.round(
    rawTargetChakra *
      params.extractionPower *
      params.contactFactor *
      resistanceFactor *
      controlFactor
  );

  let primaryRestored = 0;
  let secondaryRestored = 0;
  let mokutonStored = 0;
  let overflow = 0;

  if (params.destination === 'primary') {
    const pSpace = s.primaryMax - s.primaryCurrent;
    primaryRestored = Math.min(pSpace, potentialAbsorbed);
    let remaining = potentialAbsorbed - primaryRestored;

    if (remaining > 0) {
      const sSpace = s.secondaryMax - s.secondaryCurrent;
      secondaryRestored = Math.min(sSpace, remaining);
      remaining -= secondaryRestored;
    }

    if (remaining > 0) {
      const mSpace = s.mokutonNetworkCapacity - s.mokutonNetworkCurrent;
      mokutonStored = Math.min(mSpace, remaining);
      remaining -= mokutonStored;
    }
    overflow = remaining;
  } else if (params.destination === 'secondary') {
    const sSpace = s.secondaryMax - s.secondaryCurrent;
    secondaryRestored = Math.min(sSpace, potentialAbsorbed);
    let remaining = potentialAbsorbed - secondaryRestored;

    if (remaining > 0) {
      const pSpace = s.primaryMax - s.primaryCurrent;
      primaryRestored = Math.min(pSpace, remaining);
      remaining -= primaryRestored;
    }

    if (remaining > 0) {
      const mSpace = s.mokutonNetworkCapacity - s.mokutonNetworkCurrent;
      mokutonStored = Math.min(mSpace, remaining);
      remaining -= mokutonStored;
    }
    overflow = remaining;
  } else {
    // Mokuton
    const mSpace = s.mokutonNetworkCapacity - s.mokutonNetworkCurrent;
    mokutonStored = Math.min(mSpace, potentialAbsorbed);
    let remaining = potentialAbsorbed - mokutonStored;

    if (remaining > 0) {
      const sSpace = s.secondaryMax - s.secondaryCurrent;
      secondaryRestored = Math.min(sSpace, remaining);
      remaining -= secondaryRestored;
    }
    overflow = remaining;
  }

  s.primaryCurrent += primaryRestored;
  s.secondaryCurrent += secondaryRestored;
  s.mokutonNetworkCurrent += mokutonStored;

  // Calculate Saturation & Backlash if overflow exists
  let saturationDelta = 0;
  let backlashDamage = 0;

  if (overflow > 0) {
    saturationDelta = Math.min(50, Math.round(overflow * 0.5));
    s.saturationLevel = Math.min(100, s.saturationLevel + saturationDelta);

    if (s.saturationLevel > 70) {
      backlashDamage = Math.round((s.saturationLevel - 70) * 0.4);
      s.flowState = 'overcharged';
    } else {
      s.flowState = 'absorbing';
    }
  } else {
    s.flowState = 'absorbing';
  }

  return {
    newState: s,
    result: {
      actualAbsorbed: potentialAbsorbed,
      primaryRestored,
      secondaryRestored,
      mokutonStored,
      overflow,
      saturationDelta,
      backlashDamage,
      targetResistanceEffect: params.targetResistance,
    },
  };
}

/**
 * Calculates lossy chakra transfer from Rin to an ally
 */
export function transferChakra(
  state: ChakraState,
  requestedAmount: number,
  efficiency = 0.85
): { newState: ChakraState; result: TransferResult } {
  const { newState, success, actualPaid } = consumeChakra(state, requestedAmount, 'any');

  if (!success) {
    return {
      newState: state,
      result: {
        requestedAmount,
        effectiveTransfer: 0,
        transferLoss: 0,
        rinCostPaid: 0,
      },
    };
  }

  const effectiveTransfer = Math.round(actualPaid * efficiency);
  const transferLoss = actualPaid - effectiveTransfer;

  return {
    newState,
    result: {
      requestedAmount,
      effectiveTransfer,
      transferLoss,
      rinCostPaid: actualPaid,
    },
  };
}

export function calculateOverflow(state: ChakraState, incomingAmount: number): number {
  const totalFreeSpace =
    state.primaryMax -
    state.primaryCurrent +
    (state.secondaryMax - state.secondaryCurrent) +
    (state.mokutonNetworkCapacity - state.mokutonNetworkCurrent);
  return Math.max(0, incomingAmount - totalFreeSpace);
}

export function calculateSaturation(state: ChakraState, overflow: number): number {
  if (overflow <= 0) return state.saturationLevel;
  return Math.min(100, state.saturationLevel + Math.round(overflow * 0.5));
}
