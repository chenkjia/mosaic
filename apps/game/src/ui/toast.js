import { roundRectPath } from '../gfx/roundRect.js';
import { C, FONT } from './theme.js';

const TTL = 1900;

export function createToast() {
  let text = '';
  let shownAt = -1;

  function show(value) {
    text = String(value || '');
    shownAt = -1;
  }

  function draw(ctx, view, now, y) {
    if (!text) return;
    if (shownAt < 0) shownAt = now;
    const elapsed = now - shownAt;
    if (elapsed > TTL) {
      text = '';
      shownAt = -1;
      return;
    }
    const fade = elapsed > TTL - 320 ? (TTL - elapsed) / 320 : 1;
    const width = Math.min(620, Math.max(220, text.length * 23 + 64));
    const height = 58;
    const x = (view.w - width) / 2;
    const top = (y == null ? view.h - 74 : y) - height;
    ctx.save();
    ctx.globalAlpha = Math.max(0, fade);
    ctx.fillStyle = 'rgba(42,35,68,0.86)';
    roundRectPath(ctx, x, top, width, height, height / 2);
    ctx.fill();
    ctx.fillStyle = C.white;
    ctx.font = FONT.body;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, view.w / 2, top + height / 2 + 1);
    ctx.restore();
  }

  function isActive(now) {
    if (!text) return false;
    if (shownAt < 0) return true;
    return now - shownAt <= TTL;
  }

  function clear() {
    text = '';
    shownAt = -1;
  }

  return { show, draw, clear, isActive };
}
