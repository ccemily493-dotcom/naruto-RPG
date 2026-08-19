import { describe, it, expect } from 'vitest';
import {
  RIN_MASTER_TECHNIQUES,
  getTechniqueByIdOrName,
} from '../server/simulation/techniqueRegistry';

describe('Technique Registry Tests & ValueSource Traceability', () => {
  it('TEST 23: Executable filter excludes generic capabilities (isExecutableJutsu: false)', () => {
    const all = RIN_MASTER_TECHNIQUES;
    const executables = all.filter((t) => t.isExecutableJutsu !== false);
    const capabilities = all.filter((t) => t.isExecutableJutsu === false);

    expect(executables.length).toBe(38);
    expect(capabilities.length).toBe(8);
    expect(capabilities.some((t) => t.id === 'tercer_ojo')).toBe(true);
    expect(executables.some((t) => t.id === 'chidori')).toBe(true);
  });

  it('TEST 24: UNSET parameters are NEVER silently converted to 0', () => {
    const identidad = getTechniqueByIdOrName('Genjutsu de Identidad — fundamentos');
    expect(identidad).toBeDefined();
    expect(identidad?.basePower).toBeUndefined(); // Strictly UNSET
    expect(identidad?.chakraCostBase).toBeUndefined(); // Strictly UNSET
    expect(identidad?.valueSource).toBe('UNSET');

    const kali = getTechniqueByIdOrName('Invocación de Kali');
    expect(kali?.basePower).toBeUndefined(); // Strictly UNSET
    expect(kali?.valueSource).toBe('UNSET');
  });

  it('TEST: Traceability of valueSource (CANON_DOCUMENTED vs DERIVED vs UNSET)', () => {
    const chidori = getTechniqueByIdOrName('Chidori');
    const paralizante = getTechniqueByIdOrName('Mirada Paralizante');
    const identidad = getTechniqueByIdOrName('Genjutsu de Identidad — fundamentos');

    expect(chidori?.valueSource).toBe('CANON_DOCUMENTED');
    expect(paralizante?.valueSource).toBe('DERIVED');
    expect(identidad?.valueSource).toBe('UNSET');
  });

  it('TEST 27: Unknown / non-existent technique is correctly identified as not known by Rin', () => {
    const unknown = getTechniqueByIdOrName('Kamehameha_Goku_Fake');
    expect(unknown).toBeUndefined();
  });
});
