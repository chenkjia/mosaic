import { BALL, BOARD, DEBUFF_IDS } from './constants.js';
import { PALETTE, nearestPaletteIndex, isHexColor } from './palette.js';

export const BRICK_TYPES = ['normal', 'hard', 'obstacle', 'reward', 'debuff'];
export const ANCHORS = ['center', 'bottom'];

export function countDestructible(bricks) {
  let total = 0;
  for (let i = 0; i < bricks.length; i += 1) {
    if (bricks[i].type !== 'obstacle') total += 1;
  }
  return total;
}

function isInt(value) {
  return typeof value === 'number' && Number.isFinite(value) && Math.floor(value) === value;
}

export function parseLevel(raw) {
  if (!raw || typeof raw !== 'object') throw new Error('[level] 关卡必须是对象');
  const id = raw.id;
  const cols = isInt(raw.cols) ? raw.cols : BOARD.cols;
  const rows = isInt(raw.rows) ? raw.rows : BOARD.rows;
  const palette = Array.isArray(raw.palette) && raw.palette.length > 0 ? raw.palette.slice() : PALETTE.slice();
  const ball = {
    count: raw.ball && isInt(raw.ball.count) ? raw.ball.count : 1,
    speed: raw.ball && Number.isFinite(raw.ball.speed) ? raw.ball.speed : BALL.speed,
  };
  const bricks = Array.isArray(raw.bricks)
    ? raw.bricks.map((brick) => {
      const type = BRICK_TYPES.includes(brick && brick.type) ? brick.type : 'normal';
      let hp = 1;
      if (type === 'hard') hp = isInt(brick.hp) ? brick.hp : 2;
      if (type === 'obstacle') hp = 0;
      const debuff = type === 'debuff' && DEBUFF_IDS.includes(brick.debuff) ? brick.debuff : null;
      return {
        x: brick && brick.x,
        y: brick && brick.y,
        type,
        color: brick && isInt(brick.color) ? brick.color : 0,
        hp,
        debuff,
      };
    })
    : [];
  const level = {
    id,
    theme: typeof raw.theme === 'string' && raw.theme ? raw.theme : 'animals',
    cols,
    rows,
    palette,
    seed: isInt(raw.seed) ? raw.seed : (isInt(id) ? id * 1000 + 7 : 1007),
    anchor: ANCHORS.includes(raw.anchor) ? raw.anchor : 'center',
    ball,
    bricks,
  };
  const result = validateLevel(level);
  if (!result.ok) throw new Error('[level] ' + result.errors.join('; '));
  return level;
}

