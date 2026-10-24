import { mixHex } from './color.js';
import { roundRectPath } from './roundRect.js';

const GLOSS_TOP = 'rgba(255,255,255,0.46)';
const GLOSS_CLEAR = 'rgba(255,255,255,0)';
const TOP_STRIP = 'rgba(255,255,255,0.28)';
const BOTTOM_SHADE = 'rgba(42,35,68,0.12)';
const LEFT_SHINE = 'rgba(255,255,255,0.12)';
const OUTLINE = 'rgba(42,35,68,0.32)';
const SHADOW = 'rgba(42,35,68,0.16)';
const SPARK = 'rgba(255,255,255,0.78)';
const CRACK = 'rgba(42,35,68,0.56)';
const STRIPE = 'rgba(255,255,255,0.30)';
const HP_DOT = 'rgba(42,35,68,0.58)';
const REWARD_FILL = 'rgba(255,255,255,0.96)';
const REWARD_SPARK = 'rgba(255,255,255,0.92)';
const DEBUFF_STYLE = {
  shrink: { color: '#FF9A5C' },
  speed: { color: '#D9547A' },
  reverse: { color: '#8B7FE8' },
};

function drawCracks(ctx, x, y, size, hp, k) {
  ctx.strokeStyle = CRACK;
  ctx.lineWidth = 1.5 * k;
  ctx.lineJoin = 'round';
  ctx.beginPath();
  ctx.moveTo(x + size * 0.54, y + size * 0.16);
  ctx.lineTo(x + size * 0.47, y + size * 0.42);
  ctx.lineTo(x + size * 0.59, y + size * 0.56);
  ctx.lineTo(x + size * 0.51, y + size * 0.84);
  ctx.stroke();
  if (hp >= 3) {
    ctx.beginPath();
    ctx.moveTo(x + size * 0.22, y + size * 0.30);
    ctx.lineTo(x + size * 0.36, y + size * 0.52);
    ctx.lineTo(x + size * 0.28, y + size * 0.72);
    ctx.stroke();
  }
}

function drawStripes(ctx, x, y, size, k) {
  ctx.strokeStyle = STRIPE;
  ctx.lineWidth = 3 * k;
  for (let i = -size; i < size * 2; i += 9 * k) {
    ctx.beginPath();
    ctx.moveTo(x + i, y + size);
    ctx.lineTo(x + i + size, y);
    ctx.stroke();
  }
}

function drawReward(ctx, x, y, size, k) {
  const cx = x + size / 2;
  const cy = y + size / 2;
  const d = 8 * k;
  ctx.beginPath();
  ctx.moveTo(cx, cy - d);
  ctx.lineTo(cx + d, cy);
  ctx.lineTo(cx, cy + d);
  ctx.lineTo(cx - d, cy);
  ctx.closePath();
  ctx.fillStyle = REWARD_FILL;
  ctx.fill();
  ctx.strokeStyle = OUTLINE;
  ctx.lineWidth = k;
  ctx.stroke();

  ctx.strokeStyle = REWARD_SPARK;
  ctx.lineWidth = 1.2 * k;
  ctx.beginPath();
  ctx.moveTo(x + size - 10 * k, y + 7 * k);
  ctx.lineTo(x + size - 10 * k, y + 12 * k);
  ctx.moveTo(x + size - 12.5 * k, y + 9.5 * k);
  ctx.lineTo(x + size - 7.5 * k, y + 9.5 * k);
  ctx.stroke();
}

