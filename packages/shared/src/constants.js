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
};

export const STEP = 1 / 120;
export const MAX_STEPS_PER_FRAME = 8;

export const SKILL_SLOTS = 4;
export const SKILL_IDS = ['multiBall', 'widePaddle', 'split', 'slow'];

export const SKILL = {
  wideStep: 0.4,
  wideCap: 2.0,
  wideMaxStacks: 3,
  slowScale: 0.85,
  slowFloor: 0.5,
  slowMaxStacks: 5,
  splitAngleDeg: 30,
  splitCooldown: 0.3,
};

export const DEBUFF_IDS = ['shrink', 'speed', 'reverse'];

export const DEBUFF = {
  shrinkScale: 0.65,
  speedScale: 1.3,
};

export const RULES = {
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
