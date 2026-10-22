import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { BOARD, PADDLE, validateLevel, LEVEL_COUNT, THEMES } from '@mosaic/shared';

const LEVELS = JSON.parse(readFileSync(new URL('../src/data/levels.json', import.meta.url), 'utf8'));

const BANDS = [
  { from: 1, to: 3, min: 70, max: 90 },
  { from: 4, to: 7, min: 90, max: 120 },
  { from: 8, to: 12, min: 120, max: 150 },
  { from: 13, to: 16, min: 150, max: 175 },
  { from: 17, to: 19, min: 175, max: 199 },
  { from: 20, to: 24, min: 200, max: 250 },
  { from: 25, to: 30, min: 250, max: 330 },
];

function bandFor(id) {
  return BANDS.find((band) => id >= band.from && id <= band.to);
}

function expectedDebuffs(id) {
  if (id <= 3) return 0;
  if (id <= 7) return 1;
  if (id <= 12) return 2;
  if (id <= 19) return 3;
  return 4;
}

function counts(level) {
  const result = { hard: 0, reward: 0, debuff: 0, destructible: 0, total: level.bricks.length };
  for (const brick of level.bricks) {
    if (brick.type === 'obstacle') continue;
    result.destructible += 1;
    if (brick.type === 'hard') result.hard += 1;
    if (brick.type === 'reward') result.reward += 1;
    if (brick.type === 'debuff') result.debuff += 1;
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
    const stats = counts(level);
    assert.ok(stats.destructible > 0);
    assert.equal(stats.reward, 6, 'level ' + level.id + ' 奖励砖必须正好 6');
    assert.equal(stats.debuff, expectedDebuffs(level.id), 'level ' + level.id + ' 减益砖数量');
  }
});

test('砖数落在确认的难度带内', () => {
  for (const level of LEVELS) {
    const band = bandFor(level.id);
    const destructible = counts(level).destructible;
    assert.ok(band, 'level ' + level.id + ' 缺少难度带');
    assert.ok(
      destructible >= band.min && destructible <= band.max,
      'level ' + level.id + ' 砖数 ' + destructible + ' 超出 ' + band.min + '..' + band.max,
    );
  }
});

test('底三行留空，最底砖块贴住第 24 行且挡板间隙约 52.5px', () => {
  const paddleTop = BOARD.h - PADDLE.bottomGap - PADDLE.h / 2;
  for (const level of LEVELS) {
    const lowest = Math.max(...level.bricks.map((brick) => brick.y));
    assert.equal(lowest, BOARD.rows - 4, 'level ' + level.id + ' 最底行 ' + lowest);
    const gap = paddleTop - ((lowest + 1) * BOARD.cell - BOARD.inset);
    assert.ok(gap >= 50 && gap <= 56, 'level ' + level.id + ' 挡板间隙 ' + gap.toFixed(1));
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
