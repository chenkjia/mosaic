import test from 'node:test';
import assert from 'node:assert/strict';
import { PALETTE } from '@mosaic/shared';
import { computePlayLayout } from '../src/game/layout.js';
import { drawGemBrick } from '../src/gfx/drawGemBrick.js';
import { drawHud } from '../src/ui/hud.js';
import { drawSkillBar } from '../src/ui/skillBar.js';
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

test('宝石砖四态绘制坐标均为有限值', () => {
  const cases = [
    { type: 'normal', hp: 1, color: 5 },
    { type: 'hard', hp: 2, color: 7 },
    { type: 'hard', hp: 3, color: 8 },
    { type: 'obstacle', hp: 0, color: 2 },
    { type: 'reward', hp: 1, color: 9 },
  ];
  for (const brick of cases) {
    const ctx = makeCtx();
    drawGemBrick(ctx, 10.5, 20.5, 31, brick, PALETTE, { radius: 7 });
    assertFinite(ctx, brick.type);
  }
});

test('HUD 与四格技能栏绘制坐标均为有限值', () => {
  const view = { w: 750, h: 1334, bleed: { x: 0, y: 0, w: 750, h: 1334 } };
  const layout = computePlayLayout(view);
  const ctx = makeCtx();
  drawHud(ctx, layout, {
    levelId: 7,
    percent: 42,
    left: 80,
    total: 140,
  });
  const sim = {
    time: 100,
    charges: [1, 0, 1, 1],
    effects: { wideUntil: 110, laserUntil: 0, slowUntil: 105 },
  };
  drawSkillBar(ctx, layout, sim, 1000);
  assertFinite(ctx, 'hud+skill');
  assert.ok(ctx.texts.includes('第 7 关'));
  assert.ok(ctx.texts.includes('CLEARED'));
  assert.ok(ctx.texts.includes('42%'));
  assert.ok(ctx.texts.includes('点击释放'));
  assert.ok(ctx.texts.includes('看广告'));
  assert.equal(ctx.texts.includes('金币'), false);
});

test('弹层布局与绘制坐标均为有限值', () => {
  const view = { w: 750, h: 1334, bleed: { x: 0, y: 0, w: 750, h: 1334 } };
  const modal = {
    kind: 'skillCharge',
    title: '补充技能',
    subtitle: '分裂球 · 点击释放',
    lines: [{ text: '看一段广告，获得 1 次使用', bold: true }],
    buttons: [
      { id: 'adSkill', label: '看广告补充', kind: 'mint' },
      { id: 'cancelSkill', label: '取消', kind: 'ghost' },
    ],
    note: '每格最多储存 1 次',
  };
  const layout = modalLayout(modal, view);
  assert.ok(layout.card.y >= 0);
  assert.ok(layout.card.y + layout.card.h <= view.h);
  assert.equal(layout.buttons.length, 2);
  assert.ok(layout.buttons.every((btn) => btn.x >= layout.card.x && btn.x + btn.w <= layout.card.x + layout.card.w));

  const ctx = makeCtx();
  drawModal(ctx, view, modal, 1500);
  assertFinite(ctx, 'modal');
  assert.ok(ctx.texts.includes('补充技能'));
});
