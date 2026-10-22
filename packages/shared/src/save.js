import { LEVEL_COUNT } from './constants.js';

export const SAVE_KEY = 'mosaic.save.v1';

export function defaultSave() {
  return {
    version: 1,
    highestLevel: 1,
    sound: true,
    music: true,
  };
}

function clampInt(value, min, max, fallback) {
  if (typeof value !== 'number' || !Number.isFinite(value)) return fallback;
  const int = Math.floor(value);
  if (int < min) return min;
  if (int > max) return max;
  return int;
}

export function migrate(raw) {
  const base = defaultSave();
  let input = raw;
  if (typeof input === 'string') {
    try {
      input = JSON.parse(input);
    } catch {
      return base;
    }
  }
  if (!input || typeof input !== 'object') return base;
  return {
    version: 1,
    highestLevel: clampInt(input.highestLevel, 1, LEVEL_COUNT, 1),
    sound: input.sound !== false,
    music: input.music !== false,
  };
}

export function migrateWithStatus(raw) {
  const save = migrate(raw);
  if (raw == null || raw === '') return { save, changed: true };
  const normalized = JSON.stringify(save);
  if (typeof raw === 'string') {
    let source = null;
    try {
      source = JSON.parse(raw);
    } catch {
      return { save, changed: true };
    }
    return { save, changed: JSON.stringify(source) !== normalized };
  }
  return { save, changed: JSON.stringify(raw) !== normalized };
}

export function serialize(save) {
  return JSON.stringify(migrate(save));
}

export function loadSave(storage) {
  const raw = storage && typeof storage.get === 'function' ? storage.get(SAVE_KEY) : null;
  const result = migrateWithStatus(raw);
  if (storage && typeof storage.set === 'function' && result.changed) {
    storage.set(SAVE_KEY, serialize(result.save));
  }
  return result.save;
}

export function persistSave(storage, save) {
  const normalized = migrate(save);
  if (storage && typeof storage.set === 'function') storage.set(SAVE_KEY, serialize(normalized));
  return normalized;
}
