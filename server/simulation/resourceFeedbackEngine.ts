import { ChakraState } from './chakraEngine';
import { PhysicalStateQuantified } from './stateEngine';

export type FeedbackType =
  | 'POSITIVE_FEEDBACK'
  | 'NEGATIVE_FEEDBACK'
  | 'SATURATION'
  | 'OVERFLOW'
  | 'CONVERSION'
  | 'DRAIN'
  | 'RECOVERY'
  | 'BACKLASH';

export interface ResourceConversionParams {
  sourceType: 'chakra' | 'vitality' | 'stamina' | 'bioEnergy';
  destinationType: 'chakra' | 'vitality' | 'health' | 'stamina';
  amount: number;
  efficiency: number; // 0.1 to 0.95
  maxSafeConversion: number;
  circuitSaturation?: number;
}

export interface ResourceConversionResult {
  convertedAmount: number;
  actualReceived: number;
  loss: number;
  saturationAdded: number;
  backlashTriggered: boolean;
  backlashDamage: number;
  feedbackType: FeedbackType;
}

/**
 * Executes explicit resource conversion between Chakra, Vitality, Health, and Stamina.
 * Enforces efficiency losses and prevents infinite recovery loops.
 */
export function convertResource(
  chakra: ChakraState,
  physical: PhysicalStateQuantified,
  params: ResourceConversionParams
): {
  newChakra: ChakraState;
  newPhysical: PhysicalStateQuantified;
  result: ResourceConversionResult;
} {
  const c = { ...chakra };
  const p = { ...physical };

  // Cap conversion to safe limit to prevent infinite loops
  const amountToConvert = Math.min(params.amount, params.maxSafeConversion);
  
  // Biological conversions (vitality/health/bioEnergy) have a maximum efficiency of 75% (minimum 25% loss)
  const isBiological =
    params.sourceType === 'vitality' ||
    params.sourceType === 'bioEnergy' ||
    params.destinationType === 'vitality' ||
    params.destinationType === 'health';

  const maxEfficiencyAllowed = isBiological ? 0.75 : 0.85;
  const efficiency = Math.max(0.1, Math.min(maxEfficiencyAllowed, params.efficiency));

  const actualReceived = Math.round(amountToConvert * efficiency);
  const loss = amountToConvert - actualReceived;

  let saturationAdded = Math.round(loss * 0.4);
  let backlashTriggered = false;
  let backlashDamage = 0;
  let feedbackType: FeedbackType = 'CONVERSION';

  // Apply source reduction
  if (params.sourceType === 'chakra') {
    if (c.primaryCurrent < amountToConvert) {
      return {
        newChakra: chakra,
        newPhysical: physical,
        result: {
          convertedAmount: 0,
          actualReceived: 0,
          loss: 0,
          saturationAdded: 0,
          backlashTriggered: false,
          backlashDamage: 0,
          feedbackType: 'DRAIN',
        },
      };
    }
    c.primaryCurrent -= amountToConvert;
  } else if (params.sourceType === 'stamina') {
    if (p.staminaCurrent < amountToConvert) {
      return {
        newChakra: chakra,
        newPhysical: physical,
        result: {
          convertedAmount: 0,
          actualReceived: 0,
          loss: 0,
          saturationAdded: 0,
          backlashTriggered: false,
          backlashDamage: 0,
          feedbackType: 'DRAIN',
        },
      };
    }
    p.staminaCurrent -= amountToConvert;
  }

  // Apply destination restoration with hard capacity caps
  if (params.destinationType === 'chakra') {
    const space = c.primaryMax - c.primaryCurrent;
    const restored = Math.min(space, actualReceived);
    c.primaryCurrent += restored;
    if (actualReceived > space) {
      feedbackType = 'OVERFLOW';
      saturationAdded += Math.round((actualReceived - space) * 0.5);
    } else {
      feedbackType = 'RECOVERY';
    }
  } else if (params.destinationType === 'health') {
    const space = p.healthMax - p.healthCurrent;
    const restored = Math.min(space, actualReceived);
    p.healthCurrent += restored;
    feedbackType = 'RECOVERY';
  } else if (params.destinationType === 'stamina') {
    const space = p.staminaMax - p.staminaCurrent;
    const restored = Math.min(space, actualReceived);
    p.staminaCurrent += restored;
    feedbackType = 'RECOVERY';
  }

  // Evaluate saturation & backlash risk
  c.saturationLevel = Math.min(100, c.saturationLevel + saturationAdded);
  if (c.saturationLevel > 80) {
    backlashTriggered = true;
    backlashDamage = Math.round((c.saturationLevel - 80) * 0.5);
    p.healthCurrent = Math.max(0, p.healthCurrent - backlashDamage);
    feedbackType = 'BACKLASH';
  }

  return {
    newChakra: c,
    newPhysical: p,
    result: {
      convertedAmount: amountToConvert,
      actualReceived,
      loss,
      saturationAdded,
      backlashTriggered,
      backlashDamage,
      feedbackType,
    },
  };
}
