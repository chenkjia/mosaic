import test from 'node:test';
import assert from 'node:assert/strict';
import * as shared from '../src/index.js';
import {
  BOARD, BALL, PADDLE, SKILL, SKILL_IDS, DEBUFF,
  createState, hashState, step, addBall, revive,
  castSkill, skillCanCast, skillMultiplier, syncPaddleWidth, triggerDebuff,
} from '../src/index.js';
import { cellBrick, makeBrick, makeLevel, putBall } from './helpers.mjs';

const DT = 1 / 120;

function singleBrickLevel(type, hp) {
  return makeLevel([makeBrick(10, 10, type, hp)]);
}

function close(actual, expected, epsilon, label) {
  assert.ok(
    Math.abs(actual - expected) < (epsilon == null ? 1e-9 : epsilon),
    label + ' 期望 ' + expected + ' 实际 ' + actual,
  );
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
  assert.equal(state.stats.left, 1);
  assert.deepEqual(state.skillStacks, { widePaddle: 0, slow: 0 });
  assert.deepEqual(state.debuffs, { shrink: 0, speed: 0, reverse: 0 });
  assert.deepEqual(state.drops, []);
  assert.equal('charges' in state, false);
  assert.equal('effects' in state, false);
  assert.equal(state.balls.length, 1);
  assert.equal(state.balls[0].docked, true);
  const brick = state.bricks[0];
  assert.equal(brick.x, 5 * BOARD.cell + BOARD.inset);
  assert.equal(brick.w, BOARD.cell - BOARD.inset * 2);
  for (const value of [state.paddle.x, state.paddle.y, brick.x, brick.y, state.balls[0].x, state.balls[0].y]) {
    assert.ok(Number.isFinite(value));
  }
});

