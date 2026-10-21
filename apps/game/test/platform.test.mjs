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
    loadSubpackage: ({ success }) => {
      success();
      return { onProgressUpdate() {} };
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
    onHide() {},
    onShow() {},
  };
}

test('小游戏 adapter 暴露全部 seam 且坐标/存储/分包可用', async () => {
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

  await platform.loadSubpackage('pkgGame');
  await platform.loadImage('ok.png');
  await assert.rejects(platform.loadImage('bad.png'), /图片加载失败/);

  let pointed = null;
  platform.onPointer((event) => { pointed = event; });
  api.listeners.start({ touches: [{ clientX: 187.5, clientY: 333.5 }] });
  assert.equal(pointed.type, 'start');
  assert.equal(pointed.x, 375);
  assert.equal(pointed.y, 667);

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
