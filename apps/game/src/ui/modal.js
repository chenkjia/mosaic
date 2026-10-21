import { roundRectPath } from '../gfx/roundRect.js';
import { drawButton } from './button.js';
import { C, FONT } from './theme.js';

const CARD_W = 610;
const BTN_H = 82;
const BTN_GAP = 14;
const PAD_X = 40;

export function modalLayout(modal, view) {
  const lines = modal.lines || [];
  const buttons = modal.buttons || [];
  const titleH = modal.title ? 74 : 0;
  const subtitleH = modal.subtitle ? 38 : 0;
  const noteH = modal.note ? 36 : 0;
  const contentH = 34 + titleH + subtitleH + lines.length * 34
    + buttons.length * (BTN_H + BTN_GAP) + noteH + 26;
  const card = {
    w: CARD_W,
    h: Math.min(contentH, view.h - 120),
    x: (view.w - CARD_W) / 2,
    y: Math.max(60, (view.h - contentH) / 2),
  };
  const rects = [];
  let y = card.y + 34 + titleH + subtitleH + lines.length * 34 + 8;
  for (let i = 0; i < buttons.length; i += 1) {
    rects.push({
      id: buttons[i].id,
      x: card.x + PAD_X,
      y,
      w: CARD_W - PAD_X * 2,
      h: BTN_H,
      label: buttons[i].label,
      kind: buttons[i].kind || 'secondary',
      disabled: !!buttons[i].disabled,
    });
    y += BTN_H + BTN_GAP;
  }
  return { card, buttons: rects };
}

export function drawModal(ctx, view, modal, now) {
  if (!modal) return null;
  const b = view.bleed;
  ctx.fillStyle = C.overlay;
  ctx.fillRect(b.x, b.y, b.w, b.h);

  const layout = modalLayout(modal, view);
  const card = layout.card;

  ctx.save();
  ctx.shadowColor = 'rgba(20,12,40,0.36)';
  ctx.shadowBlur = 28;
  ctx.shadowOffsetY = 12;
  ctx.fillStyle = C.panel;
  roundRectPath(ctx, card.x, card.y, card.w, card.h, 32);
  ctx.fill();
  ctx.restore();

  ctx.strokeStyle = 'rgba(91,75,196,0.12)';
  ctx.lineWidth = 1;
  roundRectPath(ctx, card.x, card.y, card.w, card.h, 32);
  ctx.stroke();

  let y = card.y + 34;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  if (modal.title) {
    ctx.fillStyle = modal.titleColor || C.primary;
    ctx.font = FONT.h1;
    ctx.fillText(modal.title, card.x + card.w / 2, y + 28);
    y += 74;
  }
  if (modal.subtitle) {
    ctx.fillStyle = C.muted;
    ctx.font = FONT.small;
    ctx.fillText(modal.subtitle, card.x + card.w / 2, y + 16);
    y += 38;
  }
  ctx.font = FONT.body;
  for (let i = 0; i < (modal.lines || []).length; i += 1) {
    const line = modal.lines[i];
    ctx.fillStyle = line.color || C.ink;
    ctx.font = line.bold ? FONT.h3 : FONT.body;
    ctx.fillText(line.text != null ? line.text : line, card.x + card.w / 2, y + 14);
    y += 34;
  }

  y += 8;
  for (let i = 0; i < layout.buttons.length; i += 1) {
    const btn = layout.buttons[i];
    const kind = btn.disabled ? 'disabled' : btn.kind;
    drawButton(ctx, btn, btn.label, kind, { radius: 22 });
    y += BTN_H + BTN_GAP;
  }

  if (modal.note) {
    ctx.fillStyle = C.muted;
    ctx.font = FONT.tiny;
    ctx.fillText(modal.note, card.x + card.w / 2, y + 12);
  }

  if (modal.autoAt && now > 0) {
    const remain = Math.max(0, Math.ceil((modal.autoAt - now) / 1000));
    if (modal.autoLabel) {
      ctx.fillStyle = C.soft;
      ctx.font = FONT.tiny;
      ctx.fillText(modal.autoLabel + ' ' + remain + 's', card.x + card.w / 2, card.y + card.h - 18);
    }
  }
  return layout;
}

export function hitModal(modal, view, x, y) {
  if (!modal) return null;
  const layout = modalLayout(modal, view);
  for (let i = 0; i < layout.buttons.length; i += 1) {
    const btn = layout.buttons[i];
    if (x >= btn.x && x <= btn.x + btn.w && y >= btn.y && y <= btn.y + btn.h) {
      return btn.disabled ? null : btn.id;
    }
  }
  return null;
}
