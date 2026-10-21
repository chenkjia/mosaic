import { applyViewTransformTo, clientToDesign, designSizeOf } from './view.js';
import { createKVStorage } from './storage.js';

const DEFAULT_SIMULATED_AD_MS = 3000;

export function createMinigamePlatform(api, options) {
  if (!api) throw new Error('[platform] 小游戏 API 不可用');
  const opts = options || {};
  const adUnitId = opts.adUnitId || '';
  const adUnitIds = opts.adUnitIds || null;
  const simulatedAdMs = Number.isFinite(opts.simulatedAdMs)
    ? Math.max(0, opts.simulatedAdMs)
    : DEFAULT_SIMULATED_AD_MS;
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
    if (typeof api.shareAppMessage !== 'function') return false;
    const data = Object.assign({}, payload || {});
    // 主包只含 boot/loading，游戏资源都在分包内，分享封面必须带分包前缀。
    if (typeof data.imageUrl === 'string' && data.imageUrl.indexOf('assets/') === 0) {
      data.imageUrl = 'pkg-game/' + data.imageUrl;
    }
    api.shareAppMessage(data);
    return true;
  }

  const adCache = new Map();

  function unitFor(placement) {
    return (adUnitIds && adUnitIds[placement]) || adUnitId;
  }

  function sdkAvailable() {
    if (typeof api.createRewardedVideoAd !== 'function') return false;
    if (adUnitId) return true;
    if (!adUnitIds) return false;
    for (const key of Object.keys(adUnitIds)) {
      if (adUnitIds[key]) return true;
    }
    return false;
  }

  function adMode() {
    return sdkAvailable() ? 'sdk' : 'simulated';
  }

  function getAd(unit) {
    if (adCache.has(unit)) return adCache.get(unit);
    const ad = api.createRewardedVideoAd({ adUnitId: unit });
    adCache.set(unit, ad);
    return ad;
  }

  function playSdkAd(unit) {
    return new Promise((resolve) => {
      let ad = null;
      try {
        ad = getAd(unit);
      } catch {
        resolve(false);
        return;
      }
      if (!ad) {
        resolve(false);
        return;
      }
      let settled = false;
      function finish(value) {
        if (settled) return;
        settled = true;
        if (typeof ad.offClose === 'function') ad.offClose(onClose);
        if (typeof ad.offError === 'function') ad.offError(onError);
        resolve(value);
      }
      function onClose(res) {
        // 旧基础库 onClose 不传 res，按完整观看处理。
        finish(!res || res.isEnded !== false);
      }
      function onError() {
        finish(false);
      }
      function retryLoad() {
        if (typeof ad.load !== 'function') {
          finish(false);
          return;
        }
        try {
          Promise.resolve(ad.load()).then(() => ad.show()).catch(onError);
        } catch {
          onError();
        }
      }
      if (typeof ad.onClose === 'function') ad.onClose(onClose);
      if (typeof ad.onError === 'function') ad.onError(onError);
      try {
        const shown = ad.show();
        if (shown && typeof shown.catch === 'function') shown.catch(retryLoad);
      } catch {
        retryLoad();
      }
    });
  }

  function simulateAd() {
    if (simulatedAdMs <= 0) return Promise.resolve(true);
    return new Promise((resolve) => {
      setTimeout(() => resolve(true), simulatedAdMs);
    });
  }

  function showRewardedAd(placement) {
    const unit = unitFor(placement);
    if (!unit || typeof api.createRewardedVideoAd !== 'function') return simulateAd();
    return playSdkAd(unit);
  }

  // 微信小游戏前两次离屏 createCanvas 可能返回上屏主画布，连续取到独立画布为止。
  function createCanvas() {
    if (typeof api.createCanvas !== 'function') return null;
    for (let attempt = 0; attempt < 4; attempt += 1) {
      let surface = null;
      try {
        surface = api.createCanvas();
      } catch {
        return null;
      }
      if (!surface || surface === canvas) continue;
      surface.width = 1;
      surface.height = 1;
      return surface;
    }
    return null;
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

  function debugInstall() {
    // 真机不挂调试探针，避免提审产物暴露内部状态。
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
    adMode,
    createCanvas,
    debugInstall,
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
