import { roundRectPath } from '../gfx/roundRect.js';
import { C, EFFECT_META, FONT } from './theme.js';

const ORDER = ['shrink', 'speed', 'reverse'];
const H = 28;

export function activeDebuffs(sim) {
  const items = [];
  for (let i = 0; i < ORDER.length; i += 1) {
    const kind = ORDER[i];
    const until = sim.effects[kind + 'Until'];
    if (until && sim.time < until) {
      items.push({ kind, remain: until - sim.time, meta: EFFECT_META[kind] });
    }
  }
  return items;
}

function drawGlyph(ctx, kind, cx, cy) {
  ctx.strokeStyle = C.white;
  ctx.fillStyle = C.white;
  ctx.lineWidth = 1.7;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  if (kind === 'speed') {
    ctx.beginPath();
    ctx.moveTo(cx - 4, cy - 4);
    ctx.lineTo(cx, cy);
    ctx.lineTo(cx - 4, cy + 4);
    ctx.moveTo(cx + 1, cy - 4);
    ctx.lineTo(cx + 5, cy);
    ctx.lineTo(cx + 1, cy + 4);
    ctx.stroke();
  } else if (kind === 'reverse') {
    ctx.beginPath();
    ctx.arc(cx, cy, 4, Math.PI * 0.25, Math.PI * 1.6);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(cx - 5, cy - 1);
    ctx.lineTo(cx - 1, cy + 1);
    ctx.lineTo(cx - 3, cy - 4);
    ctx.stroke();
  } else {
    ctx.beginPath();
    ctx.moveTo(cx - 5, cy - 3);
    ctx.lineTo(cx - 1, cy);
    ctx.lineTo(cx - 5, cy + 3);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(cx + 5, cy - 3);
    ctx.lineTo(cx + 1, cy);
    ctx.lineTo(cx + 5, cy + 3);
    ctx.closePath();
    ctx.fill();
  }
}

export function drawDebuffBar(ctx, layout, items) {
  if (!items || items.length === 0) return;
  const widths = items.map((item) => 34 + item.meta.short.length * 18 + 36);
  let total = 0;
  for (let i = 0; i < widths.length; i += 1) total += widths[i];
  total += (items.length - 1) * 10;
  let x = layout.board.x + (layout.board.w - total) / 2;
  const y = layout.skill.y - 44;

  for (let i = 0; i < items.length; i += 1) {
    const item = items[i];
    const w = widths[i];
    ctx.fillStyle = item.meta.color;
    roundRectPath(ctx, x, y, w, H, H / 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.5)';
    ctx.lineWidth = 1;
    roundRectPath(ctx, x, y, w, H, H / 2);
    ctx.stroke();

    drawGlyph(ctx, item.kind, x + 17, y + H / 2);
    ctx.fillStyle = C.white;
    ctx.font = FONT.tinyBold;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(item.meta.short + ' ' + Math.ceil(item.remain) + 's', x + 30, y + H / 2 + 1);
    x += w + 10;
  }
}
