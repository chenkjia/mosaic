// 21×28 PNG → 16 色量化 → 关卡 JSON。派生数据只由本脚本生成，禁止手改 levels.json。
import { mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { PALETTE } from '../packages/shared/src/palette.js';
import { quantizeGrid, validateLevel } from '../packages/shared/src/level.js';
import { BOARD, DEBUFF_IDS } from '../packages/shared/src/constants.js';
import { decodePng } from './lib/png.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SRC_DIR = path.join(ROOT, 'assets/levels/src');
const OUT_FILE = path.join(ROOT, 'apps/game/src/data/levels.json');

function hash2(id, x, y) {
  let h = (Math.imul(id, 374761393) + Math.imul(x, 668265263) + Math.imul(y, 2246822519)) >>> 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177) >>> 0;
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

function isEdge(grid, x, y, width, height) {
  if (x === 0 || y === 0 || x === width - 1 || y === height - 1) return true;
  return grid[y][x - 1] == null || grid[y][x + 1] == null
    || grid[y - 1][x] == null || grid[y + 1][x] == null;
}

function buildLevel(meta, png) {
  if (png.width !== BOARD.cols || png.height !== BOARD.rows) {
    throw new Error(meta.name + ' 源图尺寸必须是 21×28，当前 ' + png.width + '×' + png.height);
  }
  const grid = quantizeGrid(png.rgba, png.width, png.height, PALETTE);
  const obstacleSet = new Set((meta.obstacles || []).map(([x, y]) => x + ',' + y));
  const rewardSet = new Set((meta.rewards || []).map(([x, y]) => x + ',' + y));
  const debuffMap = new Map();
  for (const entry of meta.debuffs || []) {
    const [x, y, kind] = entry;
    const key = x + ',' + y;
    if (!DEBUFF_IDS.includes(kind)) throw new Error(meta.name + ' 减益类型非法: ' + kind);
    debuffMap.set(key, kind);
  }

  const specials = new Set([...obstacleSet, ...rewardSet, ...debuffMap.keys()]);
  if (specials.size !== obstacleSet.size + rewardSet.size + debuffMap.size) {
    throw new Error(meta.name + ' 障碍/奖励/减益坐标重叠');
  }
  for (const key of specials) {
    const [x, y] = key.split(',').map(Number);
    if (grid[y] == null || grid[y][x] == null) throw new Error(meta.name + ' 特殊砖坐标为空: ' + key);
  }
  if (rewardSet.size !== 6) throw new Error(meta.name + ' 奖励砖必须正好 6 块');
  if (obstacleSet.size > 8) throw new Error(meta.name + ' 障碍砖数量不能超过 8');
  if (debuffMap.size > 4) throw new Error(meta.name + ' 减益砖数量不能超过 4');
  for (let y = BOARD.rows - 3; y < BOARD.rows; y += 1) {
    if ((grid[y] || []).some((color) => color != null)) {
      throw new Error(meta.name + ' 底三行必须为空（挡板活动区）');
    }
  }

  const candidates = [];
  let destructible = 0;
  for (let y = 0; y < grid.length; y += 1) {
    for (let x = 0; x < grid[y].length; x += 1) {
      const color = grid[y][x];
      if (color == null) continue;
      const key = x + ',' + y;
      if (!obstacleSet.has(key)) destructible += 1;
      if (specials.has(key)) continue;
      const edge = isEdge(grid, x, y, png.width, png.height) ? 1 : 0;
      const dark = color === 2 || color === 4 ? 1 : 0;
      const score = edge * 0.36 + dark * 0.24 + hash2(meta.id, x, y) * 0.4;
      candidates.push({ x, y, color, key, score });
    }
  }
  if (destructible <= 0) throw new Error(meta.name + ' 没有可破坏砖块');

  // 难度随关卡递增：硬砖占比 6% → 36%，每 4 块硬砖出现 1 块 hp3。
  const ratio = 0.06 + ((meta.id - 1) / 29) * 0.3;
  const hardTarget = Math.min(
    destructible - rewardSet.size - debuffMap.size,
    Math.max(1, Math.round(destructible * ratio)),
  );
  candidates.sort((a, b) => b.score - a.score || a.y - b.y || a.x - b.x);
  const hardSet = new Map();
  for (let i = 0; i < candidates.length && hardSet.size < hardTarget; i += 1) {
    hardSet.set(candidates[i].key, hardSet.size % 4 === 3 ? 3 : 2);
  }

  const bricks = [];
  for (let y = 0; y < grid.length; y += 1) {
    for (let x = 0; x < grid[y].length; x += 1) {
      const color = grid[y][x];
      if (color == null) continue;
      const key = x + ',' + y;
      let type = 'normal';
      let hp = 1;
      let debuff = null;
      if (obstacleSet.has(key)) {
        type = 'obstacle';
        hp = 0;
      } else if (rewardSet.has(key)) {
        type = 'reward';
      } else if (debuffMap.has(key)) {
        type = 'debuff';
        debuff = debuffMap.get(key);
      } else if (hardSet.has(key)) {
        type = 'hard';
        hp = hardSet.get(key);
      }
      bricks.push({ x, y, type, color, hp, debuff });
    }
  }

  const level = {
    id: meta.id,
    theme: meta.theme,
    cols: BOARD.cols,
    rows: BOARD.rows,
    palette: PALETTE.slice(),
    seed: 1000 + meta.id * 7,
    anchor: 'center',
    ball: meta.ball,
    bricks,
  };
  const check = validateLevel(level);
  if (!check.ok) throw new Error(meta.name + ' 校验失败: ' + check.errors.join('; '));
  const stats = {
    destructible,
    hard: bricks.filter((brick) => brick.type === 'hard').length,
    rewards: bricks.filter((brick) => brick.type === 'reward').length,
    debuffs: bricks.filter((brick) => brick.type === 'debuff').length,
    obstacles: bricks.filter((brick) => brick.type === 'obstacle').length,
    bricks: bricks.length,
  };
  return { level, stats };
}

function main() {
  const files = readdirSync(SRC_DIR).filter((name) => name.endsWith('.png')).sort();
  if (files.length !== 30) throw new Error('源图数量应为 30，当前 ' + files.length);
  const levels = [];
  const themes = { animals: 0, flowers: 0, scenery: 0 };
  console.log('[levels] PNG → JSON');
  for (const file of files) {
    const base = file.slice(0, -4);
    const meta = JSON.parse(readFileSync(path.join(SRC_DIR, base + '.json'), 'utf8'));
    const png = decodePng(readFileSync(path.join(SRC_DIR, file)));
    const { level, stats } = buildLevel(meta, png);
    levels.push(level);
    themes[level.theme] = (themes[level.theme] || 0) + 1;
    console.log('  ' + String(level.id).padStart(2, '0') + ' ' + base.padEnd(14)
      + ' bricks ' + String(stats.bricks).padStart(3)
      + ' · destructible ' + String(stats.destructible).padStart(3)
      + ' · hard ' + String(stats.hard).padStart(3)
      + ' · reward ' + stats.rewards
      + ' · debuff ' + stats.debuffs
      + ' · obstacle ' + stats.obstacles
      + ' · balls ' + level.ball.count + ' · speed ' + level.ball.speed);
  }
  for (const theme of Object.keys(themes)) {
    if (themes[theme] !== 10) throw new Error(theme + ' 主题应为 10 关，当前 ' + themes[theme]);
  }
  mkdirSync(path.dirname(OUT_FILE), { recursive: true });
  writeFileSync(OUT_FILE, JSON.stringify(levels) + '\n');
  console.log('[levels] 输出 ' + path.relative(ROOT, OUT_FILE) + '（' + levels.length + ' 关）');
}

main();
