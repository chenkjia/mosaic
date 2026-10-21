export function rgbOf(hex) {
  const n = parseInt(String(hex).slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

export function mixHex(from, to, amount) {
  const a = rgbOf(from);
  const b = rgbOf(to);
  const r = Math.round(a[0] + (b[0] - a[0]) * amount);
  const g = Math.round(a[1] + (b[1] - a[1]) * amount);
  const bl = Math.round(a[2] + (b[2] - a[2]) * amount);
  return '#' + ((1 << 24) | (r << 16) | (g << 8) | bl).toString(16).slice(1);
}

export function rgbaOf(hex, alpha) {
  const c = rgbOf(hex);
  return 'rgba(' + c[0] + ',' + c[1] + ',' + c[2] + ',' + alpha + ')';
}
