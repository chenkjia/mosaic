import test from 'node:test';
import assert from 'node:assert/strict';
import { createMinigamePlatform } from '../src/platform/minigame.js';
import { createDouyinPlatform, createWechatPlatform } from '../src/platform/index.js';
import { assertPlatformAdapter } from '../src/platform/contract.js';
import { designSizeOf } from '../src/platform/view.js';

function makeApi() {
  const canvas = { width: 0, height: 0, getContext: () => ({}) };
  const offscreen = { width: 0, height: 0, getContext: () => ({}) };
  const kv = new Map();
  const listeners = {};
  let canvasCalls = 0;
  return {
    canvas,
    offscreen,
    listeners,
    getSystemInfoSync: () => ({
      screenWidth: 375,
      screenHeight: 667,
      pixelRatio: 2,
      safeArea: { top: 20, bottom: 647 },
    }),
    createCanvas: () => {
      canvasCalls += 1;
      return canvasCalls === 1 ? canvas : offscreen;
    },
    createImage: () => {
      const img = {};
      Object.defineProperty(img, 'src', {
        set(value) {
          setTimeout(() => {
            if (value.includes('bad')) img.onerror && img.onerror();
            else img.onload && img.onload();
          }, 0);
        },
      });
      return img;
    },
    getStorageSync: (key) => (kv.has(key) ? kv.get(key) : ''),
    setStorageSync: (key, value) => { kv.set(key, value); },
    shareAppMessage() {},
    createInnerAudioContext: () => ({
      play() {}, pause() {}, stop() {}, destroy() {},
    }),
    onTouchStart: (fn) => { listeners.start = fn; },
    onTouchMove: (fn) => { listeners.move = fn; },
    onTouchEnd: (fn) => { listeners.end = fn; },
    onTouchCancel: (fn) => { listeners.cancel = fn; },
    onHide() {},
    onShow() {},
  };
}

test('小游戏 adapter 暴露全部 seam 且坐标/存储可用', async () => {
  const api = makeApi();
  const platform = createMinigamePlatform(api, { simulatedAdMs: 0 });
  assertPlatformAdapter(platform);

  const sys = platform.getSystemInfo();
  assert.equal(sys.screenWidth, 375);
  assert.equal(sys.pixelRatio, 2);

  const canvas = platform.getMainCanvas();
  assert.equal(canvas.width, 750);
  assert.equal(canvas.height, 1334);

  const view = platform.designSize();
  assert.equal(view.w, 750);
  assert.equal(view.mode, 'fit');
  assert.equal(Math.round(view.safeTop), 40);

  platform.storage.set('k', 'v');
  assert.equal(platform.storage.get('k'), 'v');
  assert.equal(platform.storage.get('missing'), null);

  await platform.loadImage('ok.png');
  await assert.rejects(platform.loadImage('bad.png'), /图片加载失败/);

  const pointed = [];
  platform.onPointer((event) => { pointed.push(event); });
  api.listeners.start({
    touches: [],
    changedTouches: [{ identifier: 0, clientX: 187.5, clientY: 333.5 }],
  });
  assert.equal(pointed.length, 1);
  assert.equal(pointed[0].type, 'start');
  assert.equal(pointed[0].id, 0);
  assert.equal(pointed[0].x, 375);
  assert.equal(pointed[0].y, 667);

  api.listeners.move({
    touches: [],
    changedTouches: [
      { identifier: 1, clientX: 93.75, clientY: 166.75 },
      { identifier: 2, clientX: 281.25, clientY: 500.25 },
    ],
  });
  assert.equal(pointed.length, 3);
  assert.deepEqual(pointed.slice(1).map((event) => event.id), [1, 2]);
  assert.equal(pointed[2].x, 562.5);

  api.listeners.cancel({
    touches: [],
    changedTouches: [{ identifier: 1, clientX: 93.75, clientY: 166.75 }],
  });
  assert.equal(pointed[pointed.length - 1].type, 'cancel');

  assert.equal(platform.adMode(), 'simulated');
  assert.equal(await platform.showRewardedAd('revive'), true);
  const offscreen = platform.createCanvas();
  assert.ok(offscreen);
  assert.notEqual(offscreen, canvas);
  const audio = platform.audio.create('a.mp3', true);
  assert.equal(typeof audio.play, 'function');
});

test('微信/抖音 adapter 工厂可加载并满足契约', () => {
  for (const create of [createWechatPlatform, createDouyinPlatform]) {
    const platform = create(makeApi());
    assertPlatformAdapter(platform);
    assert.equal(platform.getSystemInfo().screenWidth, 375);
  }
});

test('390×844@2x 手机竖屏走 fit 模式并铺满宽度', () => {
  const view = designSizeOf({ width: 780, height: 1688 }, { top: 0, bottom: 0 });
  assert.equal(view.mode, 'fit');
  assert.equal(view.w, 750);
  assert.ok(view.h >= 1334);
  assert.equal(view.bleed.w, 750);
});

test('宽屏回退模式保持 750×1334 设计区域并左右留边', () => {
  const view = designSizeOf({ width: 1536, height: 2048 }, { top: 0, bottom: 0 });
  assert.equal(view.mode, 'fallback');
  assert.equal(view.w, 750);
  assert.equal(view.h, 1334);
  assert.ok(view.bleed.w > 750);
});

test('adapter 缺 seam 时明确报错', () => {
  assert.throws(() => assertPlatformAdapter({}), /缺少 seam/);
});