function drawDebuff(ctx, x, y, size, kind, k) {
  const style = DEBUFF_STYLE[kind] || DEBUFF_STYLE.shrink;
  ctx.save();
  ctx.globalAlpha = 0.20;
  ctx.fillStyle = style.color;
  ctx.fillRect(x, y, size, size);
  ctx.restore();

  const cx = x + size / 2;
  const cy = y + size / 2;
  const r = Math.max(7 * k, size * 0.24);
  roundRectPath(ctx, cx - r, cy - r, r * 2, r * 2, r * 0.42);
  ctx.fillStyle = style.color;
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.90)';
  ctx.lineWidth = k;
  ctx.stroke();

  const s = r * 0.62;
  ctx.strokeStyle = '#FFFFFF';
  ctx.fillStyle = '#FFFFFF';
  ctx.lineWidth = Math.max(1.4 * k, size * 0.055);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  if (kind === 'speed') {
    for (let i = 0; i < 2; i += 1) {
      const ox = cx + (i - 0.5) * s * 0.9;
      ctx.beginPath();
      ctx.moveTo(ox - s * 0.4, cy - s * 0.62);
      ctx.lineTo(ox + s * 0.28, cy);
      ctx.lineTo(ox - s * 0.4, cy + s * 0.62);
      ctx.stroke();
    }
  } else if (kind === 'reverse') {
    ctx.beginPath();
    ctx.arc(cx, cy + s * 0.1, s * 0.72, Math.PI * 0.25, Math.PI * 1.65);
    ctx.stroke();
    const ax = cx + Math.cos(Math.PI * 1.65) * s * 0.72;
    const ay = cy + s * 0.1 + Math.sin(Math.PI * 1.65) * s * 0.72;
    ctx.beginPath();
    ctx.moveTo(ax - s * 0.34, ay - s * 0.12);
    ctx.lineTo(ax, ay + s * 0.1);
    ctx.lineTo(ax + s * 0.3, ay - s * 0.18);
    ctx.stroke();
  } else {
    ctx.beginPath();
    ctx.moveTo(cx - s, cy - s * 0.6);
    ctx.lineTo(cx - s * 0.25, cy - s * 0.1);
    ctx.lineTo(cx - s, cy + s * 0.4);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(cx + s, cy - s * 0.6);
    ctx.lineTo(cx + s * 0.25, cy - s * 0.1);
    ctx.lineTo(cx + s, cy + s * 0.4);
    ctx.closePath();
    ctx.fill();
    ctx.fillRect(cx - s * 0.9, cy + s * 0.55, s * 1.8, s * 0.34);
  }
}

// 冻结自 apps/demo/demo1：底色 → 顶部高光 → 底部内阴影 → 圆角描边 → 投影。
export function drawGemBrick(ctx, x, y, size, brick, palette, options) {
  if (!Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(size) || size <= 0) return;
  const k = size / 31;
  const radius = options && options.radius != null ? options.radius : 7 * k;
  const paletteColor = palette && palette[brick.color] ? palette[brick.color] : '#FF9FC2';
  const light = options && options.light ? options.light : '#FFFFFF';
  const dark = options && options.dark ? options.dark : '#2A2344';

  ctx.fillStyle = SHADOW;
  roundRectPath(ctx, x + 1.2 * k, y + 2.2 * k, size, size, radius);
  ctx.fill();

  const base = ctx.createLinearGradient(x, y, x, y + size);
  base.addColorStop(0, mixHex(paletteColor, light, 0.20));
  base.addColorStop(0.56, paletteColor);
  base.addColorStop(1, mixHex(paletteColor, dark, 0.16));
  roundRectPath(ctx, x, y, size, size, radius);
  ctx.fillStyle = base;
  ctx.fill();

  ctx.save();
  roundRectPath(ctx, x, y, size, size, radius);
  ctx.clip();

  const gloss = ctx.createLinearGradient(x, y, x, y + size * 0.62);
  gloss.addColorStop(0, GLOSS_TOP);
  gloss.addColorStop(1, GLOSS_CLEAR);
  ctx.fillStyle = gloss;
  ctx.fillRect(x, y, size, size * 0.62);

  ctx.fillStyle = TOP_STRIP;
  roundRectPath(ctx, x + 3 * k, y + 3 * k, size - 6 * k, Math.max(3 * k, size * 0.2), 3.5 * k);
  ctx.fill();

  ctx.fillStyle = BOTTOM_SHADE;
  ctx.fillRect(x, y + size * 0.78, size, size * 0.22);
  ctx.fillStyle = LEFT_SHINE;
  ctx.fillRect(x + 2.4 * k, y + 8 * k, 1.4 * k, Math.max(k, size - 16 * k));

  if (brick.type === 'obstacle') drawStripes(ctx, x, y, size, k);
  if (brick.type === 'hard') drawCracks(ctx, x, y, size, brick.hp, k);
  if (brick.type === 'reward') drawReward(ctx, x, y, size, k);
  if (brick.type === 'debuff') drawDebuff(ctx, x, y, size, brick.debuff, k);

  ctx.restore();

  roundRectPath(ctx, x, y, size, size, radius);
  ctx.strokeStyle = OUTLINE;
  ctx.lineWidth = Math.max(1, k);
  ctx.stroke();

  ctx.beginPath();
  ctx.ellipse(
    x + size * 0.25,
    y + size * 0.21,
    Math.max(1.2 * k, size * 0.065),
    Math.max(0.8 * k, size * 0.04),
    -0.2, 0, Math.PI * 2,
  );
  ctx.fillStyle = SPARK;
  ctx.fill();

  if (brick.type === 'hard') {
    ctx.fillStyle = HP_DOT;
    for (let i = 0; i < brick.hp; i += 1) {
      ctx.beginPath();
      ctx.arc(x + 6 * k + i * 5 * k, y + size - 5.5 * k, 1.35 * k, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}
