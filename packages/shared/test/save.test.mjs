import test from 'node:test';
import assert from 'node:assert/strict';
import {
  SAVE_KEY, defaultSave, migrate, migrateWithStatus, serialize, loadSave, persistSave,
} from '../src/index.js';

function memoryStorage() {
  const map = new Map();
  return {
    get: (key) => (map.has(key) ? map.get(key) : null),
    set: (key, value) => { map.set(key, value); },
    map,
  };
}

test('默认存档结构', () => {
  assert.deepEqual(defaultSave(), {
    version: 1,
    highestLevel: 1,
    sound: true,
    music: true,
  });
});

test('序列化往返一致', () => {
  const save = { version: 1, highestLevel: 12, sound: false, music: true };
  assert.deepEqual(migrate(serialize(save)), save);
  assert.deepEqual(migrate(JSON.stringify(save)), save);
});

test('损坏/缺字段/越界降级或夹紧', () => {
  assert.deepEqual(migrate('{not json'), defaultSave());
  assert.deepEqual(migrate(null), defaultSave());
  assert.deepEqual(migrate({}), defaultSave());
  const clamped = migrate({ highestLevel: 999, sound: false });
  assert.equal(clamped.highestLevel, 30);
  assert.equal(clamped.sound, false);
  assert.equal(migrate({ highestLevel: 0 }).highestLevel, 1);
});

test('旧存档的 coins 与 slotCapacity 字段被丢弃，最高关保留', () => {
  const save = migrate({
    version: 1, highestLevel: 9, coins: 320, slotCapacity: 4, sound: true, music: false,
  });
  assert.deepEqual(save, {
    version: 1, highestLevel: 9, sound: true, music: false,
  });
  assert.equal(save.coins, undefined);
  assert.equal(save.slotCapacity, undefined);
});

test('loadSave 损坏时回写默认档', () => {
  const storage = memoryStorage();
  storage.set(SAVE_KEY, '{bad');
  const save = loadSave(storage);
  assert.equal(save.highestLevel, 1);
  assert.equal(JSON.parse(storage.get(SAVE_KEY)).version, 1);
  persistSave(storage, { highestLevel: 5, coins: 88, slotCapacity: 4 });
  assert.deepEqual(loadSave(storage), {
    version: 1, highestLevel: 5, sound: true, music: true,
  });
});

test('migrateWithStatus 识别需要回写的存档', () => {
  const changed = migrateWithStatus('{"highestLevel":2}');
  assert.equal(changed.changed, true);
  assert.equal(changed.save.highestLevel, 2);
  const stable = migrateWithStatus(serialize(changed.save));
  assert.equal(stable.changed, false);
});
