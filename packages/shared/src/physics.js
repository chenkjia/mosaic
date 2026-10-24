import {
  BALL, BOARD, DEBUFF, DEBUFF_IDS, PADDLE, RULES, SKILL, SKILL_IDS,
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
  const cell = level.cell;
  const scale = cell / BOARD.cell;
  const originX = (BOARD.w - level.cols * cell) / 2;
  let originY = 0;
  if (level.anchor === 'bottom') originY = BOARD.h - level.rows * cell;
  else if (level.anchor === 'center') originY = Math.max(0, Math.floor((BOARD.h - level.rows * cell) / 2));
  const paddleW = PADDLE.w * scale;
  const paddleH = PADDLE.h * scale;
  const state = {
    version: 1,
    levelId: level.id,
    theme: level.theme,
    seed: rngSeed || 1,
    phase: 'ready',
    time: 0,
    failY: Math.max(BOARD.h, finite(opts.failY, BOARD.h)),
    board: {
      w: BOARD.w,
      h: BOARD.h,
      cell,
      scale,
      inset: BOARD.inset,
      cols: level.cols,
      rows: level.rows,
      originX,
      originY,
    },
    palette: level.palette.slice(),
    levelSpeed: level.ball.speed,
    bricks: [],
    balls: [],
    baseBallR: BALL.r * scale,
    bigBall: false,
    paddle: {
      x: BOARD.w / 2,
      y: BOARD.h - PADDLE.bottomInset - paddleH / 2,
      w: paddleW,
      h: paddleH,
      baseW: paddleW,
    },
    drops: [],
    skillStacks: { widePaddle: 0, slow: 0 },
    debuffs: { shrink: 0, speed: 0, reverse: 0 },
    reviveUsed: false,
    rng: createRng(rngSeed),
    nextId: 1,
    stats: { total: 0, left: 0 },
  };

  for (let i = 0; i < level.bricks.length; i += 1) {
    const brick = level.bricks[i];
    state.bricks.push({
      id: 'b' + i,
      col: brick.x,
      row: brick.y,
      x: originX + brick.x * cell + BOARD.inset,
      y: originY + brick.y * cell + BOARD.inset,
      w: cell - BOARD.inset * 2,
      h: cell - BOARD.inset * 2,
      type: brick.type,
      color: brick.color,
      hp: brick.hp,
      maxHp: brick.hp,
      debuff: brick.debuff || null,
      alive: true,
    });
  }
  state.stats.total = countDestructible(level.bricks);
  state.stats.left = state.stats.total;

  const count = clamp(level.ball.count, 1, BALL.cap);
  for (let i = 0; i < count; i += 1) {
    addBall(state, 'blue', true, (i - (count - 1) / 2) * 22 * scale);
  }
  return state;
}

