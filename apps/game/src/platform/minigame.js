import { applyViewTransformTo, clientToDesign, designSizeOf } from './view.js';
import { createKVStorage } from './storage.js';

export function createMinigamePlatform(api) {
  if (!api) throw new Error('[platform] 小游戏 API 不可用');
  const sys = api.getSystemInfoSync ? api.getSystemInfoSync() : {};
  if (!sys.screenWidth || !sys.screenHeight) {
    throw new Error('[platform] getSystemInfoSync 缺少 screenWidth/screenHeight');
  }

  // 首次 createCanvas 返回系统主画布；必须显式设物理分辨率，否则高分屏发虚。
  const canvas = api.createCanvas();
  const dpr = sys.pixelRatio || 1;
  canvas.width = Math.round(sys.screenWidth * dpr);
  canvas.height = Math.round(sys.screenHeight * dpr);

  const hasStorage = typeof api.getStorageSync === 'function'
    && typeof api.setStorageSync === 'function';
  const storage = createKVStorage(hasStorage ? {
    get: (key) => api.getStorageSync(key),
    set: (key, value) => api.setStorageSync(key, value),
  } : null);

  function getSystemInfo() {
    return {
      screenWidth: sys.screenWidth,
      screenHeight: sys.screenHeight,
      pixelRatio: dpr,
      safeArea: sys.safeArea || null,
    };
  }

  function rawSafeInsets() {
    const area = sys.safeArea;
    if (!area
      || typeof area.top !== 'number' || !Number.isFinite(area.top)
      || typeof area.bottom !== 'number' || !Number.isFinite(area.bottom)) {
      return { top: 0, bottom: 0 };
    }
    const physPerLogical = canvas.width / sys.screenWidth;
    return {
      top: area.top * physPerLogical,
      bottom: (sys.screenHeight - area.bottom) * physPerLogical,
    };
  }

  function loadImage(src) {
    return new Promise((resolve, reject) => {
      if (typeof api.createImage !== 'function') {
        reject(new Error('[platform] createImage 不可用'));
        return;
      }
      const img = api.createImage();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error('[platform] 图片加载失败: ' + src));
      img.src = src;
    });
  }

  function loadSubpackage(name, onProgress) {
    return new Promise((resolve, reject) => {
      if (typeof api.loadSubpackage !== 'function') {
        resolve();
        return;
      }
      const task = api.loadSubpackage({
        name,
        success: () => resolve(),
        fail: (err) => reject(err || new Error('[platform] 分包加载失败: ' + name)),
      });
      if (task && typeof task.onProgressUpdate === 'function' && typeof onProgress === 'function') {
        task.onProgressUpdate((res) => {
          if (res && typeof res.progress === 'number') {
            onProgress(res.progress / 100);
          }
        });
      }
    });
  }

  function share(payload) {
    if (typeof api.shareAppMessage === 'function') {
      api.shareAppMessage(payload || {});
      return true;
    }
    return false;
  }

  // 广告在 Ticket 07 落地；先保留 seam，避免调用方做平台分支。
  function showRewardedAd() {
    return Promise.resolve(false);
  }

  function createAudio(src, loop) {
    if (typeof api.createInnerAudioContext !== 'function') return null;
    const audio = api.createInnerAudioContext();
    audio.src = src;
    audio.loop = !!loop;
    return {
      play: () => audio.play(),
      pause: () => audio.pause(),
      stop: () => audio.stop(),
      destroy: () => audio.destroy(),
      setLoop: (value) => { audio.loop = !!value; },
    };
  }

  function onPointer(handler) {
    const emit = (type) => (res) => {
      const touch = (res.touches && res.touches[0])
        || (res.changedTouches && res.changedTouches[0]);
      if (!touch) return;
      const point = clientToDesign(canvas, sys, touch.clientX, touch.clientY);
      handler({ type, x: point.x, y: point.y });
    };
    if (typeof api.onTouchStart === 'function') api.onTouchStart(emit('start'));
    if (typeof api.onTouchMove === 'function') api.onTouchMove(emit('move'));
    if (typeof api.onTouchEnd === 'function') api.onTouchEnd(emit('end'));
  }

  function onHide(handler) {
    if (typeof api.onHide === 'function') api.onHide(handler);
  }

  function onShow(handler) {
    if (typeof api.onShow === 'function') api.onShow(handler);
  }

  const schedule =
    typeof canvas.requestAnimationFrame === 'function'
      ? (cb) => canvas.requestAnimationFrame(cb)
      : typeof requestAnimationFrame === 'function'
        ? (cb) => requestAnimationFrame(cb)
        : (cb) => setTimeout(() => cb(Date.now()), 16);

  function onFrame(handler) {
    const loop = (now) => {
      handler(now);
      schedule(loop);
    };
    schedule(loop);
  }

  return {
    getSystemInfo,
    getMainCanvas: () => canvas,
    loadImage,
    loadSubpackage,
    storage,
    share,
    showRewardedAd,
    audio: { create: createAudio },
    onPointer,
    onHide,
    onShow,
    onFrame,
    designSize: () => designSizeOf(canvas, rawSafeInsets()),
    applyViewTransform: (ctx) => applyViewTransformTo(ctx, canvas),
    pixelRatio: () => dpr,
    log: (...args) => console.log(...args),
  };
}
