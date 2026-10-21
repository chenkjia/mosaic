import test from 'node:test';
import assert from 'node:assert/strict';
import {
  PALETTE, parseLevel, validateLevel, gridToBricks, quantizeGrid, countDestructible,
} from '../src/index.js';
import { makeBrick, makeLevel } from './helpers.mjs';

test('合法关卡通过校验', () => {
  const level = makeLevel([makeBrick(3, 4), makeBrick(4, 4, 'hard'), makeBrick(5, 4, 'obstacle')]);
  const result = validateLevel(level);
  assert.equal(result.ok, true, result.errors.join('; '));
  assert.equal(parseLevel(level).bricks.length, 3);
});

test('越界、重复、超色板、无破坏砖被拒绝', () => {
  const out = validateLevel(makeLevel([makeBrick(21, 0)]));
  assert.equal(out.ok, false);
  const duplicate = validateLevel(makeLevel([makeBrick(1, 1), makeBrick(1, 1)]));
  assert.equal(duplicate.ok, false);
  const obstacleOnly = validateLevel(makeLevel([makeBrick(1, 1, 'obstacle')]));
  assert.equal(obstacleOnly.ok, false);
  const many = makeLevel([makeBrick(1, 1)]);
  many.palette = new Array(17).fill('#FFFFFF');
  assert.equal(validateLevel(many).ok, false);
});

test('parseLevel 填默认值并规范化硬砖 hp', () => {
  const parsed = parseLevel({
    id: 7,
    bricks: [{ x: 1, y: 1 }, { x: 2, y: 1, type: 'hard' }, { x: 3, y: 1, type: 'reward', color: 2 }],
  });
  assert.equal(parsed.theme, 'animals');
  assert.equal(parsed.cols, 21);
  assert.equal(parsed.rows, 28);
  assert.equal(parsed.ball.count, 1);
  assert.equal(parsed.ball.speed, 640);
  assert.equal(parsed.palette.length, 16);
  assert.equal(parsed.bricks[1].hp, 2);
  assert.equal(parsed.bricks[2].hp, 1);
});

test('gridToBricks 跳过透明格并支持装饰', () => {
  const grid = [
    [null, 3, 3],
    [5, null, 5],
  ];
  const bricks = gridToBricks(grid, {
    decorate: (x, y) => (x === 2 && y === 0 ? { type: 'hard', hp: 3 } : null),
  });
  assert.equal(bricks.length, 4);
  assert.equal(bricks[0].color, 3);
  assert.equal(bricks[1].type, 'hard');
  assert.equal(bricks[1].hp, 3);
  assert.equal(countDestructible(bricks), 4);
});

test('quantizeGrid 将 RGBA 映射到最近调色板并保留透明', () => {
  const rgba = new Uint8Array([
    255, 255, 255, 255,
    0, 0, 0, 0,
    0, 0, 0, 255,
    255, 111, 158, 255,
  ]);
  const grid = quantizeGrid(rgba, 2, 2, PALETTE);
  assert.equal(grid[0][0], 3);
  assert.equal(grid[0][1], null);
  assert.equal(grid[1][0], 4);
  assert.equal(grid[1][1], 6);
});
