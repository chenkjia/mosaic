import { loadSave, persistSave } from '@mosaic/shared';

export function createSaveStore(storage) {
  let save = loadSave(storage);

  function get() {
    return save;
  }

  function update(mutator) {
    const next = Object.assign({}, save);
    const result = mutator(next);
    save = persistSave(storage, result || next);
    return save;
  }

  function set(next) {
    save = persistSave(storage, next);
    return save;
  }

  function reload() {
    save = loadSave(storage);
    return save;
  }

  return { get, update, set, reload };
}