export function addBall(state, kind, docked, offset) {
  if (state.balls.length >= BALL.cap) return null;
  const type = kind || 'blue';
  const isDocked = docked == null ? state.phase !== 'playing' : !!docked;
  const id = state.nextId;
  state.nextId += 1;
  const radius = state.bigBall ? state.baseBallR * SKILL.bigBallScale : state.baseBallR;
  const ball = {
    id,
    x: state.paddle.x,
    y: state.paddle.y - state.paddle.h / 2 - radius - 1,
    vx: 0,
    vy: 0,
    r: radius,
    kind: type,
    docked: isDocked,
    dockOffset: 0,
    splitCooldown: 0,
    piercing: !!state.bigBall,
    pierced: {},
  };
  if (isDocked) {
    const count = state.balls.length + 1;
    const gap = 18 * (state.board.scale || 1);
    ball.dockOffset = offset == null ? (count % 2 === 0 ? 1 : -1) * Math.ceil(count / 2) * gap : offset;
    ball.x = clamp(state.paddle.x + ball.dockOffset, radius, BOARD.w - radius);
  } else {
    const dir = chance(state.rng, 0.5) ? 1 : -1;
    const angle = (RULES.launchAngleDeg + nextRange(state.rng, -RULES.launchJitterDeg, RULES.launchJitterDeg)) * DEG;
    ball.x = state.paddle.x;
    ball.y = state.paddle.y - state.paddle.h / 2 - radius - 1;
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

export function skillMultiplier(state, skill) {
  if (skill === 'widePaddle') {
    return Math.min(SKILL.wideCap, 1 + SKILL.wideStep * state.skillStacks.widePaddle);
  }
  if (skill === 'slow') {
    return Math.max(SKILL.slowFloor, Math.pow(SKILL.slowScale, state.skillStacks.slow));
  }
  return 1;
}

export function skillCanCast(state, skill) {
  if (skill === 'bigBall') return !state.bigBall;
  if (skill === 'split') {
    return state.balls.length < BALL.cap && state.balls.some((ball) => !ball.docked);
  }
  if (skill === 'widePaddle') return state.skillStacks.widePaddle < SKILL.wideMaxStacks;
  if (skill === 'slow') return state.skillStacks.slow < SKILL.slowMaxStacks;
  return false;
}

export function castSkill(state, skill) {
  if (!SKILL_IDS.includes(skill)) {
    return { ok: false, skill: null, reason: 'unknown', events: [] };
  }
  if (!skillCanCast(state, skill)) {
    const reason = skill === 'split' && state.balls.length < BALL.cap ? 'noMovingBall' : 'capped';
    return { ok: false, skill, reason, events: [] };
  }

  const events = [{ type: 'skillUsed', skill }];
  if (skill === 'bigBall') {
    state.bigBall = true;
    const radius = state.baseBallR * SKILL.bigBallScale;
    for (let i = 0; i < state.balls.length; i += 1) {
      const ball = state.balls[i];
      ball.r = radius;
      ball.piercing = true;
      ball.pierced = {};
    }
    events[0].radius = radius;
  } else if (skill === 'widePaddle') {
    state.skillStacks.widePaddle += 1;
    updatePaddleWidth(state);
  } else if (skill === 'split') {
    splitAllBalls(state, events);
  } else if (skill === 'slow') {
    state.skillStacks.slow += 1;
  }
  if (skill === 'widePaddle' || skill === 'slow') {
    events[0].stacks = state.skillStacks[skill];
    events[0].multiplier = skillMultiplier(state, skill);
  }
  return { ok: true, skill, events };
}

function splitAllBalls(state, events) {
  const moving = state.balls.filter((ball) => !ball.docked);
  let spawnedCount = 0;
  let blocked = 0;
  for (let i = 0; i < moving.length; i += 1) {
    const source = moving[i];
    if (state.balls.length >= BALL.cap) {
      blocked += 1;
      continue;
    }
    const speed = Math.hypot(source.vx, source.vy) || state.levelSpeed;
    const angle = Math.atan2(source.vy, source.vx)
      + (chance(state.rng, 0.5) ? 1 : -1) * SKILL.splitAngleDeg * DEG;
    const spawned = addBall(state, source.kind, false);
    if (!spawned) {
      blocked += 1;
      continue;
    }
    spawned.x = source.x + Math.cos(angle);
    spawned.y = source.y + Math.sin(angle);
    spawned.vx = Math.cos(angle) * speed;
    spawned.vy = Math.sin(angle) * speed;
    spawned.splitCooldown = SKILL.splitCooldown;
    spawnedCount += 1;
    events.push({
      type: 'ballSpawned',
      ballId: spawned.id,
      kind: spawned.kind,
      source: 'splitAll',
    });
  }
  if (blocked > 0) events.push({ type: 'splitBlocked', count: blocked, spawned: spawnedCount });
}

function updatePaddleWidth(state) {
  const wide = skillMultiplier(state, 'widePaddle');
  const shrink = Math.pow(DEBUFF.shrinkScale, state.debuffs.shrink);
  state.paddle.w = state.paddle.baseW * wide * shrink;
  const half = state.paddle.w / 2;
  state.paddle.x = clamp(state.paddle.x, half, BOARD.w - half);
}

export function syncPaddleWidth(state) {
  updatePaddleWidth(state);
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
    ball.x = clamp(state.paddle.x + ball.dockOffset, ball.r, BOARD.w - ball.r);
    ball.y = state.paddle.y - state.paddle.h / 2 - ball.r - 1;
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

function brickOverlap(ball, brick) {
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
  return { nx, ny, penetration };
}

function collideBrick(ball, brick) {
  const hit = brickOverlap(ball, brick);
  if (!hit) return null;
  const { nx, ny, penetration } = hit;
  const vn = ball.vx * nx + ball.vy * ny;
  if (vn < 0) {
    ball.vx -= 2 * vn * nx;
    ball.vy -= 2 * vn * ny;
  }
  ball.x += nx * (penetration + 0.01);
  ball.y += ny * (penetration + 0.01);
  return { nx, ny };
}

function pushBrickBump(events, brick, hit) {
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
    debuff: brick.debuff || null,
    x: center.x,
    y: center.y,
  });
  if (brick.hp > 0) return;

  brick.alive = false;
  state.stats.left -= 1;
  events.push({
    type: 'brickBreak',
    brickId: brick.id,
    kind: brick.type,
    color: brick.color,
    debuff: brick.debuff || null,
    x: center.x,
    y: center.y,
  });
  if (brick.type === 'reward') spawnRewardDrop(state, center, events);
  if (brick.type === 'debuff') spawnDebuffDrop(state, brick.debuff, center, events);
  if (state.stats.left <= 0) {
    state.phase = 'cleared';
    events.push({ type: 'levelClear' });
  }
}

export function triggerDebuff(state, kind) {
  if (!DEBUFF_IDS.includes(kind)) return null;
  if (kind === 'reverse') {
    state.debuffs.reverse = 1;
  } else {
    state.debuffs[kind] += 1;
  }
  if (kind === 'shrink') updatePaddleWidth(state);
  return {
    type: 'debuffTriggered',
    debuff: kind,
    stacks: state.debuffs[kind],
  };
}

function spawnRewardDrop(state, center, events) {
  const available = SKILL_IDS.filter((skill) => skill !== 'bigBall' && skillCanCast(state, skill));
  if (available.length === 0) {
    events.push({ type: 'skillFull', skill: null });
    return;
  }
  const skill = available[nextInt(state.rng, 0, available.length - 1)];
  const drop = {
    id: state.nextId,
    x: center.x,
    y: center.y,
    vy: RULES.dropSpeed,
    r: RULES.dropRadius * (state.board.scale || 1),
    kind: 'skill',
    skill,
  };
  state.nextId += 1;
  state.drops.push(drop);
  events.push({ type: 'dropSpawn', dropId: drop.id, kind: drop.kind, skill: drop.skill });
}

function spawnDebuffDrop(state, debuff, center, events) {
  if (!DEBUFF_IDS.includes(debuff)) return;
  const drop = {
    id: state.nextId,
    x: center.x,
    y: center.y,
    vy: RULES.dropSpeed,
    r: RULES.dropRadius * (state.board.scale || 1),
    kind: 'debuff',
    debuff,
  };
  state.nextId += 1;
  state.drops.push(drop);
  events.push({ type: 'dropSpawn', dropId: drop.id, kind: drop.kind, debuff: drop.debuff });
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

function updateEffects(state) {
  updatePaddleWidth(state);
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
      if (drop.kind === 'debuff') {
        const event = triggerDebuff(state, drop.debuff);
        if (event) {
          event.x = drop.x;
          event.y = drop.y;
          events.push(event);
        }
        events.push({ type: 'debuffPickup', debuff: drop.debuff, stacks: state.debuffs[drop.debuff] });
      } else {
        const result = castSkill(state, drop.skill);
        if (result.ok) {
          events.push({ type: 'skillPickup', skill: drop.skill });
          for (let e = 0; e < result.events.length; e += 1) events.push(result.events[e]);
        } else {
          events.push({ type: 'skillWasted', skill: drop.skill, reason: result.reason });
        }
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
    const reverse = state.debuffs.reverse > 0;
    const target = reverse ? BOARD.w - input.paddleX : input.paddleX;
    state.paddle.x = clamp(target, half, BOARD.w - half);
  }
  if (input && input.launch && state.phase === 'ready') launchDocked(state, events);

  updateEffects(state);

  const slow = skillMultiplier(state, 'slow');
  const speed = Math.pow(DEBUFF.speedScale, state.debuffs.speed);
  const move = delta * slow * speed;

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
    if (ball.piercing) {
      const touching = {};
      for (let b = 0; b < state.bricks.length; b += 1) {
        const brick = state.bricks[b];
        if (!brick.alive) continue;
        const hit = brickOverlap(ball, brick);
        if (!hit) continue;
        if (brick.type === 'obstacle') {
          const bounce = collideBrick(ball, brick);
          if (bounce) pushBrickBump(events, brick, bounce);
          break;
        }
        touching[brick.id] = 1;
        if (ball.pierced[brick.id]) continue;
        ball.pierced[brick.id] = 1;
        pushBrickBump(events, brick, hit);
        damageBrick(state, brick, 1, events);
        if (state.phase === 'playing') splitGreenBall(state, ball, events);
      }
      for (const id in ball.pierced) {
        if (!touching[id]) delete ball.pierced[id];
      }
    } else {
      for (let b = 0; b < state.bricks.length; b += 1) {
        const brick = state.bricks[b];
        if (!brick.alive) continue;
        const hit = collideBrick(ball, brick);
        if (!hit) continue;
        pushBrickBump(events, brick, hit);
        const damage = ball.kind === 'red' && brick.type !== 'obstacle' ? 2 : 1;
        if (brick.type !== 'obstacle') {
          damageBrick(state, brick, damage, events);
          if (state.phase === 'playing') splitGreenBall(state, ball, events);
        }
        break;
      }
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

export function hashState(state) {
  const text = JSON.stringify(state);
  let hash = 0x811c9dc5;
  for (let i = 0; i < text.length; i += 1) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash >>> 0;
}
