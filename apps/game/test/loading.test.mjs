import test from 'node:test';
import assert from 'node:assert/strict';
import { createLoadingScene } from '../src/boot/loading.js';

function makeCtx() {
  const texts = [];
  const numbers = [];
  const record = (...args) => {
    for (const value of args) {
      if (typeof value === 'number') numbers.push(value);
    }
  };
  return {
    texts,
    numbers,
    fillStyle: '',
    font: '',
    textAlign: '',
    textBaseline: '',
    createLinearGradient: (...args) => {
      record(...args);
      return { addColorStop: (...stops) => record(...stops) };
    },
    fillRect: record,
    fillText: (text, x, y) => {
      texts.push(text);
      record(x, y);
    },
    beginPath: () => {},
    moveTo: record,
    arcTo: record,
    closePath: () => {},
    fill: () => {},
  };
}

const view = {
  w: 750,
  h: 1334,
  bleed: { x: 0, y: 0, w: 750, h: 1334 },
};

test('loading 场景绘制标题与进度且坐标均为有限值', () => {
  const ctx = makeCtx();
  const loading = createLoadingScene();
  loading.setProgress(0.4);
  loading.draw(ctx, view, 320);

  assert.ok(ctx.texts.includes('Mosaic'));
  assert.ok(ctx.texts.some((text) => text.startsWith('加载中')));
  assert.ok(ctx.numbers.length > 0);
  assert.ok(ctx.numbers.every((value) => Number.isFinite(value)));
});

test('loading 失败态给出重试文案', () => {
  const ctx = makeCtx();
  const loading = createLoadingScene();
  loading.setFailed(true);
  loading.draw(ctx, view, 900);

  assert.ok(ctx.texts.some((text) => text.includes('点击屏幕重试')));
});
