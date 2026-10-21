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

function drawCracks(ctx, x, y, size, hp) {
  ctx.strokeStyle = CRACK;
  ctx.lineWidth = 1.5;
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

function drawStripes(ctx, x, y, size) {
  ctx.strokeStyle = STRIPE;
  ctx.lineWidth = 3;
  for (let i = -size; i < size * 2; i += 9) {
    ctx.beginPath();
    ctx.moveTo(x + i, y + size);
    ctx.lineTo(x + i + size, y);
    ctx.stroke();
  }
}

function drawReward(ctx, x, y, size) {
  const cx = x + size / 2;
  const cy = y + size / 2;
  ctx.beginPath();
  ctx.moveTo(cx, cy - 8);
  ctx.lineTo(cx + 8, cy);
  ctx.lineTo(cx, cy + 8);
  ctx.lineTo(cx - 8, cy);
  ctx.closePath();
  ctx.fillStyle = REWARD_FILL;
  ctx.fill();
  ctx.strokeStyle = OUTLINE;
  ctx.lineWidth = 1;
  ctx.stroke();

  ctx.strokeStyle = REWARD_SPARK;
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(x + size - 10, y + 7);
  ctx.lineTo(x + size - 10, y + 12);
  ctx.moveTo(x + size - 12.5, y + 9.5);
  ctx.lineTo(x + size - 7.5, y + 9.5);
  ctx.stroke();
}

// 冻结自 apps/demo/demo1：底色 → 顶部高光 → 底部内阴影 → 圆角描边 → 投影。
export function drawGemBrick(ctx, x, y, size, brick, palette, options) {
  if (!Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(size) || size <= 0) return;
  const radius = options && options.radius != null ? options.radius : 7;
  const paletteColor = palette && palette[brick.color] ? palette[brick.color] : '#FF9FC2';
  const light = options && options.light ? options.light : '#FFFFFF';
  const dark = options && options.dark ? options.dark : '#2A2344';

  ctx.fillStyle = SHADOW;
  roundRectPath(ctx, x + 1.2, y + 2.2, size, size, radius);
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
  roundRectPath(ctx, x + 3, y + 3, size - 6, Math.max(3, size * 0.2), 3.5);
  ctx.fill();

  ctx.fillStyle = BOTTOM_SHADE;
  ctx.fillRect(x, y + size * 0.78, size, size * 0.22);
  ctx.fillStyle = LEFT_SHINE;
  ctx.fillRect(x + 2.4, y + 8, 1.4, Math.max(1, size - 16));

  if (brick.type === 'obstacle') drawStripes(ctx, x, y, size);
  if (brick.type === 'hard') drawCracks(ctx, x, y, size, brick.hp);
  if (brick.type === 'reward') drawReward(ctx, x, y, size);

  ctx.restore();

  roundRectPath(ctx, x, y, size, size, radius);
  ctx.strokeStyle = OUTLINE;
  ctx.lineWidth = 1;
  ctx.stroke();

  ctx.beginPath();
  ctx.ellipse(x + size * 0.25, y + size * 0.21, Math.max(1.2, size * 0.065), Math.max(0.8, size * 0.04), -0.2, 0, Math.PI * 2);
  ctx.fillStyle = SPARK;
  ctx.fill();

  if (brick.type === 'hard') {
    ctx.fillStyle = HP_DOT;
    for (let i = 0; i < brick.hp; i += 1) {
      ctx.beginPath();
      ctx.arc(x + 6 + i * 5, y + size - 5.5, 1.35, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}
