import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  BOARD, LEVEL, LEVEL_COUNT, PADDLE, THEMES, cellForGrid, validateLevel,
} from '@mosaic/shared';

const LEVELS = JSON.parse(readFileSync(new URL('../src/data/levels.json', import.meta.url), 'utf8'));

const TARGETS = [10, 16, 24, 34, 46, 60, 76, 90, 105, 120];
const BANDS = [
  { from: 11, to: 12, min: 120, max: 150 },
  { from: 13, to: 16, min: 150, max: 175 },
  { from: 17, to: 19, min: 175, max: 199 },
  { from: 20, to: 24, min: 200, max: 250 },
  { from: 25, to: 30, min: 250, max: 330 },
];

function rangeFor(id) {
  if (id <= TARGETS.length) return { min: TARGETS[id - 1], max: TARGETS[id - 1] };
  return BANDS.find((band) => id >= band.from && id <= band.to);
}

function expectedDebuffs(id, destructible) {
  if (destructible < 40 || id <= 3) return 0;
  if (id <= 7) return 1;
  if (id <= 12) return 2;
  if (id <= 19) return 3;
  return 4;
}

function rewardTarget(destructible) {
  return Math.max(1, Math.min(6, Math.round(destructible / 12)));
}

function counts(level) {
  const result = { hard: 0, reward: 0, debuff: 0, obstacle: 0, destructible: 0, total: level.bricks.length };
  for (const brick of level.bricks) {
    if (brick.type === 'obstacle') {
      result.obstacle += 1;
      continue;
    }
    result.destructible += 1;
    if (brick.type === 'hard') result.hard += 1;
    if (brick.type === 'reward') result.reward += 1;
    if (brick.type === 'debuff') result.debuff += 1;
  }
  return result;
}

test('30 关 id 连续、schema 合法、奖励/减益配比正确', () => {
  assert.equal(LEVELS.length, LEVEL_COUNT);
  for (let i = 0; i < LEVELS.length; i += 1) {
    const level = LEVELS[i];
    assert.equal(level.id, i + 1);
    const result = validateLevel(level);
    assert.equal(result.ok, true, 'level ' + level.id + ': ' + result.errors.join('; '));
    assert.ok(level.palette.length <= 16);
    assert.equal(level.anchor, 'top', 'level ' + level.id + ' 使用顶部对齐');
    const stats = counts(level);
    assert.ok(stats.destructible > 0);
    assert.equal(stats.reward, rewardTarget(stats.destructible), 'level ' + level.id + ' 奖励砖数量');
    assert.equal(stats.debuff, expectedDebuffs(level.id, stats.destructible), 'level ' + level.id + ' 减益砖数量');
    if (level.id <= 3) {
      assert.equal(stats.hard, 0, 'level ' + level.id + ' 不应有硬砖');
      assert.equal(stats.debuff, 0, 'level ' + level.id + ' 不应有减益砖');
      assert.equal(stats.obstacle, 0, 'level ' + level.id + ' 不应有障碍砖');
    } else {
      assert.ok(stats.hard > 0, 'level ' + level.id + ' 应有硬砖');
    }
  }
});

test('前 10 关按确认目标递增，11 关后落在难度带内', () => {
  for (let i = 0; i < TARGETS.length; i += 1) {
    assert.equal(counts(LEVELS[i]).destructible, TARGETS[i], 'level ' + (i + 1));
  }
  for (const level of LEVELS) {
    const range = rangeFor(level.id);
    const destructible = counts(level).destructible;
    assert.ok(range, 'level ' + level.id + ' 缺少难度带');
    assert.ok(
      destructible >= range.min && destructible <= range.max,
      'level ' + level.id + ' 砖数 ' + destructible + ' 超出 ' + range.min + '..' + range.max,
    );
  }
});

test('格子尺寸由网格推导，放大后最低砖块与挡板留足间距', () => {
  for (const level of LEVELS) {
    assert.equal(level.cell, cellForGrid(level.cols, level.rows), 'level ' + level.id + ' cell');
    assert.ok(level.cell >= BOARD.cell && level.cell <= BOARD.cell * 2.2 + 1e-6);
    const lowest = Math.max(...level.bricks.map((brick) => brick.y));
    assert.equal(lowest, level.rows - 1, 'level ' + level.id + ' 最底行应贴住网格底部');
    const scale = level.cell / BOARD.cell;
    const paddleTop = BOARD.h - PADDLE.bottomInset - PADDLE.h * scale;
    const gap = paddleTop - ((lowest + 1) * level.cell - BOARD.inset);
    assert.ok(gap >= LEVEL.baseClearance - 2, 'level ' + level.id + ' 挡板间隙 ' + gap.toFixed(1));
    if (level.cell > BOARD.cell + 0.001) {
      assert.ok(gap >= LEVEL.zoomClearance - 0.5, 'level ' + level.id + ' 放大后间隙 ' + gap.toFixed(1));
    }
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

test('关卡砖块坐标均在各自网格内', () => {
  for (const level of LEVELS) {
    for (const brick of level.bricks) {
      assert.ok(brick.x >= 0 && brick.x < level.cols, 'level ' + level.id + ' brick x');
      assert.ok(brick.y >= 0 && brick.y < level.rows, 'level ' + level.id + ' brick y');
    }
  }
});
