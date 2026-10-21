import { roundRectPath } from '../gfx/roundRect.js';

const COLORS = {
  bgTop: '#FFF4F9',
  bgBottom: '#E8E1FF',
  title: '#5B4BC4',
  subtitle: '#9A8FB8',
  track: 'rgba(255, 255, 255, 0.72)',
  fillFrom: '#FF9FC2',
  fillTo: '#7BDCC8',
  error: '#D9547A',
};

export function createLoadingScene() {
  let progress = 0;
  let failed = false;

  function reset() {
    progress = 0;
    failed = false;
  }

  function drawBackground(ctx, view) {
    const b = view.bleed;
    const gradient = ctx.createLinearGradient(0, 0, 0, view.h);
    gradient.addColorStop(0, COLORS.bgTop);
    gradient.addColorStop(1, COLORS.bgBottom);
    ctx.fillStyle = gradient;
    ctx.fillRect(b.x, b.y, b.w, b.h);
  }

  function draw(ctx, view, elapsed) {
    drawBackground(ctx, view);

    const cx = view.w / 2;
    const titleY = view.h * 0.36;

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = COLORS.title;
    ctx.font = '800 96px "PingFang SC", "Microsoft YaHei", sans-serif';
    ctx.fillText('Mosaic', cx, titleY);

    ctx.fillStyle = COLORS.subtitle;
    ctx.font = '400 30px "PingFang SC", "Microsoft YaHei", sans-serif';
    ctx.fillText('宝石拼图 · 打砖块', cx, titleY + 78);

    const barW = 360;
    const barH = 18;
    const barX = cx - barW / 2;
    const barY = view.h * 0.62;

    roundRectPath(ctx, barX, barY, barW, barH, barH / 2);
    ctx.fillStyle = COLORS.track;
    ctx.fill();

    const shown = failed ? 1 : Math.max(progress, 0.04 + 0.02 * Math.sin(elapsed / 240));
    if (shown > 0) {
      roundRectPath(ctx, barX, barY, barW * Math.min(1, shown), barH, barH / 2);
      const fill = ctx.createLinearGradient(barX, 0, barX + barW, 0);
      fill.addColorStop(0, COLORS.fillFrom);
      fill.addColorStop(1, COLORS.fillTo);
      ctx.fillStyle = fill;
      ctx.fill();
    }

    ctx.font = '500 26px "PingFang SC", "Microsoft YaHei", sans-serif';
    if (failed) {
      ctx.fillStyle = COLORS.error;
      ctx.fillText('初始化失败，点击屏幕重试', cx, barY + 72);
    } else {
      ctx.fillStyle = COLORS.subtitle;
      const percent = Math.round(Math.min(1, shown) * 100);
      ctx.fillText('加载中 ' + percent + '%', cx, barY + 72);
    }
  }

  return {
    reset,
    setProgress: (value) => { progress = Math.max(0, Math.min(1, value)); },
    setFailed: (value) => { failed = !!value; },
    isFailed: () => failed,
    draw,
  };
}
