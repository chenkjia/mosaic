import {
  BALL, BOARD, PADDLE, RULES, SKILL, SKILL_IDS, SKILL_SLOTS,
} from './constants.js';
import { chance, createRng, nextFloat, nextInt, nextRange } from './rng.js';
import { countDestructible, parseLevel } from './level.js';

const DEG = Math.PI / 180;

function clamp(value, min, max) {
  return value < min ? min : value > max ? max : value;
}

function finite(value, fallback) {
  return Number.isFinite(value) ? value : fallback;
}

function brickCenter(brick) {
  return { x: brick.x + brick.w / 2, y: brick.y + brick.h / 2 };
}

export function createState(levelInput, seed, options) {
  const level = parseLevel(levelInput);
  const opts = options || {};
  const rngSeed = (seed == null ? level.seed : seed) >>> 0;
  const state = {
    version: 1,
    levelId: level.id,
    theme: level.theme,
    seed: rngSeed || 1,
    phase: 'ready',
    time: 0,
    failY: Math.max(BOARD.h, finite(opts.failY, BOARD.h)),
    board: { w: BOARD.w, h: BOARD.h, cell: BOARD.cell, inset: BOARD.inset, cols: BOARD.cols, rows: BOARD.rows },
    palette: level.palette.slice(),
    levelSpeed: level.ball.speed,
    bricks: [],
    balls: [],
    paddle: {
      x: BOARD.w / 2,
      y: BOARD.h - PADDLE.bottomGap,
      w: PADDLE.w,
      h: PADDLE.h,
      baseW: PADDLE.w,
    },
    drops: [],
    charges: new Array(SKILL_SLOTS).fill(0),
    effects: { wideUntil: 0, laserUntil: 0, laserNext: 0, slowUntil: 0 },
    reviveUsed: false,
    rng: createRng(rngSeed),
    nextId: 1,
    stats: { total: 0, left: 0, destroyed: 0 },
  };

  const rowOffset = level.anchor === 'bottom'
    ? BOARD.rows - level.rows
    : Math.floor((BOARD.rows - level.rows) / 2);

  for (let i = 0; i < level.bricks.length; i += 1) {
    const brick = level.bricks[i];
    state.bricks.push({
      id: 'b' + i,
      col: brick.x,
      row: brick.y,
      x: brick.x * BOARD.cell + BOARD.inset,
      y: (brick.y + rowOffset) * BOARD.cell + BOARD.inset,
      w: BOARD.cell - BOARD.inset * 2,
      h: BOARD.cell - BOARD.inset * 2,
      type: brick.type,
      color: brick.color,
      hp: brick.hp,
      maxHp: brick.hp,
      alive: true,
    });
  }
  state.stats.total = countDestructible(level.bricks);
  state.stats.left = state.stats.total;

  const count = clamp(level.ball.count, 1, BALL.cap);
  for (let i = 0; i < count; i += 1) {
    addBall(state, 'blue', true, (i - (count - 1) / 2) * 22);
  }
  return state;
}

export function addBall(state, kind, docked, offset) {
  if (state.balls.length >= BALL.cap) return null;
  const type = kind || 'blue';
  const isDocked = docked == null ? state.phase !== 'playing' : !!docked;
  const id = state.nextId;
  state.nextId += 1;
  const ball = {
    id,
    x: state.paddle.x,
    y: state.paddle.y - state.paddle.h / 2 - BALL.r - 1,
    vx: 0,
    vy: 0,
    r: BALL.r,
    kind: type,
    docked: isDocked,
    dockOffset: 0,
    splitCooldown: 0,
  };
  if (isDocked) {
    const count = state.balls.length + 1;
    ball.dockOffset = offset == null ? (count % 2 === 0 ? 1 : -1) * Math.ceil(count / 2) * 18 : offset;
    ball.x = clamp(state.paddle.x + ball.dockOffset, BALL.r, BOARD.w - BALL.r);
  } else {
    const dir = chance(state.rng, 0.5) ? 1 : -1;
    const angle = (RULES.launchAngleDeg + nextRange(state.rng, -RULES.launchJitterDeg, RULES.launchJitterDeg)) * DEG;
    ball.x = state.paddle.x;
    ball.y = state.paddle.y - state.paddle.h / 2 - BALL.r - 1;
    ball.vx = Math.sin(angle) * state.levelSpeed * dir;
    ball.vy = -Math.cos(angle) * state.levelSpeed;
  }
  state.balls.push(ball);
  return ball;
}

