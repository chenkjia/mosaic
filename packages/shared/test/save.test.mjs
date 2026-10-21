import test from 'node:test';
import assert from 'node:assert/strict';
import {
  SAVE_KEY, defaultSave, migrate, migrateWithStatus, serialize, loadSave,
  persistSave, grantCoins, buySlot, slotCost,
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
    coins: 0,
    slotCapacity: 2,
    sound: true,
    music: true,
  });
});

test('序列化往返一致', () => {
  const save = { version: 1, highestLevel: 12, coins: 345, slotCapacity: 3, sound: false, music: true };
  assert.deepEqual(migrate(serialize(save)), save);
  assert.deepEqual(migrate(JSON.stringify(save)), save);
});

test('损坏/缺字段/越界降级或夹紧', () => {
  assert.deepEqual(migrate('{not json'), defaultSave());
  assert.deepEqual(migrate(null), defaultSave());
  assert.deepEqual(migrate({}), defaultSave());
  const clamped = migrate({ highestLevel: 999, coins: -5, slotCapacity: 9 });
  assert.equal(clamped.highestLevel, 30);
  assert.equal(clamped.coins, 0);
  assert.equal(clamped.slotCapacity, 4);
  assert.equal(migrate({ highestLevel: 0 }).highestLevel, 1);
});

test('loadSave 损坏时回写默认档', () => {
  const storage = memoryStorage();
  storage.set(SAVE_KEY, '{bad');
  const save = loadSave(storage);
  assert.equal(save.highestLevel, 1);
  assert.equal(JSON.parse(storage.get(SAVE_KEY)).version, 1);
  persistSave(storage, { highestLevel: 5, coins: 88, slotCapacity: 4 });
  assert.deepEqual(loadSave(storage), {
    version: 1, highestLevel: 5, coins: 88, slotCapacity: 4, sound: true, music: true,
  });
});

test('金币与技能槽扩容', () => {
  let save = grantCoins(defaultSave(), 260);
  assert.equal(save.coins, 260);
  assert.equal(slotCost(save), 200);
  const first = buySlot(save);
  assert.equal(first.ok, true);
  assert.equal(first.save.coins, 60);
  assert.equal(first.save.slotCapacity, 3);
  assert.equal(slotCost(first.save), 500);
  const poor = buySlot(first.save);
  assert.equal(poor.ok, false);
  assert.equal(poor.reason, 'coins');
  assert.equal(poor.save.slotCapacity, 3);

  let rich = grantCoins(first.save, 440);
  const second = buySlot(rich);
  assert.equal(second.ok, true);
  assert.equal(second.save.slotCapacity, 4);
  assert.equal(second.save.coins, 0);
  const max = buySlot(second.save);
  assert.equal(max.ok, false);
  assert.equal(max.reason, 'max');
});

test('migrateWithStatus 识别需要回写的存档', () => {
  const changed = migrateWithStatus('{"highestLevel":2}');
  assert.equal(changed.changed, true);
  assert.equal(changed.save.slotCapacity, 2);
  const stable = migrateWithStatus(serialize(changed.save));
  assert.equal(stable.changed, false);
});
