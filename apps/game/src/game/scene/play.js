import {
  BALL, BOARD, LEVEL_COUNT, MAX_STEPS_PER_FRAME, RULES, STEP,
  activateSkill, addBall, clearPercent, createState, revive, step,
} from '@mosaic/shared';
import LEVELS from '../../data/levels.json';
import { createBitmapCache } from '../../gfx/bitmapCache.js';
import { drawGemBrick } from '../../gfx/drawGemBrick.js';
import { createParticles } from '../../gfx/particles.js';
import { roundRectPath } from '../../gfx/roundRect.js';
import { computePlayLayout } from '../layout.js';
import { hitRect } from '../../ui/button.js';
import { drawHud } from '../../ui/hud.js';
import { drawModal, hitModal, modalLayout } from '../../ui/modal.js';
import { drawSkillBar, hitSkill } from '../../ui/skillBar.js';
import { C, FONT, SKILL_META, THEME_LABEL } from '../../ui/theme.js';
import { createToast } from '../../ui/toast.js';

const HINT_PRE = '看广告可多一颗球';
const HINT_READY = '拖动挡板 · 点击发球';
const HINT_PLAY = '点击底部技能槽立即生效';
const HINT_PAUSED = '已暂停';
const BALL_COLORS = {
  blue: C.blue,
  red: C.pinkDeep,
  green: C.mintDeep,
};
const GEM_OPTIONS = { radius: 7, light: C.white, dark: C.ink };
const LEVEL_BY_ID = new Map();
for (let i = 0; i < LEVELS.length; i += 1) LEVEL_BY_ID.set(LEVELS[i].id, LEVELS[i]);

function clamp(value, min, max) {
  return value < min ? min : value > max ? max : value;
}

function levelInfo(level) {
  const info = { hard: 0, reward: 0, total: 0 };
  for (let i = 0; i < level.bricks.length; i += 1) {
    const type = level.bricks[i].type;
    if (type === 'hard') info.hard += 1;
    if (type === 'reward') info.reward += 1;
    if (type !== 'obstacle') info.total += 1;
  }
  return info;
}

function createBeams() {
  const items = [];
  for (let i = 0; i < 6; i += 1) {
    items.push({ life: 0, max: 0.22, x1: 0, y1: 0, x2: 0, y2: 0 });
  }
  let cursor = 0;

  function spawn(x1, y1, x2, y2) {
    const beam = items[cursor];
    cursor = (cursor + 1) % items.length;
    beam.x1 = x1;
    beam.y1 = y1;
    beam.x2 = x2;
    beam.y2 = y2;
    beam.max = 0.22;
    beam.life = 0.22;
  }

  function update(dt) {
    for (let i = 0; i < items.length; i += 1) {
      if (items[i].life > 0) items[i].life -= dt;
    }
  }

  function draw(ctx) {
    ctx.save();
    ctx.lineCap = 'round';
    for (let i = 0; i < items.length; i += 1) {
      const beam = items[i];
      if (beam.life <= 0) continue;
      const alpha = Math.max(0, beam.life / beam.max);
      ctx.globalAlpha = alpha * 0.85;
      ctx.strokeStyle = C.violet;
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(BOARD.x + beam.x1, BOARD.y + beam.y1);
      ctx.lineTo(BOARD.x + beam.x2, BOARD.y + beam.y2);
      ctx.stroke();
      ctx.globalAlpha = alpha;
      ctx.strokeStyle = C.white;
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.moveTo(BOARD.x + beam.x1, BOARD.y + beam.y1);
      ctx.lineTo(BOARD.x + beam.x2, BOARD.y + beam.y2);
      ctx.stroke();
    }
    ctx.restore();
  }

  function reset() {
    for (let i = 0; i < items.length; i += 1) items[i].life = 0;
  }

  return { spawn, update, draw, reset };
}

