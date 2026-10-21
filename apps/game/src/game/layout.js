import { BOARD } from '@mosaic/shared';

export const HUD_H = 140;
export const SLOT_COUNT = 4;
export const SLOT_SIZE = 84;
export const SLOT_GAP = 18;

const HINT_GAP = 34;
const HINT_OFFSET = SLOT_SIZE + 58;

export function computePlayLayout(view) {
  const board = { x: BOARD.x, y: BOARD.y, w: BOARD.w, h: BOARD.h };
  const bleed = view.bleed || { x: 0, y: 0, w: view.w, h: view.h };
  const panelTop = HUD_H;
  const panelBottom = bleed.y + bleed.h;
  const controlLimit = panelBottom - Math.max(0, view.safeBottom || 0);
  const skillY = Math.max(board.y + board.h + 18, controlLimit - HINT_GAP - HINT_OFFSET);
  const totalW = SLOT_COUNT * SLOT_SIZE + (SLOT_COUNT - 1) * SLOT_GAP;
  const skillX = (view.w - totalW) / 2;
  const slots = [];
  for (let i = 0; i < SLOT_COUNT; i += 1) {
    slots.push({
      x: skillX + i * (SLOT_SIZE + SLOT_GAP),
      y: skillY,
      w: SLOT_SIZE,
      h: SLOT_SIZE,
    });
  }
  return {
    hud: { x: 0, y: 0, w: view.w, h: HUD_H },
    panel: { x: bleed.x, y: panelTop, w: bleed.w, h: panelBottom - panelTop },
    board,
    pause: { x: 648, y: 36, w: 64, h: 64 },
    coin: { x: 486, y: 42, w: 146, h: 52 },
    skill: { x: skillX, y: skillY, size: SLOT_SIZE, gap: SLOT_GAP, slots },
    effectY: skillY + SLOT_SIZE + 14,
    hintY: skillY + SLOT_SIZE + 58,
  };
}