export function validateLevel(level) {
  const errors = [];
  if (!level || typeof level !== 'object') {
    return { ok: false, errors: ['关卡必须是对象'] };
  }
  if (!isInt(level.id) || level.id <= 0) errors.push('id 必须是正整数');
  if (typeof level.theme !== 'string' || !level.theme) errors.push('theme 必须是非空字符串');
  if (!isInt(level.cols) || level.cols < 1 || level.cols > BOARD.cols) {
    errors.push('cols 必须在 1..' + BOARD.cols);
  }
  if (!isInt(level.rows) || level.rows < 1 || level.rows > BOARD.rows) {
    errors.push('rows 必须在 1..' + BOARD.rows);
  }
  if (!Array.isArray(level.palette) || level.palette.length < 1 || level.palette.length > 16) {
    errors.push('palette 必须是 1..16 色数组');
  } else {
    for (let i = 0; i < level.palette.length; i += 1) {
      if (!isHexColor(level.palette[i])) errors.push('palette[' + i + '] 不是 #RRGGBB');
    }
  }
  if (!level.ball || !isInt(level.ball.count) || level.ball.count < 1 || level.ball.count > BALL.cap) {
    errors.push('ball.count 必须在 1..' + BALL.cap);
  }
  if (!level.ball || !Number.isFinite(level.ball.speed) || level.ball.speed < 100 || level.ball.speed > 1200) {
    errors.push('ball.speed 必须在 100..1200');
  }
  if (level.anchor != null && !ANCHORS.includes(level.anchor)) errors.push('anchor 必须是 center 或 bottom');
  if (!Array.isArray(level.bricks) || level.bricks.length < 1) {
    errors.push('bricks 不能为空');
    return { ok: errors.length === 0, errors };
  }

  const seen = new Set();
  let destructible = 0;
  const rows = isInt(level.rows) ? level.rows : BOARD.rows;
  const cols = isInt(level.cols) ? level.cols : BOARD.cols;
  const paletteSize = Array.isArray(level.palette) ? level.palette.length : 0;

  for (let i = 0; i < level.bricks.length; i += 1) {
    const brick = level.bricks[i];
    if (!brick || !isInt(brick.x) || brick.x < 0 || brick.x >= cols
      || !isInt(brick.y) || brick.y < 0 || brick.y >= rows) {
      errors.push('bricks[' + i + '] 坐标越界');
      continue;
    }
    if (!BRICK_TYPES.includes(brick.type)) errors.push('bricks[' + i + '] type 非法');
    if (!isInt(brick.color) || brick.color < 0 || brick.color >= paletteSize) {
      errors.push('bricks[' + i + '] color 越界');
    }
    if (brick.type === 'hard' && (!isInt(brick.hp) || brick.hp < 2 || brick.hp > 3)) {
      errors.push('bricks[' + i + '] 硬砖 hp 必须是 2 或 3');
    }
    if ((brick.type === 'normal' || brick.type === 'reward' || brick.type === 'debuff') && brick.hp !== 1) {
      errors.push('bricks[' + i + '] 普通/奖励/减益砖 hp 必须是 1');
    }
    if (brick.type === 'obstacle' && brick.hp !== 0) {
      errors.push('bricks[' + i + '] 障碍砖 hp 必须是 0');
    }
    if (brick.type === 'debuff' && !DEBUFF_IDS.includes(brick.debuff)) {
      errors.push('bricks[' + i + '] 减益砖 debuff 必须是 ' + DEBUFF_IDS.join('/'));
    }
    const key = brick.x + ',' + brick.y;
    if (seen.has(key)) errors.push('bricks[' + i + '] 坐标重复 ' + key);
    seen.add(key);
    if (brick.type !== 'obstacle') destructible += 1;
  }
  if (destructible === 0) errors.push('可破坏砖块数必须大于 0');
  return { ok: errors.length === 0, errors };
}

export function gridToBricks(grid, options) {
  const opts = options || {};
  const bricks = [];
  if (!Array.isArray(grid)) return bricks;
  for (let y = 0; y < grid.length; y += 1) {
    const row = grid[y];
    if (!Array.isArray(row)) continue;
    for (let x = 0; x < row.length; x += 1) {
      const color = row[x];
      if (color == null) continue;
      let decoration = null;
      if (typeof opts.decorate === 'function') decoration = opts.decorate(x, y, color);
      const type = decoration && BRICK_TYPES.includes(decoration.type) ? decoration.type : 'normal';
      let hp = 1;
      if (type === 'hard') hp = decoration && isInt(decoration.hp) ? decoration.hp : 2;
      if (type === 'obstacle') hp = 0;
      const debuff = type === 'debuff' && decoration && DEBUFF_IDS.includes(decoration.debuff)
        ? decoration.debuff
        : null;
      bricks.push({ x, y, type, color, hp, debuff });
    }
  }
  return bricks;
}

export function quantizeGrid(rgba, width, height, palette) {
  const table = (palette || PALETTE).map((hex) => {
    const n = parseInt(hex.slice(1), 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  });
  const grid = [];
  for (let y = 0; y < height; y += 1) {
    const row = [];
    for (let x = 0; x < width; x += 1) {
      const offset = (y * width + x) * 4;
      const alpha = rgba[offset + 3];
      if (alpha < 128) {
        row.push(null);
      } else {
        row.push(nearestPaletteIndex(rgba[offset], rgba[offset + 1], rgba[offset + 2], table));
      }
    }
    grid.push(row);
  }
  return grid;
}
