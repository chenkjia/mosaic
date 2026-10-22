import test from 'node:test';
import assert from 'node:assert/strict';
import {
  BOARD, BALL, PADDLE, SKILL, SKILL_IDS, clearPercent, createState, hashState, step,
  activateSkill, addBall, revive, addSkillCharge,
} from '../src/index.js';
import { cellBrick, makeBrick, makeLevel, putBall } from './helpers.mjs';

const DT = 1 / 120;

function singleBrickLevel(type, hp) {
  return makeLevel([makeBrick(10, 10, type, hp)]);
}

test('createState 规格与坐标有限', () => {
  const state = createState(makeLevel([makeBrick(5, 5)]), 42);
  assert.equal(state.board.w, BOARD.w);
  assert.equal(state.board.h, BOARD.h);
  assert.equal(state.paddle.w, PADDLE.w);
  assert.equal(state.paddle.y, BOARD.h - PADDLE.bottomGap);
  assert.equal(state.phase, 'ready');
  assert.equal(state.failY, BOARD.h);
  assert.equal(state.stats.total, 1);
  assert.deepEqual(state.charges, [0, 0, 0, 0]);
  assert.equal(state.balls.length, 1);
  assert.equal(state.balls[0].docked, true);
  const brick = state.bricks[0];
  assert.equal(brick.x, 5 * BOARD.cell + BOARD.inset);
  assert.equal(brick.w, BOARD.cell - BOARD.inset * 2);
  for (const value of [state.paddle.x, state.paddle.y, brick.x, brick.y, state.balls[0].x, state.balls[0].y]) {
    assert.ok(Number.isFinite(value));
  }
});

test('同种子同输入 600 步逐帧一致', () => {
  const bricks = [];
  for (let y = 3; y < 9; y += 1) {
    for (let x = 5; x < 12; x += 1) {
      const type = (x + y) % 4 === 0 ? 'hard' : 'normal';
      bricks.push(makeBrick(x, y, type, undefined, (x + y) % 13 + 1));
    }
  }
  bricks.push(makeBrick(9, 12, 'reward'));
  bricks.push(makeBrick(16, 10, 'obstacle'));
  const a = createState(makeLevel(bricks, { ballCount: 2 }), 987654);
  const b = createState(makeLevel(bricks, { ballCount: 2 }), 987654);
  for (let i = 0; i < 600; i += 1) {
    const input = {
      paddleX: 357 + Math.sin(i / 19) * 190,
      launch: i === 0,
    };
    step(a, input, DT);
    step(b, input, DT);
    assert.equal(hashState(a), hashState(b), '第 ' + i + ' 步状态漂移');
    assert.ok(Number.isFinite(a.paddle.x) && Number.isFinite(a.time));
    for (const ball of a.balls) {
      assert.ok(Number.isFinite(ball.x) && Number.isFinite(ball.y));
      assert.ok(Number.isFinite(ball.vx) && Number.isFinite(ball.vy));
    }
  }
});

test('球-砖：正面、侧面、角落均反弹并造成伤害', () => {
  const front = createState(singleBrickLevel('normal'), 1);
  putBall(front, { x: 357, y: 336, vy: 300 });
  let result = step(front, null, DT).events;
  assert.ok(result.some((e) => e.type === 'brickHit'));
  assert.ok(front.balls[0].vy < 0);
  assert.equal(cellBrick(front, 10, 10).alive, false);

  const side = createState(singleBrickLevel('hard'), 1);
  putBall(side, { x: 334, y: 357, vx: 300 });
  result = step(side, null, DT).events;
  assert.ok(result.some((e) => e.type === 'brickHit'));
  assert.ok(side.balls[0].vx < 0);
  assert.equal(cellBrick(side, 10, 10).hp, 1);

  const corner = createState(singleBrickLevel('hard'), 1);
  putBall(corner, { x: 336, y: 336, vx: 200, vy: 200 });
  result = step(corner, null, DT).events;
  assert.ok(result.some((e) => e.type === 'brickHit'));
  assert.ok(corner.balls[0].vx < 0);
  assert.ok(corner.balls[0].vy < 0);
  assert.equal(cellBrick(corner, 10, 10).hp, 1);
});

