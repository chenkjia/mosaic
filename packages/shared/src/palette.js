export const PALETTE = [
  '#FFF6FA', '#E9E1FF', '#5B4BC4', '#FFFFFF',
  '#2A2344', '#FF9FC2', '#FF6F9E', '#FFC58A',
  '#FF9A5C', '#FFD86E', '#FFB84D', '#7BDCC8',
  '#4CC9B0', '#8FD3FF', '#5AA9F0', '#A9A0FF',
];

export const PALETTE_RGB = PALETTE.map((hex) => {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
});

export function hexToRgb(hex) {
  const n = parseInt(String(hex).slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

export function isHexColor(value) {
  return typeof value === 'string' && /^#[0-9a-fA-F]{6}$/.test(value);
}

export function nearestPaletteIndex(r, g, b, rgbTable) {
  const table = rgbTable || PALETTE_RGB;
  let best = 0;
  let bestDist = Infinity;
  for (let i = 0; i < table.length; i += 1) {
    const c = table[i];
    const dr = r - c[0];
    const dg = g - c[1];
    const db = b - c[2];
    const dist = dr * dr + dg * dg + db * db;
    if (dist < bestDist) {
      bestDist = dist;
      best = i;
    }
  }
  return best;
}
