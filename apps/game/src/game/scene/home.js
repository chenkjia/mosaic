import { LEVEL_COUNT, PALETTE, slotCost } from '@mosaic/shared';
import { drawGemBrick } from '../../gfx/drawGemBrick.js';
import { roundRectPath } from '../../gfx/roundRect.js';
import { drawButton, drawSmallButton, hitRect } from '../../ui/button.js';
import { C, FONT } from '../../ui/theme.js';
import { createToast } from '../../ui/toast.js';

const TILE_COLORS = [5, 6, 7, 8, 9, 10, 11, 12, 13];
const VERSION = typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : 'dev';

export function createHomeScene(deps) {
  const { platform, store, audio, onStart, onShare } = deps;
  const toast = createToast();
  let view = null;
  let rects = null;
  let bgKey = '';
  let background = null;

  function layout(v) {
    const shift = Math.max(0, (v.h - 1334) * 0.32);
    const tile = 92;
    const gap = 12;
    const gridW = tile * 3 + gap * 2;
    const gridX = (v.w - gridW) / 2;
    const gridY = 300 + shift;
    const continueRect = { x: 135, y: gridY + gridW + 108, w: 480, h: 96 };
    const rowY = continueRect.y + 116;
    const slotRect = { x: 135, y: rowY, w: 230, h: 74 };
    const shareRect = { x: 385, y: rowY, w: 230, h: 74 };
    const info = { x: 90, y: rowY + 100, w: 570, h: 150 };
    const soundRect = { x: 135, y: info.y + 178, w: 230, h: 64 };
    const musicRect = { x: 385, y: info.y + 178, w: 230, h: 64 };
    return {
      grid: { x: gridX, y: gridY, tile, gap },
      continueRect,
      slotRect,
      shareRect,
      info,
      soundRect,
      musicRect,
    };
  }

  function drawBackground(ctx, v) {
    const key = v.h + ':' + v.bleed.w;
    if (bgKey !== key) {
      const gradient = ctx.createLinearGradient(0, 0, 0, v.h);
      gradient.addColorStop(0, C.bgTop);
      gradient.addColorStop(1, C.bgBottom);
      background = gradient;
      bgKey = key;
    }
    ctx.fillStyle = background;
    ctx.fillRect(v.bleed.x, v.bleed.y, v.bleed.w, v.bleed.h);
  }

  function drawTiles(ctx, l) {
    for (let row = 0; row < 3; row += 1) {
      for (let col = 0; col < 3; col += 1) {
        const x = l.grid.x + col * (l.grid.tile + l.grid.gap);
        const y = l.grid.y + row * (l.grid.tile + l.grid.gap);
        const color = TILE_COLORS[row * 3 + col];
        drawGemBrick(ctx, x, y, l.grid.tile, {
          color,
          type: 'normal',
          hp: 1,
        }, PALETTE, { radius: 20, light: C.white, dark: C.ink });
      }
    }
  }

  function drawInfo(ctx, l, save) {
    const info = l.info;
    ctx.fillStyle = 'rgba(255,255,255,0.74)';
    roundRectPath(ctx, info.x, info.y, info.w, info.h, 28);
    ctx.fill();
    ctx.strokeStyle = C.line;
    ctx.lineWidth = 1;
    roundRectPath(ctx, info.x, info.y, info.w, info.h, 28);
    ctx.stroke();

    const columns = [
      { label: '金币', value: String(save.coins) },
      { label: '最高关', value: save.highestLevel + ' / ' + LEVEL_COUNT },
      { label: '技能槽', value: save.slotCapacity + ' / 4' },
    ];
    const colW = info.w / 3;
    for (let i = 0; i < columns.length; i += 1) {
      const cx = info.x + colW * (i + 0.5);
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = C.primary;
      ctx.font = FONT.numberSmall;
      ctx.fillText(columns[i].value, cx, info.y + 62);
      ctx.fillStyle = C.muted;
      ctx.font = FONT.small;
      ctx.fillText(columns[i].label, cx, info.y + 108);
      if (i > 0) {
        ctx.fillStyle = 'rgba(91,75,196,0.10)';
        ctx.fillRect(info.x + colW * i, info.y + 36, 1, info.h - 72);
      }
    }
  }

  function draw(ctx, v, now) {
    view = v;
    const save = store.get();
    const l = layout(v);
    rects = l;

    drawBackground(ctx, v);

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = C.primary;
    ctx.font = FONT.display;
    ctx.fillText('Mosaic', v.w / 2, 152);

    ctx.fillStyle = C.muted;
    ctx.font = FONT.body;
    ctx.fillText('宝石拼图 · 打砖块', v.w / 2, 218);

    drawTiles(ctx, l);

    const starting = save.highestLevel <= 1;
    drawButton(ctx, l.continueRect, starting ? '开始 · 第 1 关' : '继续 · 第 ' + save.highestLevel + ' 关', 'primary');

    const cost = slotCost(save);
    const maxed = save.slotCapacity >= 4;
    const affordable = save.coins >= cost;
    drawSmallButton(
      ctx,
      l.slotRect,
      maxed ? '技能槽已满' : '扩容技能槽 · ' + cost,
      maxed ? 'disabled' : affordable ? 'violet' : 'ghost',
      false,
    );
    drawSmallButton(ctx, l.shareRect, '分享游戏', 'secondary', false);

    drawInfo(ctx, l, save);

    drawSmallButton(ctx, l.soundRect, '音效 ' + (save.sound ? '开' : '关'), save.sound ? 'secondary' : 'ghost', false);
    drawSmallButton(ctx, l.musicRect, '音乐 ' + (save.music ? '开' : '关'), save.music ? 'secondary' : 'ghost', false);

    ctx.fillStyle = C.soft;
    ctx.font = FONT.tiny;
    ctx.fillText('本地存档 · v' + VERSION, v.w / 2, v.h - 44);

    toast.draw(ctx, v, now, v.h - 12);
  }

  function onPointer(event) {
    if (!view || !rects || event.type !== 'start') return;
    const save = store.get();
    const x = event.x;
    const y = event.y;

    if (hitRect(rects.continueRect, x, y, 6)) {
      onStart(save.highestLevel);
      return;
    }
    if (hitRect(rects.slotRect, x, y, 4)) {
      if (save.slotCapacity >= 4) {
        toast.show('技能槽已满');
      } else if (save.coins < slotCost(save)) {
        toast.show('金币不足 · 过关可拿金币');
      } else {
        store.update((next) => {
          next.coins -= slotCost(next);
          next.slotCapacity += 1;
        });
        toast.show('技能槽扩到 ' + store.get().slotCapacity + ' 格');
      }
      return;
    }
    if (hitRect(rects.shareRect, x, y, 4)) {
      onShare().then((ok) => {
        toast.show(ok ? '已调起分享' : '当前环境不支持分享');
      });
      return;
    }
    if (hitRect(rects.soundRect, x, y, 4)) {
      toast.show('音效已' + (audio.toggleSound() ? '开' : '关'));
      return;
    }
    if (hitRect(rects.musicRect, x, y, 4)) {
      toast.show('音乐已' + (audio.toggleMusic() ? '开' : '关'));
    }
  }

  function debugRects() {
    if (!rects) return null;
    return {
      continue: rects.continueRect,
      slot: rects.slotRect,
      share: rects.shareRect,
      sound: rects.soundRect,
      music: rects.musicRect,
    };
  }

  return { draw, onPointer, debugRects };
}