export function revive(state) {
  if (state.phase !== 'failed' || state.reviveUsed) return false;
  state.reviveUsed = true;
  addBall(state, 'blue', true, 0);
  state.phase = 'ready';
  return true;
}

export function addSkillCharge(state, skill) {
  const index = SKILL_IDS.indexOf(skill);
  if (index < 0) return { ok: false, full: false, index: -1 };
  if (state.charges[index] > 0) return { ok: false, full: true, index };
  state.charges[index] = 1;
  return { ok: true, full: false, index };
}

export function activateSkill(state, index) {
  if (!Number.isInteger(index) || index < 0 || index >= SKILL_SLOTS) {
    return { ok: false, skill: null, events: [] };
  }
  const skill = SKILL_IDS[index];
  if (state.charges[index] <= 0) return { ok: false, skill, events: [] };
  state.charges[index] = 0;
  const events = [{ type: 'skillUsed', skill, slot: index }];

  if (skill === 'multiBall') {
    for (let i = 0; i < 2; i += 1) {
      const ball = addBall(state, 'blue', state.phase !== 'playing');
      if (ball) events.push({ type: 'ballSpawned', ballId: ball.id, kind: ball.kind, source: 'skill' });
    }
  } else if (skill === 'widePaddle') {
    state.effects.wideUntil = state.time + SKILL.wideDuration;
    updatePaddleWidth(state);
  } else if (skill === 'laser') {
    state.effects.laserUntil = state.time + SKILL.laserDuration;
    state.effects.laserNext = state.time;
  } else if (skill === 'slow') {
    state.effects.slowUntil = state.time + SKILL.slowDuration;
  }
  return { ok: true, skill, events };
}

function updatePaddleWidth(state) {
  const wide = state.time < state.effects.wideUntil;
  state.paddle.w = state.paddle.baseW * (wide ? PADDLE.wideScale : 1);
  const half = state.paddle.w / 2;
  state.paddle.x = clamp(state.paddle.x, half, BOARD.w - half);
}

function launchDocked(state, events) {
  for (let i = 0; i < state.balls.length; i += 1) {
    const ball = state.balls[i];
    if (!ball.docked) continue;
    ball.docked = false;
    const dir = chance(state.rng, 0.5) ? 1 : -1;
    const angle = (RULES.launchAngleDeg + nextRange(state.rng, -RULES.launchJitterDeg, RULES.launchJitterDeg)) * DEG;
    ball.vx = Math.sin(angle) * state.levelSpeed * dir;
    ball.vy = -Math.cos(angle) * state.levelSpeed;
    events.push({ type: 'ballLaunched', ballId: ball.id, kind: ball.kind });
  }
  state.phase = 'playing';
}

function moveDocked(state) {
  for (let i = 0; i < state.balls.length; i += 1) {
    const ball = state.balls[i];
    if (!ball.docked) continue;
    ball.x = clamp(state.paddle.x + ball.dockOffset, BALL.r, BOARD.w - BALL.r);
    ball.y = state.paddle.y - state.paddle.h / 2 - BALL.r - 1;
    ball.vx = 0;
    ball.vy = 0;
  }
}

function collideWalls(state, ball, events) {
  if (ball.x - ball.r < 0) {
    ball.x = ball.r;
    if (ball.vx < 0) ball.vx = -ball.vx;
    events.push({ type: 'wallHit', side: 'left', ballId: ball.id });
  } else if (ball.x + ball.r > BOARD.w) {
    ball.x = BOARD.w - ball.r;
    if (ball.vx > 0) ball.vx = -ball.vx;
    events.push({ type: 'wallHit', side: 'right', ballId: ball.id });
  }
  if (ball.y - ball.r < 0) {
    ball.y = ball.r;
    if (ball.vy < 0) ball.vy = -ball.vy;
    events.push({ type: 'wallHit', side: 'top', ballId: ball.id });
  }
}

