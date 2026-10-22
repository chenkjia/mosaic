import { BOARD } from '@mosaic/shared';

export const HUD_H = 140;
export const SLOT_COUNT = 4;
export const SLOT_W = 165;
export const SLOT_H = 112;
export const SLOT_GAP = 18;

const SLOT_BOTTOM_GAP = 24;
const PAUSE = { x: 24, y: 36, w: 64, h: 64 };

export function computePlayLayout(view) {
  const board = { x: BOARD.x, y: BOARD.y, w: BOARD.w, h: BOARD.h };
  const bleed = view.bleed || { x: 0, y: 0, w: view.w, h: view.h };
  const panelTop = HUD_H;
  const panelBottom = bleed.y + bleed.h;
  const controlLimit = panelBottom - Math.max(0, view.safeBottom || 0);
  const skillY = Math.max(board.y + board.h + 18, controlLimit - SLOT_BOTTOM_GAP - SLOT_H);
  const slots = [];
  for (let i = 0; i < SLOT_COUNT; i += 1) {
    slots.push({
      x: board.x + i * (SLOT_W + SLOT_GAP),
      y: skillY,
      w: SLOT_W,
      h: SLOT_H,
    });
  }
  return {
    hud: { x: 0, y: 0, w: view.w, h: HUD_H },
    panel: { x: board.x, y: panelTop, w: board.w, h: panelBottom - panelTop },
    operation: { x: bleed.x, y: panelTop, w: bleed.w, h: panelBottom - panelTop },
    dividerY: skillY,
    failY: skillY - board.y,
    board,
    pause: { ...PAUSE },
    level: { x: PAUSE.x + PAUSE.w + 20, y: PAUSE.y, w: 240, h: PAUSE.h },
    skill: { x: board.x, y: skillY, w: SLOT_W, h: SLOT_H, gap: SLOT_GAP, slots },
  };
}