test('球-墙：左右上三面反弹', () => {
  const left = createState(makeLevel([makeBrick(20, 0)]), 1);
  putBall(left, { x: 6, y: 500, vx: -300 });
  step(left, null, DT);
  assert.ok(left.balls[0].vx > 0);
  assert.equal(left.balls[0].x, BALL.r);

  const right = createState(makeLevel([makeBrick(20, 0)]), 1);
  putBall(right, { x: BOARD.w - 6, y: 500, vx: 300 });
  step(right, null, DT);
  assert.ok(right.balls[0].vx < 0);
  assert.equal(right.balls[0].x, BOARD.w - BALL.r);

  const top = createState(makeLevel([makeBrick(20, 0)]), 1);
  putBall(top, { x: 300, y: 6, vy: -300 });
  step(top, null, DT);
  assert.ok(top.balls[0].vy > 0);
  assert.equal(top.balls[0].y, BALL.r);
});

test('球-挡板：左中右击球点映射到不同反弹角', () => {
  const samples = [-60, 0, 60].map((offset) => {
    const state = createState(makeLevel([makeBrick(20, 0)]), 1);
    putBall(state, { x: state.paddle.x + offset, y: 898, vy: 260 });
    step(state, null, DT);
    return { offset, ball: state.balls[0] };
  });
  assert.ok(samples[0].ball.vx < 0);
  assert.ok(samples[2].ball.vx > 0);
  const centerAngle = Math.atan2(Math.abs(samples[1].ball.vx), Math.abs(samples[1].ball.vy));
  assert.ok(Math.abs(centerAngle - 15 * Math.PI / 180) < 0.02);
  for (const sample of samples) {
    assert.ok(sample.ball.vy < 0);
    assert.ok(Math.abs(Math.hypot(sample.ball.vx, sample.ball.vy) - 640) < 0.5);
  }
});

test('球-球：对心弹性碰撞并完成位置分离', () => {
  const state = createState(makeLevel([makeBrick(20, 0)]), 1);
  state.phase = 'playing';
  state.balls = [
    { id: 1, x: 334, y: 500, vx: 200, vy: 0, r: 9, kind: 'blue', docked: false, dockOffset: 0, splitCooldown: 0 },
    { id: 2, x: 350, y: 500, vx: -200, vy: 0, r: 9, kind: 'blue', docked: false, dockOffset: 0, splitCooldown: 0 },
  ];
  const { events } = step(state, null, DT);
  assert.ok(events.some((e) => e.type === 'ballCollision'));
  const dx = state.balls[1].x - state.balls[0].x;
  const dy = state.balls[1].y - state.balls[0].y;
  assert.ok(Math.hypot(dx, dy) >= 2 * BALL.r - 0.01);
  assert.ok(state.balls[0].vx < 0);
  assert.ok(state.balls[1].vx > 0);
});

test('球数上限 8：分裂与额外球不再生成', () => {
  const state = createState(makeLevel([makeBrick(20, 0)]), 1);
  state.phase = 'playing';
  for (let i = 0; i < 12; i += 1) addBall(state, 'blue', false);
  assert.equal(state.balls.length, BALL.cap);
  assert.equal(addBall(state, 'blue', false), null);

  state.charges[0] = 1;
  const result = activateSkill(state, 0);
  assert.equal(result.ok, true);
  assert.equal(state.balls.length, BALL.cap);
});

test('球色：蓝对硬砖 1 伤，红对硬砖 2 伤，绿命中分裂', () => {
  const blue = createState(singleBrickLevel('hard'), 1);
  putBall(blue, { x: 357, y: 336, vy: 300, kind: 'blue' });
  step(blue, null, DT);
  assert.equal(cellBrick(blue, 10, 10).hp, 1);
  assert.equal(cellBrick(blue, 10, 10).alive, true);

  const red = createState(singleBrickLevel('hard'), 1);
  putBall(red, { x: 357, y: 336, vy: 300, kind: 'red' });
  step(red, null, DT);
  assert.equal(cellBrick(red, 10, 10).alive, false);

  const green = createState(makeLevel([makeBrick(10, 10, 'normal'), makeBrick(15, 5)]), 2);
  putBall(green, { x: 357, y: 336, vy: 300, kind: 'green' });
  const { events } = step(green, null, DT);
  assert.ok(events.some((e) => e.type === 'ballSpawned' && e.source === 'split'));
  assert.equal(green.balls.length, 2);
  assert.equal(green.balls[1].kind, 'blue');
});

