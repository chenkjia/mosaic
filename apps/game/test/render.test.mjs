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
    assert.equal(layout.board.x + layout.board.w <= 750, true);
    assert.ok(layout.board.y + layout.board.h < layout.skill.y);
    for (const slot of layout.skill.slots) {
      assert.ok(slot.x >= 0 && slot.x + slot.w <= 750);
      assert.ok(slot.y + slot.h < view.h);
    }
    assert.ok(layout.hintY < view.h);
  }
});

test('游戏面板通宽并铺到屏幕最底', () => {
  const views = [
    { w: 750, h: 1624, bleed: { x: 0, y: 0, w: 750, h: 1624 } },
    { w: 750, h: 1334, bleed: { x: -47, y: 0, w: 844, h: 1334 } },
  ];
  for (const view of views) {
    const layout = computePlayLayout(view);
    assert.equal(layout.panel.x, view.bleed.x);
    assert.equal(layout.panel.w, view.bleed.w);
    assert.equal(layout.panel.y + layout.panel.h, view.h);
    assert.ok(layout.panel.y >= layout.hud.h);
    assert.ok(layout.panel.y <= layout.board.y);
  }
});

test('面板贴底时控件避让安全区', () => {
  for (const h of [1334, 1624, 1900]) {
    for (const safeBottom of [0, 34, 68]) {
      const view = { w: 750, h, bleed: { x: 0, y: 0, w: 750, h }, safeBottom };
      const layout = computePlayLayout(view);
      const limit = h - safeBottom;
      assert.equal(layout.panel.y + layout.panel.h, h);
      assert.ok(layout.board.y + layout.board.h < layout.skill.y);
      for (const slot of layout.skill.slots) {
        assert.ok(slot.y + slot.h <= limit, '技能槽底边越入安全区: h=' + h + ' safe=' + safeBottom);
      }
      assert.ok(layout.hintY < h);
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

test('HUD 与技能槽绘制坐标均为有限值', () => {
  const view = { w: 750, h: 1334, bleed: { x: 0, y: 0, w: 750, h: 1334 } };
  const layout = computePlayLayout(view);
  const ctx = makeCtx();
  drawHud(ctx, layout, {
    levelId: 7,
    levelCount: 30,
    theme: 'animals',
    percent: 42,
    left: 80,
    total: 140,
    coins: 123,
  });
  const sim = {
    time: 100,
    slots: ['multiBall', 'laser', 'slow', null],
    slotCapacity: 3,
    effects: { wideUntil: 110, laserUntil: 0, slowUntil: 105 },
  };
  drawSkillBar(ctx, layout, sim, 1000);
  assertFinite(ctx, 'hud+skill');
  assert.ok(ctx.texts.includes('CLEARED'));
  assert.ok(ctx.texts.includes('42%'));
});

test('弹层布局与绘制坐标均为有限值', () => {
  const view = { w: 750, h: 1334, bleed: { x: 0, y: 0, w: 750, h: 1334 } };
  const modal = {
    kind: 'result',
    title: '过关！',
    subtitle: '第 1 关 · 清除 100%',
    lines: [{ text: '本关金币 +20', bold: true }],
    buttons: [
      { id: 'next', label: '下一关', kind: 'primary' },
      { id: 'double', label: '看广告 ×2 金币', kind: 'violet' },
      { id: 'home', label: '返回主页', kind: 'ghost' },
    ],
    autoAt: 2000,
    autoLabel: '自动进入下一关',
    note: '最高关已更新',
  };
  const layout = modalLayout(modal, view);
  assert.ok(layout.card.y >= 0);
  assert.ok(layout.card.y + layout.card.h <= view.h);
  assert.equal(layout.buttons.length, 3);
  assert.ok(layout.buttons.every((btn) => btn.x >= layout.card.x && btn.x + btn.w <= layout.card.x + layout.card.w));

  const ctx = makeCtx();
  drawModal(ctx, view, modal, 1500);
  assertFinite(ctx, 'modal');
  assert.ok(ctx.texts.includes('过关！'));
});
