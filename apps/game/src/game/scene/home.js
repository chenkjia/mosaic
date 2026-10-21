import { roundRectPath } from '../../gfx/roundRect.js';

const COLORS = {
  bgTop: '#FFF4F9',
  bgBottom: '#E8E1FF',
  title: '#5B4BC4',
  subtitle: '#9A8FB8',
  buttonFrom: '#FF9FC2',
  buttonTo: '#FFC58A',
  buttonText: '#FFFFFF',
  tiles: ['#FF9FC2', '#FFC58A', '#7BDCC8', '#A9A0FF', '#FFD86E', '#8FD3FF'],
};

export function createHomeScene() {
  function draw(ctx, view) {
    const b = view.bleed;
    const bg = ctx.createLinearGradient(0, 0, 0, view.h);
    bg.addColorStop(0, COLORS.bgTop);
    bg.addColorStop(1, COLORS.bgBottom);
    ctx.fillStyle = bg;
    ctx.fillRect(b.x, b.y, b.w, b.h);

    const tile = 74;
    const gap = 12;
    const gridW = tile * 3 + gap * 2;
    const gridX = (view.w - gridW) / 2;
    const gridY = view.h * 0.28;

    for (let row = 0; row < 3; row += 1) {
      for (let col = 0; col < 3; col += 1) {
        const x = gridX + col * (tile + gap);
        const y = gridY + row * (tile + gap);
        const color = COLORS.tiles[(row * 3 + col) % COLORS.tiles.length];
        roundRectPath(ctx, x, y, tile, tile, 18);
        ctx.fillStyle = color;
        ctx.fill();
        roundRectPath(ctx, x + 6, y + 6, tile - 12, 22, 10);
        ctx.fillStyle = 'rgba(255, 255, 255, 0.38)';
        ctx.fill();
      }
    }

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = COLORS.title;
    ctx.font = '800 82px "PingFang SC", "Microsoft YaHei", sans-serif';
    ctx.fillText('Mosaic', view.w / 2, gridY + gridW + 96);

    ctx.fillStyle = COLORS.subtitle;
    ctx.font = '400 28px "PingFang SC", "Microsoft YaHei", sans-serif';
    ctx.fillText('主页 · 玩法实施中', view.w / 2, gridY + gridW + 154);

    const btnW = 320;
    const btnH = 92;
    const btnX = (view.w - btnW) / 2;
    const btnY = view.h * 0.78;
    roundRectPath(ctx, btnX, btnY, btnW, btnH, btnH / 2);
    const btn = ctx.createLinearGradient(btnX, 0, btnX + btnW, 0);
    btn.addColorStop(0, COLORS.buttonFrom);
    btn.addColorStop(1, COLORS.buttonTo);
    ctx.fillStyle = btn;
    ctx.fill();

    ctx.fillStyle = COLORS.buttonText;
    ctx.font = '700 34px "PingFang SC", "Microsoft YaHei", sans-serif';
    ctx.fillText('开始游戏', view.w / 2, btnY + btnH / 2 + 1);
  }

  return { draw };
}
