import { applyViewTransformTo, clientToDesign, designSizeOf } from './view.js';
import { createKVStorage } from './storage.js';

export function createWebPlatform() {
  const canvas = document.getElementById('game') || document.createElement('canvas');
  if (!canvas.parentNode) document.body.appendChild(canvas);
  const params = new URLSearchParams(window.location.search);
  const simulatedAdMs = params.has('adMs')
    ? Math.max(0, Number(params.get('adMs')) || 0)
    : 3000;

  const sys = {
    screenWidth: window.innerWidth,
    screenHeight: window.innerHeight,
    pixelRatio: window.devicePixelRatio || 1,
    safeArea: null,
  };

  function resize() {
    sys.screenWidth = window.innerWidth;
    sys.screenHeight = window.innerHeight;
    sys.pixelRatio = window.devicePixelRatio || 1;
    canvas.width = Math.round(sys.screenWidth * sys.pixelRatio);
    canvas.height = Math.round(sys.screenHeight * sys.pixelRatio);
  }
  resize();
  window.addEventListener('resize', resize);

  let nativeStorage = null;
  try {
    const probe = '__mosaic_probe__';
    window.localStorage.setItem(probe, '1');
    window.localStorage.removeItem(probe);
    nativeStorage = {
      get: (key) => window.localStorage.getItem(key),
      set: (key, value) => window.localStorage.setItem(key, value),
    };
  } catch {
    nativeStorage = null;
  }
  const storage = createKVStorage(nativeStorage);

  function getSystemInfo() {
    return { ...sys };
  }

  function loadImage(src) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error('[platform] 图片加载失败: ' + src));
      img.src = src;
    });
  }

  function share(payload) {
    if (!navigator.share) return Promise.resolve(false);
    const data = payload || {};
    const title = data.title || 'Mosaic';
    const url = data.query
      ? window.location.origin + window.location.pathname + '?' + data.query
      : window.location.href;
    return navigator.share({ title, text: title, url }).then(() => true).catch(() => false);
  }

  function adMode() {
    return 'simulated';
  }

  function showRewardedAd() {
    if (simulatedAdMs <= 0) return Promise.resolve(true);
    return new Promise((resolve) => {
      setTimeout(() => resolve(true), simulatedAdMs);
    });
  }

  function createCanvas() {
    return document.createElement('canvas');
  }

  function debugInstall(api) {
    window.__MOSAIC_DEBUG__ = api;
  }

  function createAudio(src, loop) {
    const audio = new Audio(src);
    audio.loop = !!loop;
    return {
      play: () => audio.play().catch(() => {}),
      pause: () => audio.pause(),
      stop: () => {
        audio.pause();
        audio.currentTime = 0;
      },
      destroy: () => {
        audio.pause();
        audio.src = '';
      },
      setLoop: (value) => { audio.loop = !!value; },
    };
  }

  function onPointer(handler) {
    const emit = (type) => (event) => {
      const point = clientToDesign(canvas, sys, event.clientX, event.clientY);
      handler({ type, id: event.pointerId, x: point.x, y: point.y });
    };
    canvas.addEventListener('pointerdown', (event) => {
      event.preventDefault();
      emit('start')(event);
    });
    window.addEventListener('pointermove', emit('move'));
    window.addEventListener('pointerup', emit('end'));
    window.addEventListener('pointercancel', emit('cancel'));
  }

  function onHide(handler) {
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) handler();
    });
  }

  function onShow(handler) {
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) handler();
    });
  }

  function onFrame(handler) {
    const loop = (now) => {
      handler(now);
      window.requestAnimationFrame(loop);
    };
    window.requestAnimationFrame(loop);
  }

  return {
    getSystemInfo,
    getMainCanvas: () => canvas,
    loadImage,
    storage,
    share,
    showRewardedAd,
    adMode,
    createCanvas,
    debugInstall,
    audio: { create: createAudio },
    onPointer,
    onHide,
    onShow,
    onFrame,
    designSize: () => designSizeOf(canvas, { top: 0, bottom: 0 }),
    applyViewTransform: (ctx) => applyViewTransformTo(ctx, canvas),
    pixelRatio: () => sys.pixelRatio,
    log: (...args) => console.log(...args),
  };
}
