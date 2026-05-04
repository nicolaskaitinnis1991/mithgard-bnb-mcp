// Deterministic 32-bit FNV-1a hash for stable mock fixture selection.
// Same input string → same output. NOT a security primitive.

export const fnv1a = (input: string): number => {
  let h = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  // Force unsigned 32-bit
  return h >>> 0;
};

export const pickIndex = (input: string, n: number): number => fnv1a(input) % n;
