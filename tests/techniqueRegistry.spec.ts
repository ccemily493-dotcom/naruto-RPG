import { describe, it, expect } from 'vitest';
import {
  RIN_MASTER_TECHNIQUES,
  getTechniqueByIdOrName,
  getTechniquesByCategory,
} from '../server/simulation/techniqueRegistry';

describe('Technique Registry Tests', () => {
  it('TEST 23: Filter combat_only excludes generic capabilities', () => {
    const all = RIN_MASTER_TECHNIQUES;
    const combatOnly = all.filter((t) => t.category !== 'Kekkei Genkai' && t.category !== 'Percepción');

    expect(all.length).toBeGreaterThan(combatOnly.length);
    expect(combatOnly.some((t) => t.name === 'Yūrei no Keimyaku')).toBe(false);
    expect(combatOnly.some((t) => t.name === 'Chidori')).toBe(true);
  });

  it('TEST 24: UNSET parameters are NEVER silently converted to 0', () => {
    const identidad = getTechniqueByIdOrName('Genjutsu de Identidad — fundamentos');
    expect(identidad).toBeDefined();
    expect(identidad?.basePower).toBeUndefined(); // Strictly UNSET
    expect(identidad?.chakraCostBase).toBeUndefined(); // Strictly UNSET

    const kali = getTechniqueByIdOrName('Invocación de Kali');
    expect(kali?.basePower).toBeUndefined(); // Strictly UNSET
  });

  it('TEST 27: Unknown / non-existent technique is correctly identified as not known by Rin', () => {
    const unknown = getTechniqueByIdOrName('Kamehameha_Goku_Fake');
    expect(unknown).toBeUndefined();
  });
});