test('障碍不计入清除率分母，破坏完触发过关', () => {
  const state = createState(makeLevel([
    makeBrick(10, 10, 'normal'),
    makeBrick(11, 10, 'obstacle'),
  ]), 1);
  assert.equal(state.stats.total, 1);
  assert.equal(clearPercent(state), 0);
  putBall(state, { x: 357, y: 336, vy: 300 });
  const { events } = step(state, null, DT);
  assert.equal(state.phase, 'cleared');
  assert.equal(clearPercent(state), 100);
  assert.ok(events.some((e) => e.type === 'levelClear'));
});

test('部分清除四舍五入向下且不到 100', () => {
  const state = createState(makeLevel([
    makeBrick(10, 10), makeBrick(11, 10), makeBrick(12, 10),
  ]), 1);
  putBall(state, { x: 357, y: 336, vy: 300 });
  step(state, null, DT);
  assert.equal(clearPercent(state), 33);
  assert.equal(state.phase, 'playing');
});

test('球全部掉落 → failed，复活每关一次', () => {
  const state = createState(makeLevel([makeBrick(20, 0)]), 1);
  putBall(state, { x: 300, y: 956, vy: 400 });
  let events = [];
  for (let i = 0; i < 30 && state.phase !== 'failed'; i += 1) {
    events = step(state, null, DT).events;
  }
  assert.equal(state.phase, 'failed');
  assert.ok(events.some((e) => e.type === 'levelFailed'));
  assert.equal(revive(state), true);
  assert.equal(state.phase, 'ready');
  assert.equal(state.balls.length, 1);
  assert.equal(state.balls[0].docked, true);
  assert.equal(revive(state), false);
});

test('自定义失败线：球落到失败线以下才丢失', () => {
  const failY = BOARD.h + 160;
  const state = createState(makeLevel([makeBrick(20, 0)]), 1, { failY });
  assert.equal(state.failY, failY);
  putBall(state, { x: 300, y: BOARD.h + 10, vy: 400 });
  let lost = false;
  let events = step(state, null, DT).events;
  assert.ok(!events.some((e) => e.type === 'ballLost'));
  for (let i = 0; i < 80 && !lost; i += 1) {
    events = step(state, null, DT).events;
    lost = events.some((e) => e.type === 'ballLost');
  }
  assert.equal(lost, true);
  assert.equal(state.phase, 'failed');
});

test('技能：多球、加宽刷新、激光、减速', () => {
  const multi = createState(makeLevel([makeBrick(20, 0)]), 1);
  multi.charges[0] = 1;
  const before = multi.balls.length;
  assert.equal(activateSkill(multi, 0).ok, true);
  assert.equal(multi.balls.length, before + 2);
  assert.equal(multi.charges[0], 0);
  assert.equal(activateSkill(multi, 0).ok, false);

  const wide = createState(makeLevel([makeBrick(20, 0)]), 1);
  wide.charges[1] = 1;
  activateSkill(wide, 1);
  assert.equal(wide.paddle.w, PADDLE.w * PADDLE.wideScale);
  assert.equal(wide.effects.wideUntil, SKILL.wideDuration);
  wide.time = 10;
  wide.charges[1] = 1;
  activateSkill(wide, 1);
  assert.equal(wide.effects.wideUntil, 10 + SKILL.wideDuration);
  wide.time = 26;
  step(wide, null, DT);
  assert.equal(wide.paddle.w, PADDLE.w);

  const laser = createState(makeLevel([makeBrick(10, 10, 'hard')]), 1);
  laser.charges[2] = 1;
  putBall(laser, { x: 300, y: 500, vx: 0, vy: -10 });
  activateSkill(laser, 2);
  let events = step(laser, null, DT).events;
  assert.ok(events.some((e) => e.type === 'laserFire'));
  assert.equal(cellBrick(laser, 10, 10).hp, 1);
  for (let i = 0; i < 61; i += 1) events = step(laser, null, DT).events;
  assert.equal(cellBrick(laser, 10, 10).alive, false);

  const normal = createState(makeLevel([makeBrick(20, 0)]), 1);
  putBall(normal, { x: 100, y: 500, vx: 600 });
  for (let i = 0; i < 120; i += 1) step(normal, null, DT);
  assert.ok(Math.abs(normal.balls[0].x - 700) < 1.5);

  const slow = createState(makeLevel([makeBrick(20, 0)]), 1);
  putBall(slow, { x: 100, y: 500, vx: 600 });
  slow.effects.slowUntil = 20;
  for (let i = 0; i < 120; i += 1) step(slow, null, DT);
  assert.ok(Math.abs(slow.balls[0].x - (100 + 600 * SKILL.slowScale)) < 1.5);
});

