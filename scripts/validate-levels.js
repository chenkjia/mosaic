// 校验派生的 30 关 levels.json：schema、主题配额、难度递增、可破坏砖块与奖励/障碍数量。
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { validateLevel } from '../packages/shared/src/level.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const LEVEL_FILE = path.join(ROOT, 'apps/game/src/data/levels.json');

function ratio(level) {
  const destructible = level.bricks.filter((brick) => brick.type !== 'obstacle').length;
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

    const destructible = level.bricks.filter((brick) => brick.type !== 'obstacle').length;
    const rewards = level.bricks.filter((brick) => brick.type === 'reward').length;
    const obstacles = level.bricks.filter((brick) => brick.type === 'obstacle').length;
    const hard = level.bricks.filter((brick) => brick.type === 'hard').length;
    if (destructible <= 0) errors.push('第 ' + level.id + ' 关没有可破坏砖块');
    if (rewards < 1 || rewards > 6) errors.push('第 ' + level.id + ' 关奖励砖数量应为 1..6');
    if (obstacles > 8) errors.push('第 ' + level.id + ' 关障碍砖不能超过 8');
    if (level.palette.length > 16) errors.push('第 ' + level.id + ' 关调色板超过 16 色');
    if (obstacles > 0 && hard > destructible * 0.4) {
      errors.push('第 ' + level.id + ' 关硬砖比例过高: ' + (ratio(level) * 100).toFixed(1) + '%');
    }

    if (level.ball.speed < prevSpeed) errors.push('第 ' + level.id + ' 关球速未递增');
    if (level.ball.count < prevBalls) errors.push('第 ' + level.id + ' 关初始球数下降');
    const currentRatio = ratio(level);
    if (i > 0 && i % 10 === 0 && currentRatio + 0.03 < prevRatio) {
      errors.push('第 ' + level.id + ' 关硬砖比例低于上一主题');
    }
    prevSpeed = level.ball.speed;
    prevBalls = level.ball.count;
    prevRatio = i % 10 === 9 ? currentRatio : prevRatio;

    console.log(
      String(level.id).padStart(2, '0') + ' ' + level.theme.padEnd(8)
      + ' bricks ' + String(level.bricks.length).padStart(3)
      + ' · destructible ' + String(destructible).padStart(3)
      + ' · hard ' + String(hard).padStart(3) + ' (' + (currentRatio * 100).toFixed(1) + '%)'
      + ' · reward ' + rewards + ' · obstacle ' + obstacles
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
  console.log('[validate] 30 关全部通过：3 主题 × 10 关，schema / 难度 / 可破坏砖块均合法');
}

main();
