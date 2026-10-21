import { PALETTE } from '../src/index.js';

export function makeBrick(x, y, type, hp, color) {
  const kind = type || 'normal';
  let health = hp;
  if (health == null) {
    if (kind === 'hard') health = 2;
    else if (kind === 'obstacle') health = 0;
    else health = 1;
  }
  return { x, y, type: kind, hp: health, color: color == null ? 5 : color };
}

export function makeLevel(bricks, overrides) {
  const opts = overrides || {};
  return {
    id: opts.id == null ? 1 : opts.id,
    theme: opts.theme || 'animals',
    cols: 21,
    rows: 28,
    palette: PALETTE.slice(),
    seed: opts.seed == null ? 1001 : opts.seed,
    ball: { count: opts.ballCount == null ? 1 : opts.ballCount, speed: opts.speed == null ? 640 : opts.speed },
    anchor: opts.anchor || 'center',
    bricks,
  };
}

export function putBall(state, options) {
  const opts = options || {};
  state.phase = 'playing';
  state.balls = [{
    id: 900,
    x: opts.x,
    y: opts.y,
    vx: opts.vx || 0,
    vy: opts.vy || 0,
    r: 9,
    kind: opts.kind || 'blue',
    docked: false,
    dockOffset: 0,
    splitCooldown: 0,
  }];
  return state.balls[0];
}

export function brickCenter(brick) {
  return { x: brick.x + brick.w / 2, y: brick.y + brick.h / 2 };
}

export function cellBrick(state, col, row) {
  return state.bricks.find((brick) => brick.col === col && brick.row === row);
}