test('每块奖励砖必掉技能充能，可被挡板拾取', () => {
  const state = createState(makeLevel([
    makeBrick(10, 14, 'reward'),
    makeBrick(18, 2),
  ]), 1);
  putBall(state, { x: 357, y: 14 * 34 + 1.5 - 10, vy: 300 });
  const { events } = step(state, null, DT);
  assert.ok(events.some((e) => e.type === 'dropSpawn'));
  assert.equal(state.drops.length, 1);
  const drop = state.drops[0];
  assert.equal(drop.kind, 'skill');
  drop.x = state.paddle.x;
  drop.y = state.paddle.y - state.paddle.h / 2 - 20;
  let picked = false;
  for (let i = 0; i < 40 && state.drops.length > 0; i += 1) {
    picked = step(state, null, DT).events.some((e) => e.type === 'skillPickup');
  }
  assert.equal(picked, true);
  assert.equal(state.charges[SKILL_IDS.indexOf(drop.skill)], 1);
});

test('奖励砖拾取只充能，点击释放才生效', () => {
  const state = createState(makeLevel([
    makeBrick(10, 14, 'reward'),
    makeBrick(18, 2),
  ]), 1);
  state.charges[0] = 1;
  state.charges[1] = 1;
  state.charges[2] = 1;
  putBall(state, { x: 357, y: 14 * 34 + 1.5 - 10, vy: 300 });
  const beforeBalls = state.balls.length;
  const { events } = step(state, null, DT);
  assert.ok(events.some((e) => e.type === 'dropSpawn'));
  const drop = state.drops[0];
  assert.equal(drop.skill, 'slow');
  drop.x = state.paddle.x;
  drop.y = state.paddle.y - state.paddle.h / 2 - 20;
  let pickupEvents = [];
  for (let i = 0; i < 40 && state.drops.length > 0; i += 1) {
    pickupEvents = step(state, null, DT).events;
  }
  assert.ok(pickupEvents.some((e) => e.type === 'skillPickup'));
  assert.equal(state.charges[3], 1);
  assert.equal(state.effects.slowUntil, 0);
  assert.equal(state.balls.length, beforeBalls);
  assert.equal(state.phase, 'playing');

  const used = activateSkill(state, 3);
  assert.equal(used.ok, true);
  assert.ok(state.effects.slowUntil > state.time);
  assert.equal(state.charges[3], 0);
});

test('四格技能满时奖励砖不再生成掉落物', () => {
  const state = createState(makeLevel([
    makeBrick(10, 14, 'reward'),
    makeBrick(18, 2),
  ]), 1);
  for (let i = 0; i < state.charges.length; i += 1) state.charges[i] = 1;
  putBall(state, { x: 357, y: 14 * 34 + 1.5 - 10, vy: 300 });
  const { events } = step(state, null, DT);
  assert.ok(events.some((e) => e.type === 'skillFull'));
  assert.equal(state.drops.length, 0);
});

test('技能充能每格最多 1 次，释放后清零', () => {
  const state = createState(makeLevel([makeBrick(20, 0)]), 1);
  assert.equal(addSkillCharge(state, 'multiBall').ok, true);
  assert.equal(state.charges[SKILL_IDS.indexOf('multiBall')], 1);
  const full = addSkillCharge(state, 'multiBall');
  assert.equal(full.ok, false);
  assert.equal(full.full, true);
  assert.equal(activateSkill(state, 0).ok, true);
  assert.equal(state.charges[0], 0);
  assert.equal(addSkillCharge(state, 'multiBall').ok, true);
  assert.equal(addSkillCharge(state, 'unknown').ok, false);
});