test('共享层不再导出充能、计时与清除率接口', () => {
  for (const name of ['clearPercent', 'activateSkill', 'addSkillCharge']) {
    assert.equal(name in shared, false, name + ' 应已移除');
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
  bricks.push(makeBrick(13, 7, 'debuff', 1, 8, 'shrink'));
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

test('球数上限 8：分裂与多球不再生成', () => {
  const state = createState(makeLevel([makeBrick(20, 0)]), 1);
  state.phase = 'playing';
  for (let i = 0; i < 12; i += 1) addBall(state, 'blue', false);
  assert.equal(state.balls.length, BALL.cap);
  assert.equal(addBall(state, 'blue', false), null);
  assert.equal(skillCanCast(state, 'multiBall'), false);
  assert.equal(skillCanCast(state, 'split'), false);

  const multi = castSkill(state, 'multiBall');
  assert.equal(multi.ok, false);
  assert.equal(multi.reason, 'capped');
  const split = castSkill(state, 'split');
  assert.equal(split.ok, false);
  assert.equal(split.reason, 'capped');
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

test('障碍不计入剩余数，破坏完触发过关', () => {
  const state = createState(makeLevel([
    makeBrick(10, 10, 'normal'),
    makeBrick(11, 10, 'obstacle'),
  ]), 1);
  assert.equal(state.stats.total, 1);
  assert.equal(state.stats.left, 1);
  putBall(state, { x: 357, y: 336, vy: 300 });
  const { events } = step(state, null, DT);
  assert.equal(state.phase, 'cleared');
  assert.equal(state.stats.left, 0);
  assert.ok(events.some((e) => e.type === 'levelClear'));
});

test('部分破坏只减少剩余数', () => {
  const state = createState(makeLevel([
    makeBrick(10, 10), makeBrick(11, 10), makeBrick(12, 10),
  ]), 1);
  putBall(state, { x: 357, y: 336, vy: 300 });
  step(state, null, DT);
  assert.equal(state.stats.left, 2);
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

test('多球：每次立即 +2 颗，无充能步骤', () => {
  const state = createState(makeLevel([makeBrick(20, 0)]), 1);
  assert.equal(state.balls.length, 1);
  const result = castSkill(state, 'multiBall');
  assert.equal(result.ok, true);
  assert.equal(state.balls.length, 3);
  assert.ok(result.events.some((e) => e.type === 'skillUsed' && e.skill === 'multiBall'));
  assert.equal(result.events.filter((e) => e.type === 'ballSpawned').length, 2);
  assert.ok(state.balls.slice(1).every((ball) => ball.docked));
});

test('加宽：每次 +0.4 倍、本关永久叠加，封顶 2 倍', () => {
  const state = createState(makeLevel([makeBrick(20, 0)]), 1);
  assert.equal(skillMultiplier(state, 'widePaddle'), 1);
  assert.equal(state.paddle.w, PADDLE.w);

  let result = castSkill(state, 'widePaddle');
  assert.equal(result.ok, true);
  assert.equal(state.skillStacks.widePaddle, 1);
  close(state.paddle.w, PADDLE.w * 1.4, 1e-9, '一档宽度');
  assert.equal(result.events[0].stacks, 1);
  close(result.events[0].multiplier, 1.4, 1e-9, '一档倍率');

  castSkill(state, 'widePaddle');
  close(state.paddle.w, PADDLE.w * 1.8, 1e-9, '二档宽度');
  castSkill(state, 'widePaddle');
  close(state.paddle.w, PADDLE.w * SKILL.wideCap, 1e-9, '三档宽度');
  assert.equal(skillCanCast(state, 'widePaddle'), false);

  const blocked = castSkill(state, 'widePaddle');
  assert.equal(blocked.ok, false);
  assert.equal(blocked.reason, 'capped');
  assert.equal(state.skillStacks.widePaddle, SKILL.wideMaxStacks);

  state.time = 50;
  step(state, null, DT);
  close(state.paddle.w, PADDLE.w * SKILL.wideCap, 1e-9, '永久宽度');
});

test('减速：每次 ×0.85、本关永久叠加，封底 0.5 倍', () => {
  const state = createState(makeLevel([makeBrick(20, 0)]), 1);
  const expected = [0.85, 0.7225, 0.614125, 0.52200625, 0.5];
  for (let i = 0; i < expected.length; i += 1) {
    const result = castSkill(state, 'slow');
    assert.equal(result.ok, true);
    assert.equal(state.skillStacks.slow, i + 1);
    close(skillMultiplier(state, 'slow'), expected[i], 1e-9, '第 ' + (i + 1) + ' 档减速');
    close(result.events[0].multiplier, expected[i], 1e-9, '第 ' + (i + 1) + ' 档事件倍率');
  }
  const blocked = castSkill(state, 'slow');
  assert.equal(blocked.ok, false);
  assert.equal(blocked.reason, 'capped');
  assert.equal(state.skillStacks.slow, SKILL.slowMaxStacks);
});

test('减速生效后球速按倍率位移', () => {
  const state = createState(makeLevel([makeBrick(20, 0)]), 1);
  putBall(state, { x: 100, y: 500, vx: 600 });
  castSkill(state, 'slow');
  for (let i = 0; i < 120; i += 1) step(state, null, DT);
  close(state.balls[0].x, 100 + 600 * 0.85, 1.5, '一档减速位移');

  const slow2 = createState(makeLevel([makeBrick(20, 0)]), 1);
  putBall(slow2, { x: 100, y: 500, vx: 600 });
  castSkill(slow2, 'slow');
  castSkill(slow2, 'slow');
  for (let i = 0; i < 120; i += 1) step(slow2, null, DT);
  close(slow2.balls[0].x, 100 + 600 * 0.7225, 1.5, '二档减速位移');
});

test('分裂：所有移动球各分裂一颗同色同速球，停泊球不参与', () => {
  const state = createState(makeLevel([makeBrick(20, 0)]), 1);
  state.phase = 'playing';
  state.nextId = 10;
  state.balls = [
    { id: 1, x: 300, y: 500, vx: 200, vy: -100, r: 9, kind: 'blue', docked: false, dockOffset: 0, splitCooldown: 0 },
    { id: 2, x: 400, y: 500, vx: -150, vy: -80, r: 9, kind: 'green', docked: false, dockOffset: 0, splitCooldown: 0 },
    { id: 3, x: 375, y: 890, vx: 0, vy: 0, r: 9, kind: 'blue', docked: true, dockOffset: 0, splitCooldown: 0 },
  ];
  const speeds = state.balls.slice(0, 2).map((ball) => Math.hypot(ball.vx, ball.vy));
  const result = castSkill(state, 'split');
  assert.equal(result.ok, true);
  assert.equal(state.balls.length, 5);
  const spawnedEvents = result.events.filter((e) => e.type === 'ballSpawned');
  assert.equal(spawnedEvents.length, 2);
  assert.ok(spawnedEvents.every((e) => e.source === 'splitAll'));
  for (let i = 0; i < 2; i += 1) {
    const source = state.balls[i];
    const spawned = state.balls[i + 3];
    assert.equal(spawned.kind, source.kind);
    close(Math.hypot(spawned.vx, spawned.vy), speeds[i], 1e-9, '分裂球速');
    const dot = source.vx * spawned.vx + source.vy * spawned.vy;
    const cross = source.vx * spawned.vy - source.vy * spawned.vx;
    close(Math.abs(Math.atan2(cross, dot)), SKILL.splitAngleDeg * Math.PI / 180, 1e-9, '分裂夹角');
    assert.equal(spawned.splitCooldown, SKILL.splitCooldown);
  }

  const ready = createState(makeLevel([makeBrick(20, 0)]), 1);
  assert.equal(ready.balls[0].docked, true);
  assert.equal(skillCanCast(ready, 'split'), false);
  const rejected = castSkill(ready, 'split');
  assert.equal(rejected.ok, false);
  assert.equal(rejected.reason, 'noMovingBall');
  assert.equal(ready.balls.length, 1);
});

test('分裂受 8 球上限约束，超出部分记 splitBlocked', () => {
  const state = createState(makeLevel([makeBrick(20, 0)]), 1);
  state.phase = 'playing';
  state.balls = [];
  for (let i = 0; i < 7; i += 1) {
    state.balls.push({
      id: 20 + i,
      x: 200 + i * 20,
      y: 500,
      vx: 100 + i,
      vy: -50,
      r: 9,
      kind: 'blue',
      docked: false,
      dockOffset: 0,
      splitCooldown: 0,
    });
  }
  state.nextId = 100;
  const result = castSkill(state, 'split');
  assert.equal(result.ok, true);
  assert.equal(state.balls.length, BALL.cap);
  assert.equal(result.events.filter((e) => e.type === 'ballSpawned').length, 1);
  const blocked = result.events.find((e) => e.type === 'splitBlocked');
  assert.ok(blocked);
  assert.equal(blocked.count, 6);
  assert.equal(blocked.spawned, 1);
});

test('减益砖击碎只掉落对应类型，挡板接到才生效', () => {
  const state = createState(makeLevel([
    makeBrick(10, 10, 'debuff', 1, 9, 'shrink'),
    makeBrick(18, 2),
  ]), 1);
  assert.equal(state.stats.total, 2);
  putBall(state, { x: 357, y: 10 * 34 + 1.5 - 10, vy: 300 });
  const { events } = step(state, null, DT);
  assert.ok(events.some((e) => e.type === 'brickBreak' && e.kind === 'debuff'));
  assert.ok(events.some((e) => e.type === 'dropSpawn' && e.kind === 'debuff' && e.debuff === 'shrink'));
  assert.equal(state.stats.left, 1);
  assert.equal(state.drops.length, 1);
  assert.equal(state.debuffs.shrink, 0);
  assert.equal(state.paddle.w, PADDLE.w);
  assert.ok(!events.some((e) => e.type === 'debuffTriggered'));

  const drop = state.drops[0];
  assert.equal(drop.debuff, 'shrink');
  assert.equal(drop.skill, undefined);
  drop.x = state.paddle.x;
  drop.y = state.paddle.y - state.paddle.h / 2 - drop.r - 1;
  const caught = step(state, null, DT).events;
  const triggered = caught.find((e) => e.type === 'debuffTriggered');
  assert.ok(triggered);
  assert.equal(triggered.debuff, 'shrink');
  assert.equal(caught.filter((e) => e.type === 'debuffPickup').length, 1);
  assert.equal(state.debuffs.shrink, 1);
  close(state.paddle.w, PADDLE.w * DEBUFF.shrinkScale, 1e-9, '缩板宽度');
});

test('减益掉落漏接不生效，同时计入剩余数', () => {
  const state = createState(makeLevel([
    makeBrick(10, 10, 'debuff', 1, 9, 'speed'),
    makeBrick(18, 2),
  ]), 1);
  putBall(state, { x: 357, y: 10 * 34 + 1.5 - 10, vy: 300 });
  step(state, null, DT);
  assert.equal(state.drops.length, 1);
  const drop = state.drops[0];
  drop.x = 5;
  drop.y = state.failY - drop.r - 1;
  const { events } = step(state, null, DT);
  assert.ok(events.some((e) => e.type === 'dropLost'));
  assert.equal(state.drops.length, 0);
  assert.equal(state.debuffs.speed, 0);
  assert.ok(!events.some((e) => e.type === 'debuffTriggered'));
  assert.equal(state.stats.left, 1);
});

test('缩板与加速可永久叠加，宽度与速度按乘法累计', () => {
  const state = createState(makeLevel([makeBrick(20, 0)]), 1);
  castSkill(state, 'widePaddle');
  triggerDebuff(state, 'shrink');
  triggerDebuff(state, 'shrink');
  assert.equal(state.debuffs.shrink, 2);
  const expected = PADDLE.w * 1.4 * Math.pow(DEBUFF.shrinkScale, 2);
  close(state.paddle.w, expected, 1e-9, '加宽与双层缩板');

  const speed = createState(makeLevel([makeBrick(20, 0)]), 1);
  putBall(speed, { x: 100, y: 500, vx: 600 });
  triggerDebuff(speed, 'speed');
  triggerDebuff(speed, 'speed');
  assert.equal(speed.debuffs.speed, 2);
  for (let i = 0; i < 60; i += 1) step(speed, null, DT);
  close(speed.balls[0].x, 100 + 600 * Math.pow(DEBUFF.speedScale, 2) * 0.5, 2, '双层加速位移');
});

test('反向永久镜像控制且不叠加', () => {
  const state = createState(makeLevel([makeBrick(20, 0)]), 1);
  const event = triggerDebuff(state, 'reverse');
  assert.equal(event.stacks, 1);
  triggerDebuff(state, 'reverse');
  assert.equal(state.debuffs.reverse, 1);
  step(state, { paddleX: 100 }, DT);
  close(state.paddle.x, BOARD.w - 100, 0.01, '镜像挡板');
  state.time = 100;
  step(state, { paddleX: 100 }, DT);
  close(state.paddle.x, BOARD.w - 100, 0.01, '方向不随时间恢复');
});

test('奖励砖掉落随机可用技能，挡板接到立即施放', () => {
  for (const skill of SKILL_IDS) {
    const state = createState(makeLevel([
      makeBrick(10, 14, 'reward'),
      makeBrick(18, 2),
    ]), 1);
    putBall(state, { x: 100, y: 500, vx: 100 });
    const paddle = state.paddle;
    const before = {
      balls: state.balls.length,
      wide: state.skillStacks.widePaddle,
      slow: state.skillStacks.slow,
    };
    state.drops.push({
      id: 50,
      x: paddle.x,
      y: paddle.y - paddle.h / 2 - 11 - 1,
      vy: 230,
      r: 11,
      kind: 'skill',
      skill,
    });
    const { events } = step(state, null, DT);
    assert.ok(events.some((e) => e.type === 'skillPickup' && e.skill === skill), skill + ' 应被拾取');
    assert.ok(events.some((e) => e.type === 'skillUsed' && e.skill === skill), skill + ' 应立即施放');
    assert.equal(state.drops.length, 0);
    if (skill === 'multiBall') assert.equal(state.balls.length, before.balls + 2);
    if (skill === 'split') assert.equal(state.balls.length, before.balls + 1);
    if (skill === 'widePaddle') assert.equal(state.skillStacks.widePaddle, before.wide + 1);
    if (skill === 'slow') assert.equal(state.skillStacks.slow, before.slow + 1);
  }
});

test('奖励砖击碎掉落技能掉落物', () => {
  const state = createState(makeLevel([
    makeBrick(10, 14, 'reward'),
    makeBrick(18, 2),
  ]), 1);
  putBall(state, { x: 357, y: 14 * 34 + 1.5 - 10, vy: 300 });
  const { events } = step(state, null, DT);
  const spawn = events.find((e) => e.type === 'dropSpawn');
  assert.ok(spawn);
  assert.equal(spawn.kind, 'skill');
  assert.ok(SKILL_IDS.includes(spawn.skill));
  assert.equal(state.drops.length, 1);
  assert.equal(state.drops[0].kind, 'skill');
});

test('四个技能都无法生效时奖励砖不掉落', () => {
  const state = createState(makeLevel([
    makeBrick(10, 14, 'reward'),
    makeBrick(18, 2),
  ]), 1);
  putBall(state, { x: 357, y: 14 * 34 + 1.5 - 10, vy: 300 });
  for (let i = 0; i < BALL.cap - 1; i += 1) addBall(state, 'blue', false);
  state.skillStacks.widePaddle = SKILL.wideMaxStacks;
  state.skillStacks.slow = SKILL.slowMaxStacks;
  const { events } = step(state, null, DT);
  assert.equal(state.balls.length, BALL.cap);
  assert.ok(events.some((e) => e.type === 'skillFull'));
  assert.equal(state.drops.length, 0);
});

test('掉落生成后技能满级，接到时作废并提示', () => {
  const state = createState(makeLevel([makeBrick(20, 0)]), 1);
  putBall(state, { x: 100, y: 500, vx: 100 });
  state.drops.push({
    id: 50,
    x: state.paddle.x,
    y: state.paddle.y - state.paddle.h / 2 - 11 - 1,
    vy: 230,
    r: 11,
    kind: 'skill',
    skill: 'slow',
  });
  state.skillStacks.slow = SKILL.slowMaxStacks;
  const { events } = step(state, null, DT);
  const wasted = events.find((e) => e.type === 'skillWasted');
  assert.ok(wasted);
  assert.equal(wasted.skill, 'slow');
  assert.equal(wasted.reason, 'capped');
  assert.ok(!events.some((e) => e.type === 'skillUsed'));
  assert.equal(state.skillStacks.slow, SKILL.slowMaxStacks);
  assert.equal(state.drops.length, 0);
});

test('技能掉落漏接不施放', () => {
  const state = createState(makeLevel([makeBrick(20, 0)]), 1);
  putBall(state, { x: 100, y: 500, vx: 100 });
  state.drops.push({
    id: 51,
    x: 5,
    y: state.failY - 11 - 1,
    vy: 230,
    r: 11,
    kind: 'skill',
    skill: 'multiBall',
  });
  const before = state.balls.length;
  const { events } = step(state, null, DT);
  assert.ok(events.some((e) => e.type === 'dropLost'));
  assert.ok(!events.some((e) => e.type === 'skillUsed'));
  assert.equal(state.balls.length, before);
  assert.equal(state.drops.length, 0);
});

test('syncPaddleWidth 重算宽度并把挡板夹在棋盘内', () => {
  const state = createState(makeLevel([makeBrick(20, 0)]), 1);
  state.skillStacks.widePaddle = 2;
  syncPaddleWidth(state);
  close(state.paddle.w, PADDLE.w * 1.8, 1e-9, '同步宽度');
  state.paddle.x = BOARD.w + 100;
  syncPaddleWidth(state);
  close(state.paddle.x, BOARD.w - state.paddle.w / 2, 1e-9, '挡板右边界');
});

test('未知技能直接拒绝', () => {
  const state = createState(makeLevel([makeBrick(20, 0)]), 1);
  const result = castSkill(state, 'doubleCoins');
  assert.equal(result.ok, false);
  assert.equal(result.reason, 'unknown');
  assert.equal(result.skill, null);
});
