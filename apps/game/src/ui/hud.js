import { roundRectPath } from '../gfx/roundRect.js';
import { C, FONT, THEME_LABEL } from './theme.js';

function pad2(value) {
  return value < 10 ? '0' + value : String(value);
}

function formatCoins(value) {
  if (value >= 100000) return Math.floor(value / 1000) + 'k';
  return String(value);
}

export function drawHud(ctx, layout, data) {
  const coin = layout.coin;
  ctx.fillStyle = 'rgba(255,255,255,0.78)';
  roundRectPath(ctx, coin.x, coin.y, coin.w, coin.h, coin.h / 2);
  ctx.fill();
  ctx.strokeStyle = 'rgba(91,75,196,0.14)';
  ctx.lineWidth = 1;
  roundRectPath(ctx, coin.x, coin.y, coin.w, coin.h, coin.h / 2);
  ctx.stroke();

  const iconX = coin.x + 28;
  const iconY = coin.y + coin.h / 2;
  ctx.fillStyle = C.gold;
  ctx.beginPath();
  ctx.arc(iconX, iconY, 15, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = C.yellow;
  ctx.beginPath();
  ctx.arc(iconX, iconY, 11, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = C.gold;
  ctx.font = FONT.tinyBold;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('C', iconX, iconY + 1);

  ctx.fillStyle = C.ink;
  ctx.font = FONT.numberSmall;
  ctx.textAlign = 'left';
  ctx.fillText(formatCoins(data.coins), coin.x + 52, iconY + 1);

  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = C.primary;
  ctx.font = FONT.h1;
  ctx.fillText('LV ' + pad2(data.levelId), 40, 70);

  ctx.fillStyle = C.muted;
  ctx.font = FONT.small;
  const theme = THEME_LABEL[data.theme] || data.theme || '';
  ctx.fillText(theme + ' · ' + data.levelId + ' / ' + data.levelCount, 40, 108);

  const centerX = 336;
  ctx.textAlign = 'center';
  ctx.fillStyle = C.muted;
  ctx.font = FONT.tinyBold;
  ctx.fillText('CLEARED', centerX, 36);

  ctx.fillStyle = C.primary;
  ctx.font = FONT.number;
  ctx.fillText(data.percent + '%', centerX, 82);

  ctx.fillStyle = C.soft;
  ctx.font = FONT.tiny;
  ctx.fillText(data.left + ' / ' + data.total + ' 可破坏', centerX, 116);

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
}
