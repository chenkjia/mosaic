import { DESIGN_WIDTH, MIN_DESIGN_H } from '../design.js';

const MIN_DESIGN_H_EPS = 0.5;

export function viewModelOf(canvas) {
  const fitScale = canvas.width / DESIGN_WIDTH;
  const fitH = canvas.height / fitScale;
  if (fitH >= MIN_DESIGN_H - MIN_DESIGN_H_EPS) {
    return { mode: 'fit', scale: fitScale, offsetX: 0, designH: fitH };
  }
  const scale = Math.min(fitScale, canvas.height / MIN_DESIGN_H);
  return {
    mode: 'fallback',
    scale,
    offsetX: (canvas.width - DESIGN_WIDTH * scale) / 2,
    designH: MIN_DESIGN_H,
  };
}

export function designSizeOf(canvas, rawInsets) {
  const v = viewModelOf(canvas);
  const insets = rawInsets || { top: 0, bottom: 0 };
  const bleed = v.mode === 'fallback'
    ? {
      x: -v.offsetX / v.scale,
      y: 0,
      w: DESIGN_WIDTH + (2 * v.offsetX) / v.scale,
      h: v.designH,
    }
    : { x: 0, y: 0, w: DESIGN_WIDTH, h: v.designH };
  return {
    w: DESIGN_WIDTH,
    h: v.designH,
    mode: v.mode,
    scale: v.scale,
    offsetX: v.offsetX,
    bleed,
    safeTop: insets.top / v.scale,
    safeBottom: insets.bottom / v.scale,
  };
}

export function applyViewTransformTo(ctx, canvas) {
  const v = viewModelOf(canvas);
  ctx.setTransform(v.scale, 0, 0, v.scale, v.offsetX, 0);
}

export function clientToDesign(canvas, sys, clientX, clientY) {
  const v = viewModelOf(canvas);
  const physPerLogical = sys.screenWidth ? canvas.width / sys.screenWidth : 1;
  return {
    x: (clientX * physPerLogical - v.offsetX) / v.scale,
    y: (clientY * physPerLogical) / v.scale,
  };
}
