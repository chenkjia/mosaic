import test from 'node:test';
import assert from 'node:assert/strict';
import { PALETTE } from '@mosaic/shared';
import { computePlayLayout } from '../src/game/layout.js';
import { drawGemBrick } from '../src/gfx/drawGemBrick.js';
import { activeDebuffs, drawDebuffBar } from '../src/ui/debuffBar.js';
import { drawHud } from '../src/ui/hud.js';
import { drawSkillBar, formatMultiplier } from '../src/ui/skillBar.js';
import { drawModal, modalLayout } from '../src/ui/modal.js';

function makeCtx() {
  const numbers = [];
  const texts = [];
  const record = (...args) => {
    for (const value of args) {
      if (typeof value === 'number') numbers.push(value);
    }
  };
  const gradient = () => ({ addColorStop: (...args) => record(...args) });
  const ctx = {
    numbers,
    texts,
    fillStyle: '',
    strokeStyle: '',
    lineWidth: 1,
    lineJoin: '',
    lineCap: '',
    font: '',
    textAlign: '',
    textBaseline: '',
    globalAlpha: 1,
    createLinearGradient: gradient,
    fillRect: record,
    strokeRect: record,
    fillText: (text, x, y) => {
      texts.push(String(text));
      record(x, y);
    },
    beginPath: () => {},
    moveTo: record,
    lineTo: record,
    arcTo: record,
    arc: record,
    ellipse: record,
    closePath: () => {},
    fill: () => {},
    stroke: () => {},
    save: () => {},
    restore: () => {},
    clip: () => {},
    translate: record,
    scale: record,
    drawImage: record,
  };
  return ctx;
}

function assertFinite(ctx, label) {
  assert.ok(ctx.numbers.length > 0, label + ' 未记录坐标');
  const bad = ctx.numbers.filter((value) => !Number.isFinite(value));
  assert.equal(bad.length, 0, label + ' 出现非有限坐标: ' + bad.slice(0, 4).join(','));
}

function countText(ctx, text) {
  return ctx.texts.filter((value) => value === text).length;
}

test('局内布局在所有设计高度内坐标合法', () => {
  for (const h of [1334, 1400, 1624, 1900]) {
    const view = { w: 750, h, bleed: { x: 0, y: 0, w: 750, h } };
    const layout = computePlayLayout(view);
    assert.equal(layout.board.x + layout.board.w, 732);
    assert.ok(layout.board.y + layout.board.h < layout.skill.y);
    assert.equal(layout.skill.slots.length, 4);
    for (const slot of layout.skill.slots) {
      assert.ok(slot.x >= 0 && slot.x + slot.w <= 750);
      assert.ok(slot.y + slot.h < view.h);
    }
    assert.ok(layout.dividerY < view.h);
    assert.equal(layout.failY, layout.dividerY - layout.board.y);
  }
});

test('四格技能栏等宽铺满棋盘宽，失败线等于技能栏上沿', () => {
  const view = { w: 750, h: 1624, bleed: { x: 0, y: 0, w: 750, h: 1624 } };
  const layout = computePlayLayout(view);
  assert.equal(layout.dividerY, layout.skill.y);
  assert.equal(layout.failY, layout.dividerY - layout.board.y);
  assert.equal(layout.skill.slots[0].x, layout.board.x);
  const last = layout.skill.slots[3];
  assert.equal(last.x + last.w, layout.board.x + layout.board.w);
  for (const slot of layout.skill.slots) {
    assert.equal(slot.w, 165);
    assert.equal(slot.h, 112);
  }
  assert.equal(layout.pause.x, 24);
  assert.equal(layout.level.x, 108);
  assert.equal('coin' in layout, false);
});

