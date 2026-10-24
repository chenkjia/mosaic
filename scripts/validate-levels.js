// 校验派生的 30 关 levels.json：schema、主题配额、砖数目标、奖励/减益配比、缩放与挡板间隙。
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { validateLevel } from '../packages/shared/src/level.js';
import { BOARD, LEVEL, PADDLE } from '../packages/shared/src/constants.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const LEVEL_FILE = path.join(ROOT, 'apps/game/src/data/levels.json');

// 1–10 关为明确砖数目标；11 关后沿用原有难度带。
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
  return BANDS.find((band) => id >= band.from && id <= band.to) || null;
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

function ratio(level, destructible) {
  const hard = level.bricks.filter((brick) => brick.type === 'hard').length;
  return destructible === 0 ? 0 : hard / destructible;
}

function main() {
  const levels = JSON.parse(readFileSync(LEVEL_FILE, 'utf8'));
  const errors = [];
  if (!Array.isArray(levels) || levels.length !== 30) {
    errors.push('关卡数量应为 30，当前 ' + (Array.isArray(levels) ? levels.length : '非数组'));
  }
  const themes = {};
  let prevSpeed = 0;
  let prevBalls = 0;
  let prevRatio = 0;

  for (let i = 0; i < levels.length; i += 1) {
    const level = levels[i];
    const result = validateLevel(level);
    if (!result.ok) errors.push('第 ' + (level && level.id) + ' 关: ' + result.errors.join('; '));
    if (level.id !== i + 1) errors.push('第 ' + (i + 1) + ' 项 id 应为 ' + (i + 1) + '，实际 ' + level.id);
    themes[level.theme] = (themes[level.theme] || 0) + 1;
    if (level.anchor !== 'top') errors.push('第 ' + level.id + ' 关 anchor 应为 top');

    const destructible = level.bricks.filter((brick) => brick.type !== 'obstacle').length;
    const rewards = level.bricks.filter((brick) => brick.type === 'reward').length;
    const debuffs = level.bricks.filter((brick) => brick.type === 'debuff').length;
    const obstacles = level.bricks.filter((brick) => brick.type === 'obstacle').length;
    const hard = level.bricks.filter((brick) => brick.type === 'hard').length;
    const range = rangeFor(level.id);
    if (!range) errors.push('第 ' + level.id + ' 关没有难度带');
    if (range && (destructible < range.min || destructible > range.max)) {
      errors.push('第 ' + level.id + ' 关砖数 ' + destructible + ' 超出区间 ' + range.min + '..' + range.max);
    }
    const expectedRewards = rewardTarget(destructible);
    if (rewards !== expectedRewards) {
      errors.push('第 ' + level.id + ' 关奖励砖应为 ' + expectedRewards + '，实际 ' + rewards);
    }
    const expectedDebuffCount = expectedDebuffs(level.id, destructible);
    if (debuffs !== expectedDebuffCount) {
      errors.push('第 ' + level.id + ' 关减益砖应为 ' + expectedDebuffCount + '，实际 ' + debuffs);
    }
    if (obstacles > 8) errors.push('第 ' + level.id + ' 关障碍砖不能超过 8');
    if (level.palette.length > 16) errors.push('第 ' + level.id + ' 关调色板超过 16 色');
    if (level.id <= 3 && (hard > 0 || debuffs > 0 || obstacles > 0)) {
      errors.push('第 ' + level.id + ' 关不允许硬砖/减益/障碍');
    }
    if (level.id >= 4 && hard === 0) errors.push('第 ' + level.id + ' 关缺少硬砖');
    if (hard > destructible * 0.4) {
      errors.push('第 ' + level.id + ' 关硬砖比例过高: ' + (ratio(level, destructible) * 100).toFixed(1) + '%');
    }

    const lowest = Math.max(-1, ...level.bricks.map((brick) => brick.y));
    if (lowest !== level.rows - 1) {
      errors.push('第 ' + level.id + ' 关最底砖块应贴住网格底部第 ' + (level.rows - 1) + ' 行，实际 ' + lowest);
    }
    const scale = level.cell / BOARD.cell;
    const paddleTop = BOARD.h - PADDLE.bottomInset - PADDLE.h * scale;
    const lowestBottom = (lowest + 1) * level.cell - BOARD.inset;
    const gap = paddleTop - lowestBottom;
    if (gap < LEVEL.baseClearance - 2) {
      errors.push('第 ' + level.id + ' 关挡板间隙仅 ' + gap.toFixed(1) + 'px');
    }
    if (level.cell > BOARD.cell + 0.001 && gap < LEVEL.zoomClearance - 0.5) {
      errors.push('第 ' + level.id + ' 关放大后间隙应 ≥' + LEVEL.zoomClearance + 'px，实际 ' + gap.toFixed(1));
    }

    if (level.ball.speed < prevSpeed) errors.push('第 ' + level.id + ' 关球速未递增');
    if (level.ball.count < prevBalls) errors.push('第 ' + level.id + ' 关初始球数下降');
    const currentRatio = ratio(level, destructible);
    if (i > 0 && i % 10 === 0 && currentRatio + 0.03 < prevRatio) {
      errors.push('第 ' + level.id + ' 关硬砖比例低于上一主题');
    }
    prevSpeed = level.ball.speed;
    prevBalls = level.ball.count;
    prevRatio = i % 10 === 9 ? currentRatio : prevRatio;

    console.log(
      String(level.id).padStart(2, '0') + ' ' + level.theme.padEnd(8)
      + ' bricks ' + String(destructible).padStart(3)
      + ' · hard ' + String(hard).padStart(3) + ' (' + (currentRatio * 100).toFixed(1) + '%)'
      + ' · reward ' + rewards + ' · debuff ' + debuffs + ' · obstacle ' + obstacles
      + ' · grid ' + level.cols + '×' + level.rows + ' @ ' + level.cell.toFixed(2)
      + ' · gap ' + gap.toFixed(1) + 'px'
      + ' · balls ' + level.ball.count + ' · speed ' + level.ball.speed,
    );
  }

  for (const theme of ['animals', 'flowers', 'scenery']) {
    if (themes[theme] !== 10) errors.push(theme + ' 主题应为 10 关，当前 ' + (themes[theme] || 0));
  }

  if (errors.length > 0) {
    console.error('[validate] 失败 ' + errors.length + ' 项');
    for (const error of errors) console.error('  - ' + error);
    process.exit(1);
  }
  console.log('[validate] 30 关全部通过：砖数目标 / 奖励配比 / 减益递增 / 缩放间隙均合法');
}

main();
