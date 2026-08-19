/**
 * Deterministic RNG Engine (Mulberry32 PRNG)
 * Guarantees that: Same Seed + Same State + Same Action = Same Simulation Result.
 * Zero Math.random() usage within simulation engine.
 */

export class DeterministicRNG {
  private state: number;
  public readonly seed: string;

  constructor(seedInput?: string | number) {
    const rawSeed = seedInput !== undefined ? String(seedInput) : 'rin_default_seed_001';
    this.seed = rawSeed;
    this.state = this.hashSeed(rawSeed);
  }

  private hashSeed(seedStr: string): number {
    let h = 2166136261 >>> 0;
    for (let i = 0; i < seedStr.length; i++) {
      h = Math.imul(h ^ seedStr.charCodeAt(i), 16777619);
    }
    return h >>> 0;
  }

  /**
   * Mulberry32 algorithm
   * Returns a pseudo-random float in range [0, 1)
   */
  public nextFloat(): number {
    let t = (this.state += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  /**
   * Returns a pseudo-random integer in range [min, max] inclusive
   */
  public nextInt(min: number, max: number): number {
    const minCeil = Math.ceil(min);
    const maxFloor = Math.floor(max);
    return Math.floor(this.nextFloat() * (maxFloor - minCeil + 1)) + minCeil;
  }

  /**
   * Returns a float with normal (Gaussian) distribution
   */
  public nextGaussian(mean = 0, stdDev = 1): number {
    const u1 = this.nextFloat();
    const u2 = this.nextFloat();
    const z0 = Math.sqrt(-2.0 * Math.log(u1 || 0.00001)) * Math.cos(2.0 * Math.PI * u2);
    return z0 * stdDev + mean;
  }
}
