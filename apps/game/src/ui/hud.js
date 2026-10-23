import { roundRectPath } from '../gfx/roundRect.js';
import { C, FONT } from './theme.js';

export function drawHud(ctx, layout, data) {
  const pause = layout.pause;
  ctx.fillStyle = 'rgba(255,255,255,0.80)';
  roundRectPath(ctx, pause.x, pause.y, pause.w, pause.h, 22);
  ctx.fill();
  ctx.strokeStyle = 'rgba(91,75,196,0.16)';
  ctx.lineWidth = 1;
  roundRectPath(ctx, pause.x, pause.y, pause.w, pause.h, 22);
  ctx.stroke();

  ctx.fillStyle = C.primary;
  roundRectPath(ctx, pause.x + 22, pause.y + 20, 7, 24, 3.5);
  ctx.fill();
  roundRectPath(ctx, pause.x + 36, pause.y + 20, 7, 24, 3.5);
  ctx.fill();

  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = C.primary;
  ctx.font = FONT.h1;
  ctx.fillText('第 ' + data.levelId + ' 关', layout.level.x, pause.y + pause.h / 2 + 2);

  const centerX = 375;
  ctx.textAlign = 'center';
  ctx.fillStyle = C.primary;
  ctx.font = FONT.number;
  ctx.fillText((data.total - data.left) + ' / ' + data.total, centerX, pause.y + pause.h / 2 + 2);
}
