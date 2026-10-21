const FALLBACK_SEED = 0x9e3779b9;

export function createRng(seed) {
  let value = seed >>> 0;
  if (value === 0) value = FALLBACK_SEED;
  return { a: value };
}

export function nextU32(rng) {
  let a = rng.a | 0;
  a ^= a << 13;
  a |= 0;
  a ^= a >>> 17;
  a ^= a << 5;
  a |= 0;
  rng.a = a;
  return a >>> 0;
}

export function nextFloat(rng) {
  return nextU32(rng) / 4294967296;
}

export function nextRange(rng, min, max) {
  return min + (max - min) * nextFloat(rng);
}

export function nextInt(rng, min, maxInclusive) {
  return min + Math.floor(nextFloat(rng) * (maxInclusive - min + 1));
}

export function chance(rng, probability) {
  return nextFloat(rng) < probability;
}

export function seedFor(levelId, attempt) {
  const seed = (Math.imul(levelId, 0x9e3779b1) ^ Math.imul((attempt | 0) + 1, 0x85ebca6b)) >>> 0;
  return seed || FALLBACK_SEED;
}