test('游戏面板与棋盘同宽并铺到屏幕最底', () => {
  const views = [
    { w: 750, h: 1624, bleed: { x: 0, y: 0, w: 750, h: 1624 } },
    { w: 750, h: 1334, bleed: { x: -47, y: 0, w: 844, h: 1334 } },
  ];
  for (const view of views) {
    const layout = computePlayLayout(view);
    const bleedBottom = view.bleed.y + view.bleed.h;
    assert.equal(layout.panel.x, layout.board.x);
    assert.equal(layout.panel.w, layout.board.w);
    assert.equal(layout.panel.y, layout.hud.h);
    assert.equal(layout.panel.y + layout.panel.h, bleedBottom);
    assert.equal(layout.dividerY, layout.skill.y);
    assert.equal(layout.failY, layout.skill.y - layout.board.y);
    assert.equal(layout.operation.x, view.bleed.x);
    assert.equal(layout.operation.w, view.bleed.w);
    assert.equal(layout.operation.y, layout.hud.h);
    assert.equal(layout.operation.y + layout.operation.h, bleedBottom);
    assert.ok(layout.operation.w >= layout.panel.w);
  }
});

test('卡片贴底时控件避让安全区', () => {
  for (const h of [1334, 1624, 1900]) {
    for (const safeBottom of [0, 34, 68]) {
      const view = { w: 750, h, bleed: { x: 0, y: 0, w: 750, h }, safeBottom };
      const layout = computePlayLayout(view);
      const limit = h - safeBottom;
      assert.equal(layout.panel.y + layout.panel.h, h);
      assert.ok(layout.board.y + layout.board.h < layout.skill.y);
      assert.equal(layout.dividerY, layout.skill.y);
      for (const slot of layout.skill.slots) {
        assert.ok(slot.y + slot.h <= limit, '技能格底边越入安全区: h=' + h + ' safe=' + safeBottom);
      }
    }
  }
});

test('宝石砖各状态绘制坐标均为有限值', () => {
  const cases = [
    { type: 'normal', hp: 1, color: 5 },
    { type: 'hard', hp: 2, color: 7 },
    { type: 'hard', hp: 3, color: 8 },
    { type: 'obstacle', hp: 0, color: 2 },
    { type: 'reward', hp: 1, color: 9 },
    { type: 'debuff', hp: 1, color: 4, debuff: 'shrink' },
    { type: 'debuff', hp: 1, color: 4, debuff: 'speed' },
    { type: 'debuff', hp: 1, color: 4, debuff: 'reverse' },
  ];
  for (const brick of cases) {
    const ctx = makeCtx();
    drawGemBrick(ctx, 10.5, 20.5, 31, brick, PALETTE, { radius: 7 });
    assertFinite(ctx, brick.type + ':' + (brick.debuff || ''));
  }
});

test('HUD 只显示递增的已清除 / 总数，四格技能格是可点的广告入口', () => {
  const view = { w: 750, h: 1334, bleed: { x: 0, y: 0, w: 750, h: 1334 } };
  const layout = computePlayLayout(view);
  const ctx = makeCtx();
  drawHud(ctx, layout, {
    levelId: 7,
    left: 80,
    total: 140,
  });
  const sim = {
    time: 100,
    balls: [{ docked: false, kind: 'blue' }],
    skillStacks: { widePaddle: 0, slow: 0 },
  };
  drawSkillBar(ctx, layout, sim, 1000);
  assertFinite(ctx, 'hud+skill');
  assert.ok(ctx.texts.includes('第 7 关'));
  assert.ok(ctx.texts.includes('60 / 140'));
  assert.equal(ctx.texts.includes('剩余 / 总数'), false);
  assert.equal(ctx.texts.includes('可破坏'), false);
  assert.equal(countText(ctx, '看广告'), 4);
  assert.ok(ctx.texts.includes('多球'));
  assert.ok(ctx.texts.includes('加宽'));
  assert.ok(ctx.texts.includes('分裂'));
  assert.ok(ctx.texts.includes('减速'));
  assert.equal(ctx.texts.includes('CLEARED'), false);
  assert.equal(ctx.texts.some((text) => text.includes('%')), false);
  assert.equal(ctx.texts.includes('点击释放'), false);
  assert.equal(ctx.texts.includes('看广告补充'), false);
  assert.equal(ctx.texts.includes('金币'), false);
});

