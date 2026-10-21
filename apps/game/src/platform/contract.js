export const PLATFORM_SEAMS = [
  'getSystemInfo',
  'getMainCanvas',
  'loadImage',
  'storage',
  'share',
  'showRewardedAd',
  'audio',
  'onPointer',
  'onHide',
  'onShow',
];

export const PLATFORM_EXTRAS = [
  'onFrame',
  'designSize',
  'applyViewTransform',
  'pixelRatio',
  'createCanvas',
  'adMode',
  'debugInstall',
  'log',
];

export function assertPlatformAdapter(adapter) {
  if (!adapter) throw new Error('[platform] adapter 缺失');
  const required = PLATFORM_SEAMS.concat(PLATFORM_EXTRAS);
  const missing = required.filter((name) => adapter[name] == null);
  if (missing.length > 0) {
    throw new Error('[platform] adapter 缺少 seam: ' + missing.join(', '));
  }
  if (typeof adapter.storage.get !== 'function' || typeof adapter.storage.set !== 'function') {
    throw new Error('[platform] storage 必须提供 get/set');
  }
  if (typeof adapter.audio.create !== 'function') {
    throw new Error('[platform] audio 必须提供 create');
  }
  return adapter;
}
