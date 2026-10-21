export const DESIGN_WIDTH = 750;
export const MIN_DESIGN_H = 1334;

export const BOARD = {
  x: 18,
  y: 160,
  w: 714,
  h: 952,
  cols: 21,
  rows: 28,
  cell: 34,
  inset: 1.5,
  radius: 7,
};

export const BALL = {
  r: 9,
  speed: 640,
  cap: 8,
};

export const PADDLE = {
  w: 150,
  h: 22,
  bottomGap: 40,
  wideScale: 1.4,
};

export const STEP = 1 / 120;
export const MAX_STEPS_PER_FRAME = 8;

export const SKILL_SLOTS = 4;
export const DEFAULT_SLOT_CAPACITY = 2;
export const SLOT_EXPAND_COSTS = [0, 0, 200, 500];
export const SKILL_IDS = ['multiBall', 'widePaddle', 'laser', 'slow'];

export const SKILL = {
  wideDuration: 15,
  laserDuration: 10,
  laserInterval: 0.5,
  slowDuration: 10,
  slowScale: 0.7,
  splitCooldown: 0.3,
};

export const RULES = {
  clearCoins: 20,
  rewardCoinChance: 0.5,
  rewardCoinMin: 1,
  rewardCoinMax: 3,
  launchAngleDeg: 75,
  launchJitterDeg: 5,
  bounceMinDeg: 15,
  bounceMaxDeg: 75,
  dropSpeed: 230,
  dropRadius: 11,
  reviveBalls: 1,
};

export const LEVEL_COUNT = 30;
export const THEMES = ['animals', 'flowers', 'scenery'];
