export function createBitmapCache(platform) {
  let entry = null;
  let builds = 0;
  let surface = null;

  function get(key, designW, designH, scale, draw) {
    if (entry && entry.key === key && entry.scale === scale) return entry;
    // 离屏画布只创建一次：微信前几次 createCanvas 可能返回主画布，重建时不能反复踩坑。
    if (!surface) surface = platform.createCanvas();
    const canvas = surface;
    if (!canvas || typeof canvas.getContext !== 'function') return null;
    const pxW = Math.max(1, Math.round(designW * scale));
    const pxH = Math.max(1, Math.round(designH * scale));
    canvas.width = pxW;
    canvas.height = pxH;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    ctx.setTransform(scale, 0, 0, scale, 0, 0);
    ctx.clearRect(0, 0, designW, designH);
    draw(ctx);
    entry = { key, scale, canvas, pxW, pxH, w: designW, h: designH };
    builds += 1;
    return entry;
  }

  function clear() {
    entry = null;
  }

  function stats() {
    return { builds, cached: !!entry, key: entry ? entry.key : null };
  }

  return { get, clear, stats };
}