export function createPlayScene(deps) {
  const { platform, store, audio, onExit, onShare } = deps;
  const toast = createToast();
  const particles = createParticles();
  const beams = createBeams();
  const cache = createBitmapCache(platform);

  let view = null;
  let layout = null;
  let level = null;
  let levelId = 1;
  let info = { hard: 0, reward: 0, total: 0 };
  let sim = null;
  let modal = null;
  let paused = true;
  let adBusy = false;
  let lastNow = 0;
  let acc = 0;
  let paddleTarget = null;
  let dragId = null;
  let launchQueued = false;
  let brickVersion = 0;
  let clearAt = 0;
  let failAt = 0;
  let failShown = false;
  let settled = false;
  let resultBase = 0;
  let doubled = false;
  let extraBallBought = false;
  let bgKey = '';
  let background = null;

  function displayCoins() {
    const base = store.get().coins;
    if (!sim || settled) return base;
    return base + sim.coins;
  }

  function levelFor(id) {
    return LEVEL_BY_ID.get(id) || LEVELS[0];
  }

  function start(id) {
    levelId = clamp(Math.floor(id) || 1, 1, LEVEL_COUNT);
    level = levelFor(levelId);
    info = levelInfo(level);
    sim = createState(level, undefined, { slotCapacity: store.get().slotCapacity });
    modal = null;
    paused = true;
    adBusy = false;
    lastNow = 0;
    acc = 0;
    paddleTarget = sim.paddle.x;
    dragId = null;
    launchQueued = false;
    brickVersion = 0;
    clearAt = 0;
    failAt = 0;
    failShown = false;
    settled = false;
    resultBase = 0;
    doubled = false;
    extraBallBought = false;
    particles.reset();
    beams.reset();
    toast.clear();
    cache.clear();
    modal = preRoundModal();
  }

  function preRoundModal() {
    const step = level.ball.speed;
    return {
      kind: 'preRound',
      title: '第 ' + levelId + ' 关',
      subtitle: (THEME_LABEL[level.theme] || level.theme) + ' · ' + level.ball.count + ' 颗球 · 球速 ' + step,
      lines: [
        { text: '硬砖 ' + info.hard + ' · 奖励砖 ' + info.reward + ' · 可破坏 ' + info.total },
        { text: '挡板跟手，点击棋盘发球', color: C.muted },
      ],
      buttons: [
        { id: 'start', label: '开始', kind: 'primary' },
        {
          id: 'extraBall',
          label: extraBallBought ? '本关已加 1 颗球' : '看广告 +1 球',
          kind: extraBallBought ? 'disabled' : 'mint',
          disabled: extraBallBought,
        },
        { id: 'home', label: '返回主页', kind: 'ghost' },
      ],
      note: '额外球只影响本关初始球',
    };
  }

  function pauseModal() {
    const save = store.get();
    return {
      kind: 'pause',
      title: '已暂停',
      subtitle: '第 ' + levelId + ' 关 · 清除 ' + clearPercent(sim) + '%',
      lines: [
        { text: '金币 ' + displayCoins() + ' · 技能槽 ' + save.slotCapacity + ' / 4', color: C.muted },
      ],
      buttons: [
        { id: 'resume', label: '继续游戏', kind: 'primary' },
        { id: 'sound', label: '音效 ' + (save.sound ? '开' : '关'), kind: 'secondary' },
        { id: 'music', label: '音乐 ' + (save.music ? '开' : '关'), kind: 'secondary' },
        { id: 'share', label: '分享游戏', kind: 'secondary' },
        { id: 'restart', label: '重开本关', kind: 'secondary' },
        { id: 'home', label: '返回主页', kind: 'ghost' },
      ],
      note: '切换后台会自动暂停',
    };
  }

  function resultModal() {
    const save = store.get();
    const allDone = levelId >= LEVEL_COUNT;
    return {
      kind: 'result',
      title: allDone ? '全部关卡完成' : '过关！',
      subtitle: '第 ' + levelId + ' 关 · 清除 100%',
      lines: [
        { text: '本关金币 +' + resultBase, bold: true, color: C.orange },
        { text: '金币余额 ' + save.coins, color: C.ink },
        {
          text: doubled ? '双倍奖励已领取' : '看广告再得 ' + resultBase + ' 金币',
          color: doubled ? C.success : C.muted,
        },
      ],
      buttons: [
        { id: 'next', label: allDone ? '再玩一次' : '下一关', kind: 'primary' },
        {
          id: 'double',
          label: doubled ? '已双倍' : '看广告 ×2 金币',
          kind: doubled ? 'disabled' : 'violet',
          disabled: doubled,
        },
        { id: 'home', label: '返回主页', kind: 'ghost' },
      ],
      autoAt: lastNow > 0 ? lastNow + 6500 : 0,
      autoLabel: allDone ? '自动再玩一次' : '自动进入下一关',
      note: '最高关已更新',
    };
  }

  function failModal() {
    return {
      kind: 'fail',
      title: '挑战失败',
      subtitle: '球全部掉出棋盘',
      lines: [
        { text: '本关清除 ' + clearPercent(sim) + '% · 金币未结算', color: C.muted },
        { text: '复活每关仅一次', color: C.soft },
      ],
      buttons: [
        {
          id: 'revive',
          label: sim.reviveUsed ? '本关已复活' : '复活 +1 球（广告）',
          kind: sim.reviveUsed ? 'disabled' : 'mint',
          disabled: sim.reviveUsed,
        },
        { id: 'retry', label: '重来一局', kind: 'secondary' },
        { id: 'home', label: '返回主页', kind: 'ghost' },
      ],
      note: '重来一局会重置本关金币与技能',
    };
  }

  function adModal(placement) {
    const reward = placement === 'revive' ? '复活 +1 球'
      : placement === 'extraBall' ? '开局 +1 球' : '金币 ×2';
    return {
      kind: 'ad',
      title: '广告播放中',
      subtitle: '完整观看即可获得奖励',
      lines: [{ text: reward, bold: true, color: C.primary }],
      buttons: [],
      note: platform.adMode() === 'sdk' ? '广告由平台提供' : '模拟广告 · 观看完成自动返回',
    };
  }

  function beginRound() {
    modal = null;
    paused = false;
    acc = 0;
    lastNow = 0;
    toast.show('点击棋盘发球');
  }

  function resume() {
    modal = null;
    paused = false;
    acc = 0;
    lastNow = 0;
  }

  function exitHome() {
    modal = null;
    paused = true;
    onExit();
  }

  function nextLevel() {
    start(levelId >= LEVEL_COUNT ? levelId : levelId + 1);
  }

  function settleClear() {
    if (settled) return;
    settled = true;
    resultBase = RULES.clearCoins + sim.coins;
    const next = Math.min(LEVEL_COUNT, levelId + 1);
    store.update((save) => {
      save.coins += resultBase;
      if (next > save.highestLevel) save.highestLevel = next;
    });
    pauseForModal();
    modal = resultModal();
  }

  function pauseForModal() {
    paused = true;
    acc = 0;
  }

  function openFail() {
    failShown = true;
    pauseForModal();
    modal = failModal();
  }

  function runAd(placement) {
    if (adBusy) return Promise.resolve(false);
    adBusy = true;
    modal = adModal(placement);
    return Promise.resolve(platform.showRewardedAd(placement))
      .then((ok) => {
        adBusy = false;
        return !!ok;
      })
      .catch(() => {
        adBusy = false;
        return false;
      });
  }

  function watchExtraBall() {
    if (extraBallBought || adBusy) return Promise.resolve(false);
    return runAd('extraBall').then((ok) => {
      if (ok) {
        extraBallBought = true;
        const ball = addBall(sim, 'blue', true);
        toast.show(ball ? '本关 +1 颗球' : '球数已达上限');
      } else {
        toast.show('广告未看完，未获得额外球');
      }
      modal = preRoundModal();
      return ok;
    });
  }

  function watchDouble() {
    if (doubled || adBusy) return Promise.resolve(false);
    return runAd('doubleCoins').then((ok) => {
      if (ok && !doubled) {
        doubled = true;
        store.update((save) => { save.coins += resultBase; });
        toast.show('金币翻倍 +' + resultBase);
      } else if (!ok) {
        toast.show('广告未看完，金币未翻倍');
      }
      lastNow = lastNow || 1;
      modal = resultModal();
      return ok;
    });
  }

  function watchRevive() {
    if (sim.reviveUsed || adBusy) return Promise.resolve(false);
    return runAd('revive').then((ok) => {
      if (ok && revive(sim)) {
        modal = null;
        paused = false;
        acc = 0;
        lastNow = 0;
        failShown = false;
        launchQueued = false;
        toast.show('已复活 · 点击发球');
      } else {
        modal = failModal();
        toast.show('广告未看完，未能复活');
      }
      return ok;
    });
  }

  function handleAction(id) {
    if (id === 'start') {
      beginRound();
    } else if (id === 'extraBall') {
      watchExtraBall();
    } else if (id === 'home') {
      exitHome();
    } else if (id === 'resume') {
      resume();
    } else if (id === 'restart') {
      start(levelId);
    } else if (id === 'sound') {
      audio.toggleSound();
      toast.show('音效已' + (store.get().sound ? '开' : '关'));
      modal = pauseModal();
    } else if (id === 'music') {
      audio.toggleMusic();
      toast.show('音乐已' + (store.get().music ? '开' : '关'));
      modal = pauseModal();
    } else if (id === 'share') {
      onShare().then((ok) => {
        toast.show(ok ? '已调起分享' : '当前环境不支持分享');
      });
    } else if (id === 'next') {
      nextLevel();
    } else if (id === 'double') {
      watchDouble();
    } else if (id === 'revive') {
      watchRevive();
    } else if (id === 'retry') {
      start(levelId);
    }
  }

  function spawnAt(x, y, color, count, power) {
    particles.spawn(BOARD.x + x, BOARD.y + y, color, count, power);
  }

  function findBall(id) {
    for (let i = 0; i < sim.balls.length; i += 1) {
      if (sim.balls[i].id === id) return sim.balls[i];
    }
    return null;
  }

  function handleEvents(events) {
    for (let i = 0; i < events.length; i += 1) {
      const event = events[i];
      switch (event.type) {
        case 'brickHit':
          brickVersion += 1;
          spawnAt(event.x, event.y, sim.palette[event.color] || C.white, 4, 0.8);
          audio.play('brick');
          break;
        case 'brickBreak':
          brickVersion += 1;
          spawnAt(event.x, event.y, sim.palette[event.color] || C.white, 11, 1.2);
          audio.play('break');
          break;
        case 'brickBump':
          spawnAt(event.x, event.y, 'rgba(255,255,255,0.85)', 2, 0.5);
          break;
        case 'paddleHit':
          spawnAt(sim.paddle.x, sim.paddle.y - sim.paddle.h / 2, C.lavender, 4, 0.7);
          audio.play('paddle');
          break;
        case 'wallHit':
          break;
        case 'coinPickup':
          toast.show('金币 +' + event.amount);
          audio.play('coin');
          break;
        case 'skillPickup': {
          const meta = SKILL_META[event.skill];
          toast.show('获得技能 · ' + (meta ? meta.label : event.skill));
          audio.play('skill');
          break;
        }
        case 'skillFull':
          toast.show('技能槽已满');
          break;
        case 'skillUsed': {
          const meta = SKILL_META[event.skill];
          spawnAt(sim.paddle.x, sim.paddle.y - sim.paddle.h / 2, meta ? meta.color : C.white, 8, 1);
          break;
        }
        case 'ballSpawned': {
          const ball = findBall(event.ballId);
          if (ball) spawnAt(ball.x, ball.y, BALL_COLORS[ball.kind] || C.white, 6, 0.9);
          break;
        }
        case 'laserFire':
          beams.spawn(sim.paddle.x, sim.paddle.y - sim.paddle.h / 2, event.x, event.y);
          break;
        case 'levelClear':
          clearAt = lastNow + 520;
          break;
        case 'levelFailed':
          failAt = lastNow + 420;
          break;
        default:
          break;
      }
    }
  }

  function useSkill(index) {
    if (index >= sim.slotCapacity) {
      toast.show('技能槽未解锁 · 主页可扩容');
      return;
    }
    if (!sim.slots[index]) {
      toast.show('这个技能槽是空的');
      return;
    }
    const result = activateSkill(sim, index);
    if (!result.ok) return;
    handleEvents(result.events);
    const meta = SKILL_META[result.skill];
    toast.show('已使用 · ' + (meta ? meta.label : result.skill));
    audio.play('skill');
  }

  function pointerIdOf(event) {
    return event.id == null ? 'primary' : event.id;
  }

  function movePaddleTo(x) {
    const half = sim.paddle.w / 2;
    paddleTarget = clamp(x - layout.board.x, half, BOARD.w - half);
  }

  function inOperation(event) {
    const area = layout.operation;
    return event.x >= area.x && event.x <= area.x + area.w
      && event.y >= area.y && event.y <= area.y + area.h;
  }

  function onPointer(event) {
    if (!view || !sim || !layout) return;
    const id = pointerIdOf(event);
    if (modal) {
      dragId = null;
      if (event.type !== 'start') return;
      const action = hitModal(modal, view, event.x, event.y);
      if (action) handleAction(action);
      return;
    }
    if (event.type === 'start') {
      if (hitRect(layout.pause, event.x, event.y, 10)) {
        dragId = null;
        pauseForModal();
        modal = pauseModal();
        return;
      }
      const slot = hitSkill(layout, event.x, event.y);
      if (slot >= 0) {
        useSkill(slot);
        return;
      }
      if (dragId !== null) return;
      if (!inOperation(event)) return;
      dragId = id;
      movePaddleTo(event.x);
      if (sim.phase === 'ready') launchQueued = true;
      return;
    }
    if (event.type === 'move') {
      if (id === dragId) movePaddleTo(event.x);
      return;
    }
    if (id === dragId) dragId = null;
  }

  function onHide() {
    dragId = null;
    if (modal && modal.kind !== 'pause') {
      // 切后台时停掉结算倒计时，回来后让用户自己点下一关。
      if (modal.kind === 'result') modal.autoAt = 0;
      return;
    }
    if (!sim) return;
    if (sim.phase === 'playing' || sim.phase === 'ready') {
      pauseForModal();
      lastNow = 0;
      if (!modal) modal = pauseModal();
    }
  }

  function onShow() {
    lastNow = 0;
    acc = 0;
  }

  function tick(now) {
    if (!sim) return;
    if (!Number.isFinite(now)) now = 0;
    if (!lastNow) lastNow = now;
    let dt = (now - lastNow) / 1000;
    lastNow = now;
    if (!Number.isFinite(dt) || dt < 0) dt = 0;
    if (dt > 0.1) dt = 0.1;

    if (!paused && !modal && !adBusy) {
      acc += dt;
      let steps = 0;
      while (acc >= STEP && steps < MAX_STEPS_PER_FRAME) {
        const input = {
          paddleX: paddleTarget == null ? sim.paddle.x : paddleTarget,
          launch: launchQueued,
        };
        launchQueued = false;
        const result = step(sim, input, STEP);
        handleEvents(result.events);
        acc -= STEP;
        steps += 1;
      }
      if (steps >= MAX_STEPS_PER_FRAME) acc = 0;
    } else {
      acc = 0;
    }

    particles.update(dt);
    beams.update(dt);

    if (sim.phase === 'cleared' && !settled && clearAt > 0 && now >= clearAt) {
      settleClear();
    }
    if (sim.phase === 'failed' && !failShown && !modal && failAt > 0 && now >= failAt) {
      openFail();
    }
    if (modal && modal.kind === 'result' && !adBusy && modal.autoAt && now >= modal.autoAt) {
      nextLevel();
    }
  }

  function drawBackground(ctx, v) {
    const key = v.h + ':' + v.bleed.w;
    if (bgKey !== key) {
      const gradient = ctx.createLinearGradient(0, 0, 0, v.h);
      gradient.addColorStop(0, C.bgTop);
      gradient.addColorStop(1, C.bgBottom);
      background = gradient;
      bgKey = key;
    }
    ctx.fillStyle = background;
    ctx.fillRect(v.bleed.x, v.bleed.y, v.bleed.w, v.bleed.h);
  }

  function drawPanel(ctx) {
    const panel = layout.panel;
    // 下沿多画一个半径，让底部圆角落在屏外，可见部分只剩顶部两角
    roundRectPath(ctx, panel.x, panel.y, panel.w, panel.h + 20, 20);
    ctx.fillStyle = 'rgba(255,255,255,0.40)';
    ctx.fill();
    ctx.strokeStyle = C.line;
    ctx.lineWidth = 1;
    ctx.stroke();
  }

  function drawDivider(ctx) {
    const panel = layout.panel;
    ctx.save();
    ctx.strokeStyle = 'rgba(91,75,196,0.18)';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(panel.x + 20, layout.dividerY);
    ctx.lineTo(panel.x + panel.w - 20, layout.dividerY);
    ctx.stroke();
    ctx.restore();
  }

  function drawBoard(ctx) {
    const board = layout.board;
    const key = levelId + '|' + brickVersion + '|' + view.scale.toFixed(3);
    const bitmap = cache.get(key, board.w, board.h, view.scale, (c) => {
      for (let i = 0; i < sim.bricks.length; i += 1) {
        const brick = sim.bricks[i];
        if (!brick.alive) continue;
        drawGemBrick(c, brick.x, brick.y, brick.w, brick, sim.palette, GEM_OPTIONS);
      }
    });
    if (bitmap) {
      ctx.drawImage(
        bitmap.canvas,
        0, 0, bitmap.pxW, bitmap.pxH,
        Math.round(board.x), Math.round(board.y), bitmap.pxW / bitmap.scale, bitmap.pxH / bitmap.scale,
      );
    } else {
      for (let i = 0; i < sim.bricks.length; i += 1) {
        const brick = sim.bricks[i];
        if (!brick.alive) continue;
        drawGemBrick(ctx, board.x + brick.x, board.y + brick.y, brick.w, brick, sim.palette, GEM_OPTIONS);
      }
    }
  }

  function drawDrops(ctx) {
    for (let i = 0; i < sim.drops.length; i += 1) {
      const drop = sim.drops[i];
      const x = BOARD.x + drop.x;
      const y = BOARD.y + drop.y;
      if (!Number.isFinite(x) || !Number.isFinite(y)) continue;
      ctx.fillStyle = 'rgba(42,35,68,0.16)';
      ctx.beginPath();
      ctx.arc(x + 1, y + 3, drop.r, 0, Math.PI * 2);
      ctx.fill();
      if (drop.kind === 'coin') {
        ctx.fillStyle = C.gold;
        ctx.beginPath();
        ctx.arc(x, y, drop.r, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = C.yellow;
        ctx.beginPath();
        ctx.arc(x, y, drop.r - 3.4, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = C.gold;
        ctx.font = FONT.tinyBold;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('C', x, y + 1);
      } else {
        const meta = SKILL_META[drop.skill] || SKILL_META.multiBall;
        const r = drop.r + 3;
        ctx.beginPath();
        ctx.moveTo(x, y - r);
        ctx.lineTo(x + r, y);
        ctx.lineTo(x, y + r);
        ctx.lineTo(x - r, y);
        ctx.closePath();
        ctx.fillStyle = meta.color;
        ctx.fill();
        ctx.strokeStyle = 'rgba(255,255,255,0.72)';
        ctx.lineWidth = 1.4;
        ctx.stroke();
        ctx.fillStyle = C.white;
        ctx.font = FONT.slot;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(meta.short, x, y + 1);
      }
    }
  }

  function drawBalls(ctx) {
    for (let i = 0; i < sim.balls.length; i += 1) {
      const ball = sim.balls[i];
      const x = BOARD.x + ball.x;
      const y = BOARD.y + ball.y;
      if (!Number.isFinite(x) || !Number.isFinite(y)) continue;
      const color = BALL_COLORS[ball.kind] || BALL_COLORS.blue;

      ctx.fillStyle = 'rgba(42,35,68,0.18)';
      ctx.beginPath();
      ctx.ellipse(x + 1.2, y + 2.6, ball.r * 1.02, ball.r * 0.74, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(x, y, ball.r, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = 'rgba(42,35,68,0.30)';
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.arc(x, y, ball.r, 0, Math.PI * 2);
      ctx.stroke();

      ctx.fillStyle = 'rgba(255,255,255,0.86)';
      ctx.beginPath();
      ctx.arc(x - ball.r * 0.30, y - ball.r * 0.34, ball.r * 0.36, 0, Math.PI * 2);
      ctx.fill();

      if (ball.kind === 'red') {
        ctx.strokeStyle = 'rgba(255,255,255,0.66)';
        ctx.lineWidth = 1.4;
        ctx.beginPath();
        ctx.arc(x, y, ball.r * 0.55, 0, Math.PI * 2);
        ctx.stroke();
      }
    }
  }

  function drawPaddle(ctx) {
    const paddle = sim.paddle;
    const w = paddle.w;
    const h = paddle.h;
    const x = BOARD.x + paddle.x;
    const y = BOARD.y + paddle.y;
    const wide = sim.time < sim.effects.wideUntil;

    ctx.fillStyle = 'rgba(42,35,68,0.18)';
    roundRectPath(ctx, x - w / 2, y - h / 2 + 4, w, h, h / 2);
    ctx.fill();

    ctx.fillStyle = wide ? C.blue : C.lavender;
    roundRectPath(ctx, x - w / 2, y - h / 2, w, h, h / 2);
    ctx.fill();

    ctx.save();
    roundRectPath(ctx, x - w / 2, y - h / 2, w, h, h / 2);
    ctx.clip();
    ctx.fillStyle = 'rgba(255,255,255,0.30)';
    ctx.fillRect(x - w / 2, y - h / 2, w, h * 0.46);
    ctx.restore();

    ctx.strokeStyle = wide ? 'rgba(90,169,240,0.85)' : 'rgba(91,75,196,0.30)';
    ctx.lineWidth = wide ? 2.4 : 1.4;
    roundRectPath(ctx, x - w / 2, y - h / 2, w, h, h / 2);
    ctx.stroke();

    ctx.fillStyle = 'rgba(255,255,255,0.72)';
    ctx.beginPath();
    ctx.arc(x, y, 4.4, 0, Math.PI * 2);
    ctx.fill();
  }

  function drawHint(ctx, now) {
    if (toast.isActive(now)) return;
    let hint = HINT_PLAY;
    if (modal && modal.kind === 'preRound') hint = HINT_PRE;
    else if (modal && modal.kind === 'pause') hint = HINT_PAUSED;
    else if (sim.phase === 'ready') hint = HINT_READY;
    ctx.fillStyle = C.muted;
    ctx.font = FONT.small;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(hint, 375, layout.hintY);
  }

  function draw(ctx, v, now) {
    view = v;
    layout = computePlayLayout(v);
    if (!sim) start(levelId);
    tick(now);

    drawBackground(ctx, v);
    drawPanel(ctx);
    drawBoard(ctx);
    drawDivider(ctx);
    drawDrops(ctx);
    beams.draw(ctx);
    drawBalls(ctx);
    drawPaddle(ctx);
    particles.draw(ctx);

    drawHud(ctx, layout, {
      levelId,
      levelCount: LEVEL_COUNT,
      theme: level.theme,
      percent: clearPercent(sim),
      left: sim.stats.left,
      total: sim.stats.total,
      coins: displayCoins(),
    });
    drawSkillBar(ctx, layout, sim, now);
    drawHint(ctx, now);
    toast.draw(ctx, v, now, v.h - 12);
    if (modal) drawModal(ctx, v, modal, now);
  }

  function snapshot() {
    if (!sim) return null;
    return {
      scene: 'play',
      levelId,
      theme: level.theme,
      phase: sim.phase,
      paused,
      modal: modal ? modal.kind : null,
      adBusy,
      settled,
      doubled,
      extraBallBought,
      coins: displayCoins(),
      levelCoins: sim.coins,
      savedCoins: store.get().coins,
      highestLevel: store.get().highestLevel,
      slotCapacity: sim.slotCapacity,
      slots: sim.slots.slice(),
      balls: sim.balls.length,
      ballKinds: sim.balls.map((ball) => ball.kind),
      paddleX: sim.paddle.x,
      paddleW: sim.paddle.w,
      paddleTarget,
      dragging: dragId !== null,
      time: sim.time,
      acc,
      lastNow,
      launchQueued,
      docked: sim.balls.map((ball) => ball.docked),
      percent: clearPercent(sim),
      left: sim.stats.left,
      total: sim.stats.total,
      reviveUsed: sim.reviveUsed,
      effects: {
        wide: Math.max(0, sim.effects.wideUntil - sim.time),
        laser: Math.max(0, sim.effects.laserUntil - sim.time),
        slow: Math.max(0, sim.effects.slowUntil - sim.time),
      },
      cacheBuilds: cache.stats().builds,
      resultBase,
    };
  }

  function debugRects() {
    if (!layout) return null;
    return {
      board: layout.board,
      panel: layout.panel,
      operation: layout.operation,
      dividerY: layout.dividerY,
      pause: layout.pause,
      skills: layout.skill.slots,
      modal: modal ? modalLayout(modal, view) : null,
    };
  }

  function debugDismissModal() {
    if (!modal) return false;
    if (modal.kind === 'preRound') {
      beginRound();
      return true;
    }
    if (modal.kind === 'result') {
      nextLevel();
      return true;
    }
    if (modal.kind === 'fail') {
      start(levelId);
      return true;
    }
    if (modal.kind === 'pause') {
      resume();
      return true;
    }
    return false;
  }

  function debugForceClear() {
    if (!sim || settled) return false;
    modal = null;
    paused = false;
    for (let i = 0; i < sim.bricks.length; i += 1) {
      const brick = sim.bricks[i];
      if (brick.type === 'obstacle') continue;
      brick.alive = false;
    }
    sim.stats.left = 0;
    sim.stats.destroyed = sim.stats.total;
    sim.phase = 'cleared';
    brickVersion += 1;
    cache.clear();
    clearAt = 0;
    if (!lastNow) lastNow = 1;
    settleClear();
    return true;
  }

  function debugForceFail() {
    if (!sim || settled) return false;
    modal = null;
    sim.balls.length = 0;
    sim.drops.length = 0;
    sim.phase = 'failed';
    pauseForModal();
    failShown = true;
    modal = failModal();
    return true;
  }

  function debugUseSkill(index) {
    if (!sim) return false;
    useSkill(index);
    return true;
  }

  return {
    start,
    draw,
    onPointer,
    onHide,
    onShow,
    snapshot,
    debugRects,
    debugDismissModal,
    debugForceClear,
    debugForceFail,
    debugUseSkill,
  };
}