function collidePaddle(state, ball, events) {
  const paddle = state.paddle;
  const half = paddle.w / 2;
  const top = paddle.y - paddle.h / 2;
  const bottom = paddle.y + paddle.h / 2;
  if (ball.vy <= 0) return;
  if (ball.y + ball.r < top || ball.y - ball.r > bottom) return;
  if (ball.x + ball.r < paddle.x - half || ball.x - ball.r > paddle.x + half) return;

  ball.y = top - ball.r - 0.01;
  let offset = (ball.x - paddle.x) / half;
  offset = clamp(offset, -1, 1);
  let sign = offset < 0 ? -1 : 1;
  if (Math.abs(offset) < 0.001) sign = ball.vx < 0 ? -1 : 1;
  const angle = (RULES.bounceMinDeg + (RULES.bounceMaxDeg - RULES.bounceMinDeg) * Math.abs(offset)) * DEG;
  const speed = state.levelSpeed;
  ball.vx = Math.sin(angle) * speed * sign;
  ball.vy = -Math.cos(angle) * speed;
  events.push({ type: 'paddleHit', ballId: ball.id, offset, angle });
}

function collideBrick(ball, brick) {
  const left = brick.x;
  const right = brick.x + brick.w;
  const top = brick.y;
  const bottom = brick.y + brick.h;
  const cx = clamp(ball.x, left, right);
  const cy = clamp(ball.y, top, bottom);
  const dx = ball.x - cx;
  const dy = ball.y - cy;
  const dist2 = dx * dx + dy * dy;
  if (dist2 >= ball.r * ball.r) return null;

  let nx = 0;
  let ny = 0;
  let penetration = 0;
  if (dist2 > 1e-8) {
    const dist = Math.sqrt(dist2);
    nx = dx / dist;
    ny = dy / dist;
    penetration = ball.r - dist;
  } else {
    const toLeft = ball.x - left;
    const toRight = right - ball.x;
    const toTop = ball.y - top;
    const toBottom = bottom - ball.y;
    const min = Math.min(toLeft, toRight, toTop, toBottom);
    if (min === toLeft) {
      nx = -1;
      penetration = toLeft + ball.r;
    } else if (min === toRight) {
      nx = 1;
      penetration = toRight + ball.r;
    } else if (min === toTop) {
      ny = -1;
      penetration = toTop + ball.r;
    } else {
      ny = 1;
      penetration = toBottom + ball.r;
    }
  }

  const vn = ball.vx * nx + ball.vy * ny;
  if (vn < 0) {
    ball.vx -= 2 * vn * nx;
    ball.vy -= 2 * vn * ny;
  }
  ball.x += nx * (penetration + 0.01);
  ball.y += ny * (penetration + 0.01);
  return { nx, ny };
}

function damageBrick(state, brick, amount, events) {
  if (!brick.alive || brick.type === 'obstacle') return;
  brick.hp -= amount;
  const center = brickCenter(brick);
  events.push({
    type: 'brickHit',
    brickId: brick.id,
    damage: amount,
    hp: Math.max(0, brick.hp),
    kind: brick.type,
    color: brick.color,
    x: center.x,
    y: center.y,
  });
  if (brick.hp > 0) return;

  brick.alive = false;
  state.stats.left -= 1;
  state.stats.destroyed += 1;
  events.push({
    type: 'brickBreak',
    brickId: brick.id,
    kind: brick.type,
    color: brick.color,
    x: center.x,
    y: center.y,
  });
  if (brick.type === 'reward') spawnRewardDrop(state, center, events);
  if (state.stats.left <= 0) {
    state.phase = 'cleared';
    events.push({ type: 'levelClear' });
  }
}

function spawnRewardDrop(state, center, events) {
  if (!chance(state.rng, RULES.skillDropChance)) return;
  const available = [];
  for (let i = 0; i < SKILL_SLOTS; i += 1) {
    if (state.charges[i] <= 0) available.push(i);
  }
  if (available.length === 0) return;
  const skill = SKILL_IDS[available[nextInt(state.rng, 0, available.length - 1)]];
  const drop = {
    id: state.nextId,
    x: center.x,
    y: center.y,
    vy: RULES.dropSpeed,
    r: RULES.dropRadius,
    kind: 'skill',
    amount: 0,
    skill,
  };
  state.nextId += 1;
  state.drops.push(drop);
  events.push({ type: 'dropSpawn', dropId: drop.id, kind: drop.kind, skill: drop.skill, amount: 0 });
}

