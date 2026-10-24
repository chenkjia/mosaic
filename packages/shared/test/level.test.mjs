import test from 'node:test';
import assert from 'node:assert/strict';
import {
  PALETTE, parseLevel, validateLevel, gridToBricks, quantizeGrid, countDestructible,
  cellForGrid, BOARD,
} from '../src/index.js';
import { makeBrick, makeLevel } from './helpers.mjs';

test('合法关卡通过校验', () => {
  const level = makeLevel([makeBrick(3, 4), makeBrick(4, 4, 'hard'), makeBrick(5, 4, 'obstacle')]);
  const result = validateLevel(level);
  assert.equal(result.ok, true, result.errors.join('; '));
  assert.equal(parseLevel(level).bricks.length, 3);
});

test('格子尺寸：满幅关卡保持 34px，小网格放大且挡板间距不小于 120px', () => {
  assert.equal(cellForGrid(21, 28), BOARD.cell);
  assert.equal(cellForGrid(21, 25), BOARD.cell);
  assert.equal(cellForGrid(4, 3), 74.8);
  const mid = cellForGrid(16, 12);
  assert.ok(mid > BOARD.cell && mid < BOARD.cell * 2.2);
  const parsed = parseLevel({
    id: 9,
    cols: 9,
    rows: 8,
    anchor: 'top',
    bricks: [{ x: 0, y: 0 }],
  });
  assert.equal(parsed.cell, cellForGrid(9, 8));
  assert.equal(parsed.anchor, 'top');
  assert.equal(parsed.cell, 74.8);
});

test('cell 与网格不匹配时被拒绝', () => {
  const level = makeLevel([makeBrick(1, 1)], { cols: 9, rows: 8, anchor: 'top', cell: 34 });
  const result = validateLevel(level);
  assert.equal(result.ok, false);
  assert.ok(result.errors.some((error) => error.includes('cell')));
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
    decorate: (x, y) => {
      if (x === 2 && y === 0) return { type: 'hard', hp: 3 };
      if (x === 0 && y === 1) return { type: 'debuff', debuff: 'speed' };
      return null;
    },
  });
  assert.equal(bricks.length, 4);
  assert.equal(bricks[0].color, 3);
  assert.equal(bricks[1].type, 'hard');
  assert.equal(bricks[1].hp, 3);
  assert.equal(bricks[2].type, 'debuff');
  assert.equal(bricks[2].debuff, 'speed');
  assert.equal(bricks[2].hp, 1);
  assert.equal(countDestructible(bricks), 4);
});

test('减益砖：解析类型、hp 固定为 1 且可被识别', () => {
  const parsed = parseLevel({
    id: 8,
    bricks: [
      { x: 1, y: 1, type: 'debuff', debuff: 'reverse', color: 2 },
      { x: 2, y: 1, type: 'normal' },
    ],
  });
  assert.equal(parsed.bricks[0].type, 'debuff');
  assert.equal(parsed.bricks[0].debuff, 'reverse');
  assert.equal(parsed.bricks[0].hp, 1);
  assert.equal(parsed.bricks[1].debuff, null);
  assert.equal(countDestructible(parsed.bricks), 2);
});

test('减益砖校验：未知减益类型与 hp 非 1 被拒绝', () => {
  const unknown = makeLevel([makeBrick(1, 1, 'debuff', 1, 0, 'laser')]);
  assert.equal(validateLevel(unknown).ok, false);
  const wrongHp = makeLevel([makeBrick(1, 1, 'debuff', 2, 0, 'shrink')]);
  assert.equal(validateLevel(wrongHp).ok, false);
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
