export function createKVStorage(backend = null) {
  const memory = new Map();

  function get(key) {
    if (memory.has(key)) return memory.get(key);
    if (!backend) return null;
    let raw = null;
    try {
      raw = backend.get(key);
    } catch {
      return null;
    }
    if (raw == null || raw === '') return null;
    memory.set(key, raw);
    return raw;
  }

  function set(key, value) {
    const text = String(value);
    memory.set(key, text);
    if (!backend) return false;
    try {
      backend.set(key, text);
      return true;
    } catch {
      return false;
    }
  }

  return { get, set };
}