function splitGreenBall(state, ball, events) {
  if (ball.kind !== 'green' || ball.splitCooldown > 0) return;
  if (state.balls.length >= BALL.cap) return;
  const baseAngle = Math.atan2(ball.vy, ball.vx);
  const offset = (chance(state.rng, 0.5) ? 1 : -1) * (35 + nextFloat(state.rng) * 10) * DEG;
  const angle = baseAngle + offset;
  const spawned = addBall(state, 'blue', false);
  if (!spawned) return;
  spawned.x = ball.x;
  spawned.y = ball.y;
  spawned.vx = Math.cos(angle) * state.levelSpeed;
  spawned.vy = Math.sin(angle) * state.levelSpeed;
  ball.splitCooldown = SKILL.splitCooldown;
  events.push({ type: 'ballSpawned', ballId: spawned.id, kind: 'blue', source: 'split' });
}

function findLaserTarget(state) {
  const paddleCol = clamp(Math.floor(state.paddle.x / BOARD.cell), 0, BOARD.cols - 1);
  const dirs = [0, -1, 1];
  for (let radius = 0; radius < BOARD.cols; radius += 1) {
    for (let d = 0; d < dirs.length; d += 1) {
      const col = paddleCol + dirs[d] * radius;
      if (col < 0 || col >= BOARD.cols) continue;
      let target = null;
      for (let i = 0; i < state.bricks.length; i += 1) {
        const brick = state.bricks[i];
        if (!brick.alive || brick.type === 'obstacle' || brick.col !== col) continue;
        if (!target || brick.y > target.y) target = brick;
      }
      if (target) return target;
    }
  }
  return null;
}

function fireLaser(state, events) {
  const target = findLaserTarget(state);
  if (!target) return;
  const center = brickCenter(target);
  events.push({ type: 'laserFire', x: center.x, y: center.y, brickId: target.id });
  damageBrick(state, target, 1, events);
}

function updateEffects(state, events) {
  updatePaddleWidth(state);
  if (state.time < state.effects.slowUntil) {
    // 减速通过位移缩放实现，速度矢量与确定性保持不变。
  }
  if (state.time < state.effects.laserUntil) {
    if (state.time >= state.effects.laserNext) {
      state.effects.laserNext = state.time + SKILL.laserInterval;
      fireLaser(state, events);
    }
  }
}

function collideBalls(state, events) {
  const balls = state.balls;
  for (let i = 0; i < balls.length; i += 1) {
    const a = balls[i];
    for (let j = i + 1; j < balls.length; j += 1) {
      const b = balls[j];
      let dx = b.x - a.x;
      let dy = b.y - a.y;
      let dist2 = dx * dx + dy * dy;
      const min = a.r + b.r;
      if (dist2 >= min * min) continue;
      let dist = Math.sqrt(dist2);
      let nx;
      let ny;
      if (dist < 1e-6) {
        nx = 1;
        ny = 0;
        dist = 0;
      } else {
        nx = dx / dist;
        ny = dy / dist;
      }
      const overlap = min - dist;
      a.x -= nx * overlap * 0.5;
      a.y -= ny * overlap * 0.5;
      b.x += nx * overlap * 0.5;
      b.y += ny * overlap * 0.5;
      const rvn = (b.vx - a.vx) * nx + (b.vy - a.vy) * ny;
      if (rvn < 0) {
        a.vx += rvn * nx;
        a.vy += rvn * ny;
        b.vx -= rvn * nx;
        b.vy -= rvn * ny;
      }
      events.push({ type: 'ballCollision', a: a.id, b: b.id });
    }
  }
}

