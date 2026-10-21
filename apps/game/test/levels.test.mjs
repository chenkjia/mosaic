import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { validateLevel, LEVEL_COUNT, THEMES } from '@mosaic/shared';

const LEVELS = JSON.parse(readFileSync(new URL('../src/data/levels.json', import.meta.url), 'utf8'));

function counts(level) {
  const result = { hard: 0, reward: 0, destructible: 0, total: level.bricks.length };
  for (const brick of level.bricks) {
    if (brick.type === 'obstacle') continue;
    result.destructible += 1;
    if (brick.type === 'hard') result.hard += 1;
    if (brick.type === 'reward') result.reward += 1;
  }
  return result;
}

test('30 关 id 连续、schema 合法、调色板不超过 16 色', () => {
  assert.equal(LEVELS.length, LEVEL_COUNT);
  for (let i = 0; i < LEVELS.length; i += 1) {
    const level = LEVELS[i];
    assert.equal(level.id, i + 1);
    const result = validateLevel(level);
    assert.equal(result.ok, true, 'level ' + level.id + ': ' + result.errors.join('; '));
    assert.ok(level.palette.length <= 16);
    assert.ok(counts(level).destructible > 0);
    assert.ok(counts(level).reward >= 1);
  }
});

test('每主题 10 关，难度随关卡递增', () => {
  const themeCount = new Map();
  for (const level of LEVELS) {
    themeCount.set(level.theme, (themeCount.get(level.theme) || 0) + 1);
  }
  for (const theme of THEMES) assert.equal(themeCount.get(theme), 10);

  const first = counts(LEVELS[0]);
  const last = counts(LEVELS[LEVELS.length - 1]);
  assert.ok(last.hard / last.destructible > first.hard / first.destructible);
  assert.ok(LEVELS[LEVELS.length - 1].ball.speed > LEVELS[0].ball.speed);

  for (let i = 1; i < LEVELS.length; i += 1) {
    assert.ok(LEVELS[i].ball.speed >= LEVELS[i - 1].ball.speed);
    assert.ok(LEVELS[i].ball.count >= LEVELS[i - 1].ball.count);
    assert.ok(LEVELS[i].ball.count <= 8);
  }
});

test('关卡砖块坐标均在 21×28 网格内', () => {
  for (const level of LEVELS) {
    for (const brick of level.bricks) {
      assert.ok(brick.x >= 0 && brick.x < 21, 'level ' + level.id + ' brick x');
      assert.ok(brick.y >= 0 && brick.y < 28, 'level ' + level.id + ' brick y');
    }
  }
});