test('技能格显示当前倍率，满级显示已满，无移动球显示无目标', () => {
  const view = { w: 750, h: 1334, bleed: { x: 0, y: 0, w: 750, h: 1334 } };
  const layout = computePlayLayout(view);

  const stacked = makeCtx();
  drawSkillBar(stacked, layout, {
    balls: [{ docked: true, kind: 'blue' }],
    skillStacks: { widePaddle: 1, slow: 2 },
  }, 0);
  assertFinite(stacked, 'stacked-skill');
  assert.ok(stacked.texts.includes('×1.4'));
  assert.ok(stacked.texts.includes('×0.72'));
  assert.equal(countText(stacked, '看广告'), 3);
  assert.equal(countText(stacked, '无目标'), 1);
  assert.equal(countText(stacked, '已满'), 0);
  assert.equal(formatMultiplier(1.4), '×1.4');
  assert.equal(formatMultiplier(0.7225), '×0.72');
  assert.equal(formatMultiplier(2), '×2.0');

  const full = makeCtx();
  drawSkillBar(full, layout, {
    balls: new Array(8).fill({ docked: false, kind: 'blue' }),
    skillStacks: { widePaddle: 3, slow: 5 },
  }, 0);
  assertFinite(full, 'full-skill');
  assert.equal(countText(full, '已满'), 4);
  assert.equal(countText(full, '看广告'), 0);
  assert.equal(countText(full, '无目标'), 0);
  assert.ok(full.texts.every((text) => !/\d+s$/.test(text)));
});

test('减益状态条显示类型与累计层数，不显示倒计时', () => {
  const view = { w: 750, h: 1334, bleed: { x: 0, y: 0, w: 750, h: 1334 } };
  const layout = computePlayLayout(view);
  const sim = {
    debuffs: { shrink: 2, speed: 1, reverse: 0 },
  };
  const items = activeDebuffs(sim);
  assert.deepEqual(items.map((item) => item.kind), ['shrink', 'speed']);
  assert.equal(items[0].stacks, 2);
  assert.equal(items[1].stacks, 1);

  const ctx = makeCtx();
  drawDebuffBar(ctx, layout, items);
  assertFinite(ctx, 'debuff-bar');
  assert.ok(ctx.texts.includes('缩板 ×2'));
  assert.ok(ctx.texts.includes('加速 ×1'));
  assert.ok(ctx.texts.every((text) => !/\d+s$/.test(text)));

  const empty = makeCtx();
  drawDebuffBar(empty, layout, activeDebuffs({ debuffs: { shrink: 0, speed: 0, reverse: 0 } }));
  assert.equal(empty.texts.length, 0);
});

test('弹层布局与绘制坐标均为有限值', () => {
  const view = { w: 750, h: 1334, bleed: { x: 0, y: 0, w: 750, h: 1334 } };
  const modal = {
    kind: 'skill',
    title: '广告播放中',
    subtitle: '完整观看即可获得奖励',
    lines: [{ text: '分裂 立即施放', bold: true }],
    buttons: [
      { id: 'adSkill', label: '看广告', kind: 'mint' },
      { id: 'cancelSkill', label: '取消', kind: 'ghost' },
    ],
    note: '广告期间整局暂停',
  };
  const layout = modalLayout(modal, view);
  assert.ok(layout.card.y >= 0);
  assert.ok(layout.card.y + layout.card.h <= view.h);
  assert.equal(layout.buttons.length, 2);
  assert.ok(layout.buttons.every((btn) => btn.x >= layout.card.x && btn.x + btn.w <= layout.card.x + layout.card.w));

  const ctx = makeCtx();
  drawModal(ctx, view, modal, 1500);
  assertFinite(ctx, 'modal');
  assert.ok(ctx.texts.includes('广告播放中'));
  assert.ok(ctx.texts.includes('分裂 立即施放'));
});