function collectDrops(state, events, delta) {
  const paddle = state.paddle;
  const half = paddle.w / 2;
  const line = paddle.y - paddle.h / 2;
  for (let i = state.drops.length - 1; i >= 0; i -= 1) {
    const drop = state.drops[i];
    drop.y += drop.vy * delta;
    if (drop.y + drop.r >= line && drop.y - drop.r <= paddle.y + paddle.h / 2
      && Math.abs(drop.x - paddle.x) <= half + drop.r) {
      state.drops.splice(i, 1);
      const added = addSkillCharge(state, drop.skill);
      if (added.ok) {
        events.push({ type: 'skillPickup', skill: drop.skill, slot: added.index });
      } else {
        events.push({ type: 'skillFull', skill: drop.skill });
      }
    } else if (drop.y + drop.r > state.failY) {
      state.drops.splice(i, 1);
      events.push({ type: 'dropLost', dropId: drop.id });
    }
  }
}

export function step(state, input, dt) {
  const events = [];
  if (state.phase !== 'ready' && state.phase !== 'playing') return { state, events };
  const delta = Number.isFinite(dt) && dt > 0 ? dt : 1 / 120;
  state.time += delta;

  if (input && Number.isFinite(input.paddleX)) {
    const half = state.paddle.w / 2;
    state.paddle.x = clamp(input.paddleX, half, BOARD.w - half);
  }
  if (input && input.launch && state.phase === 'ready') launchDocked(state, events);

  updateEffects(state, events);

  const slow = state.time < state.effects.slowUntil ? SKILL.slowScale : 1;
  const move = delta * slow;

  for (let i = 0; i < state.balls.length; i += 1) {
    const ball = state.balls[i];
    if (ball.splitCooldown > 0) ball.splitCooldown -= delta;
    if (ball.docked) continue;
    ball.x += ball.vx * move;
    ball.y += ball.vy * move;
    collideWalls(state, ball, events);
  }
  moveDocked(state);

  for (let i = 0; i < state.balls.length && state.phase === 'playing'; i += 1) {
    const ball = state.balls[i];
    if (ball.docked) continue;
    for (let b = 0; b < state.bricks.length; b += 1) {
      const brick = state.bricks[b];
      if (!brick.alive) continue;
      const hit = collideBrick(ball, brick);
      if (!hit) continue;
      const damage = ball.kind === 'red' && brick.type !== 'obstacle' ? 2 : 1;
      events.push({
        type: 'brickBump',
        brickId: brick.id,
        kind: brick.type,
        color: brick.color,
        x: brick.x + brick.w / 2,
        y: brick.y + brick.h / 2,
        nx: hit.nx,
        ny: hit.ny,
      });
      if (brick.type !== 'obstacle') {
        damageBrick(state, brick, damage, events);
        if (state.phase === 'playing') splitGreenBall(state, ball, events);
      }
      break;
    }
  }

  for (let i = 0; i < state.balls.length && state.phase === 'playing'; i += 1) {
    const ball = state.balls[i];
    if (ball.docked) continue;
    collidePaddle(state, ball, events);
  }

  collideBalls(state, events);
  collectDrops(state, events, delta);

  for (let i = state.balls.length - 1; i >= 0; i -= 1) {
    const ball = state.balls[i];
    if (!ball.docked && ball.y + ball.r > state.failY) {
      state.balls.splice(i, 1);
      events.push({ type: 'ballLost', ballId: ball.id });
    }
  }
  if (state.phase === 'playing' && state.balls.length === 0) {
    state.phase = 'failed';
    events.push({ type: 'levelFailed' });
  }

  for (let i = 0; i < state.balls.length; i += 1) {
    const ball = state.balls[i];
    ball.x = finite(ball.x, state.paddle.x);
    ball.y = finite(ball.y, state.paddle.y);
    ball.vx = finite(ball.vx, 0);
    ball.vy = finite(ball.vy, 0);
  }
  return { state, events };
}

export function clearPercent(state) {
  if (!state.stats || state.stats.total <= 0) return 100;
  if (state.stats.left <= 0) return 100;
  return Math.min(99, Math.floor((state.stats.destroyed / state.stats.total) * 100));
}

export function hashState(state) {
  const text = JSON.stringify(state);
  let hash = 0x811c9dc5;
  for (let i = 0; i < text.length; i += 1) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash >>> 0;
}
