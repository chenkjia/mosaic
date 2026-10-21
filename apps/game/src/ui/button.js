import { roundRectPath } from '../gfx/roundRect.js';
import { C, FONT } from './theme.js';

const KINDS = {
  primary: {
    fill: C.pinkDeep,
    shadow: 'rgba(255,111,158,0.38)',
    gloss: 'rgba(255,255,255,0.26)',
    text: C.white,
    border: null,
  },
  mint: {
    fill: C.mintDeep,
    shadow: 'rgba(76,201,176,0.38)',
    gloss: 'rgba(255,255,255,0.26)',
    text: C.white,
    border: null,
  },
  violet: {
    fill: C.violet,
    shadow: 'rgba(139,127,232,0.38)',
    gloss: 'rgba(255,255,255,0.26)',
    text: C.white,
    border: null,
  },
  secondary: {
    fill: C.white,
    shadow: 'rgba(42,35,68,0.10)',
    gloss: 'rgba(255,255,255,0)',
    text: C.primary,
    border: 'rgba(91,75,196,0.28)',
  },
  ghost: {
    fill: 'rgba(255,255,255,0.60)',
    shadow: 'rgba(42,35,68,0.06)',
    gloss: 'rgba(255,255,255,0)',
    text: C.muted,
    border: 'rgba(91,75,196,0.14)',
  },
  disabled: {
    fill: '#DDD6EC',
    shadow: 'rgba(42,35,68,0.06)',
    gloss: 'rgba(255,255,255,0)',
    text: 'rgba(91,75,196,0.48)',
    border: null,
  },
  danger: {
    fill: C.danger,
    shadow: 'rgba(217,84,122,0.34)',
    gloss: 'rgba(255,255,255,0.22)',
    text: C.white,
    border: null,
  },
};

export function drawButton(ctx, rect, label, kind, options) {
  if (!rect || !Number.isFinite(rect.x) || !Number.isFinite(rect.y)) return;
  const style = KINDS[kind] || KINDS.primary;
  const opts = options || {};
  const radius = opts.radius != null ? opts.radius : Math.min(30, rect.h / 2);
  const dy = opts.pressed ? 2 : 0;
  const x = rect.x;
  const y = rect.y + dy;

  ctx.fillStyle = style.shadow;
  roundRectPath(ctx, x, y + 4, rect.w, rect.h, radius);
  ctx.fill();

  ctx.fillStyle = style.fill;
  roundRectPath(ctx, x, y, rect.w, rect.h, radius);
  ctx.fill();

  if (style.gloss !== 'rgba(255,255,255,0)') {
    ctx.save();
    roundRectPath(ctx, x, y, rect.w, rect.h, radius);
    ctx.clip();
    ctx.fillStyle = style.gloss;
    ctx.fillRect(x, y, rect.w, rect.h * 0.48);
    ctx.restore();
  }

  if (style.border) {
    ctx.strokeStyle = style.border;
    ctx.lineWidth = 1.5;
    roundRectPath(ctx, x, y, rect.w, rect.h, radius);
    ctx.stroke();
  }

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = style.text;
  ctx.font = opts.font || FONT.button;
  const textY = y + rect.h / 2 + 1;
  if (!Number.isFinite(textY)) return;
  ctx.fillText(label, x + rect.w / 2, textY);
}

export function drawSmallButton(ctx, rect, label, kind, active) {
  drawButton(ctx, rect, label, kind || 'ghost', { radius: 18, font: FONT.buttonSmall, pressed: !!active });
}

export function hitRect(rect, x, y, pad) {
  if (!rect) return false;
  const p = pad || 0;
  return x >= rect.x - p && x <= rect.x + rect.w + p
    && y >= rect.y - p && y <= rect.y + rect.h + p;
}
