// 生成 30 关像素画源图（PNG）+ 类型/难度 sidecar。
// 前 6 关是小网格图标（4×3 → 9×8），第 7 关起复用 21×28 精细画并裁到图案包围盒。
// 源图是派生 levels.json 的输入，重新跑本脚本会覆盖同名文件。
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { PALETTE } from '../packages/shared/src/palette.js';
import { DEBUFF_IDS } from '../packages/shared/src/constants.js';
import { cellForGrid } from '../packages/shared/src/level.js';
import { encodePng } from './lib/png.js';

const W = 21;
const H = 28;
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SRC_DIR = path.join(ROOT, 'assets/levels/src');
const COVER_DIR = path.join(ROOT, 'apps/game/assets/share');

const C = {
  cream: 0, lilac: 1, violet: 2, white: 3, dark: 4,
  pink: 5, rose: 6, peach: 7, coral: 8, yellow: 9,
  gold: 10, mint: 11, teal: 12, sky: 13, blue: 14, lavender: 15,
};

function makeGrid(w, h) {
  return Array.from({ length: h }, () => new Array(w).fill(null));
}

function grid() {
  return makeGrid(W, H);
}

function gridW(g) {
  return g[0].length;
}

function gridH(g) {
  return g.length;
}

function set(g, x, y, color) {
  if (x < 0 || x >= gridW(g) || y < 0 || y >= gridH(g) || color == null) return;
  g[y][x] = color;
}

function clear(g, x, y) {
  if (x < 0 || x >= gridW(g) || y < 0 || y >= gridH(g)) return;
  g[y][x] = null;
}

function rect(g, x, y, w, h, color) {
  for (let yy = y; yy < y + h; yy += 1) {
    for (let xx = x; xx < x + w; xx += 1) set(g, xx, yy, color);
  }
}

function clearRect(g, x, y, w, h) {
  for (let yy = y; yy < y + h; yy += 1) {
    for (let xx = x; xx < x + w; xx += 1) clear(g, xx, yy);
  }
}

function ellipse(g, cx, cy, rx, ry, color) {
  for (let y = 0; y < gridH(g); y += 1) {
    for (let x = 0; x < gridW(g); x += 1) {
      const dx = (x + 0.5 - cx) / rx;
      const dy = (y + 0.5 - cy) / ry;
      if (dx * dx + dy * dy <= 1) set(g, x, y, color);
    }
  }
}

function clearEllipse(g, cx, cy, rx, ry) {
  for (let y = 0; y < gridH(g); y += 1) {
    for (let x = 0; x < gridW(g); x += 1) {
      const dx = (x + 0.5 - cx) / rx;
      const dy = (y + 0.5 - cy) / ry;
      if (dx * dx + dy * dy <= 1) clear(g, x, y);
    }
  }
}

function ellipseRot(g, cx, cy, rx, ry, angle, color) {
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  for (let y = 0; y < gridH(g); y += 1) {
    for (let x = 0; x < gridW(g); x += 1) {
      const dx = x + 0.5 - cx;
      const dy = y + 0.5 - cy;
      const u = dx * cos + dy * sin;
      const v = -dx * sin + dy * cos;
      if ((u * u) / (rx * rx) + (v * v) / (ry * ry) <= 1) set(g, x, y, color);
    }
  }
}

function blob(g, cx, cy, rx, ry, fill, outline) {
  if (outline != null) ellipse(g, cx, cy, rx + 0.55, ry + 0.55, outline);
  ellipse(g, cx, cy, rx, ry, fill);
}

function polygon(g, points, color) {
  let minY = Infinity;
  let maxY = -Infinity;
  for (const p of points) {
    minY = Math.min(minY, p[1]);
    maxY = Math.max(maxY, p[1]);
  }
  for (let y = Math.max(0, Math.floor(minY)); y <= Math.min(gridH(g) - 1, Math.ceil(maxY)); y += 1) {
    for (let x = 0; x < gridW(g); x += 1) {
      const px = x + 0.5;
      const py = y + 0.5;
      let inside = false;
      for (let i = 0, j = points.length - 1; i < points.length; j = i, i += 1) {
        const xi = points[i][0];
        const yi = points[i][1];
        const xj = points[j][0];
        const yj = points[j][1];
        if ((yi > py) !== (yj > py) && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi) {
          inside = !inside;
        }
      }
      if (inside) set(g, x, y, color);
    }
  }
}

function line(g, x0, y0, x1, y1, color, thick = 1) {
  let x = Math.round(x0);
  let y = Math.round(y0);
  const tx = Math.round(x1);
  const ty = Math.round(y1);
  const dx = Math.abs(tx - x);
  const dy = -Math.abs(ty - y);
  const sx = x < tx ? 1 : -1;
  const sy = y < ty ? 1 : -1;
  let err = dx + dy;
  const r = Math.floor(thick / 2);
  for (let guard = 0; guard < 200; guard += 1) {
    for (let oy = -r; oy <= r; oy += 1) {
      for (let ox = -r; ox <= r; ox += 1) set(g, x + ox, y + oy, color);
    }
    if (x === tx && y === ty) break;
    const e2 = 2 * err;
    if (e2 >= dy) { err += dy; x += sx; }
    if (e2 <= dx) { err += dx; y += sy; }
  }
}

function arcBand(g, cx, cy, r0, r1, color, angleFrom, angleTo) {
  for (let y = 0; y < gridH(g); y += 1) {
    for (let x = 0; x < gridW(g); x += 1) {
      const dx = x + 0.5 - cx;
      const dy = y + 0.5 - cy;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < r0 || dist > r1) continue;
      const angle = Math.atan2(dy, dx);
      if (angle < angleFrom || angle > angleTo) continue;
      set(g, x, y, color);
    }
  }
}

function cells(g) {
  const out = [];
  for (let y = 0; y < gridH(g); y += 1) {
    for (let x = 0; x < gridW(g); x += 1) {
      if (g[y][x] != null) out.push({ x, y, color: g[y][x] });
    }
  }
  return out;
}

function findCells(g, predicate, limit) {
  const out = [];
  for (let y = 0; y < gridH(g) && out.length < limit; y += 1) {
    for (let x = 0; x < gridW(g) && out.length < limit; x += 1) {
      if (g[y][x] != null && predicate(g[y][x], x, y)) out.push([x, y]);
    }
  }
  return out;
}

function paint(g, points, color) {
  for (const [x, y] of points) set(g, x, y, color);
  return points.map(([x, y]) => [x, y]);
}

function shadeBottom(g, color, rows = 2) {
  for (let y = gridH(g) - rows; y < gridH(g); y += 1) {
    for (let x = 0; x < gridW(g); x += 1) {
      if (g[y][x] != null) g[y][x] = color;
    }
  }
}

function stem(g, x, top, bottom, color, lean = 0) {
  for (let y = top; y <= bottom; y += 1) {
    const xx = x + Math.round(lean * (y - top) / Math.max(1, bottom - top));
    set(g, xx, y, color);
    set(g, xx + 1, y, color);
  }
}

function leaf(g, x, y, dir, color) {
  const angle = dir > 0 ? -0.5 : 0.5;
  ellipseRot(g, x, y, 3.2, 1.5, angle, color);
  ellipseRot(g, x, y, 2.3, 0.8, angle, C.mint);
}

function pot(g, obstacles) {
  polygon(g, [[5, 23], [15, 23], [13.5, 26.5], [6.5, 26.5]], C.violet);
  rect(g, 4, 22, 13, 2, C.lavender);
  for (let x = 5; x <= 15; x += 1) set(g, x, 23, C.violet);
  for (const [x, y] of [[6, 24], [10, 24], [14, 24], [8, 25], [12, 25]]) {
    set(g, x, y, C.violet);
    obstacles.push([x, y]);
  }
}

// ---------- 新手图标：4×3 → 9×8 小网格，砖块随格子放大 ----------
// 每关砖数固定：10 / 16 / 24 / 34 / 46 / 60，靠形状本身控制，不靠缩图。

function cat(g) {
  for (let x = 0; x < 4; x += 1) {
    set(g, x, 1, C.cream);
    set(g, x, 2, C.cream);
  }
  set(g, 0, 0, C.peach);
  set(g, 3, 0, C.peach);
  set(g, 1, 1, C.dark);
  set(g, 2, 1, C.dark);
  set(g, 1, 2, C.rose);
  set(g, 2, 2, C.rose);
  return { rewards: [], obstacles: [] };
}

function bunny(g) {
  set(g, 1, 0, C.pink);
  set(g, 3, 0, C.pink);
  for (const x of [0, 1, 3, 4]) set(g, x, 1, C.white);
  set(g, 0, 1, C.peach);
  set(g, 4, 1, C.peach);
  for (let x = 0; x < 5; x += 1) set(g, x, 2, C.white);
  for (let x = 0; x < 5; x += 1) set(g, x, 3, C.white);
  set(g, 1, 2, C.dark);
  set(g, 3, 2, C.dark);
  set(g, 2, 2, C.rose);
  set(g, 0, 3, C.pink);
  set(g, 4, 3, C.pink);
  return { rewards: [], obstacles: [] };
}

function bear(g) {
  for (const x of [0, 1, 4, 5]) set(g, x, 0, C.coral);
  for (let y = 1; y <= 3; y += 1) {
    for (let x = 0; x < 6; x += 1) set(g, x, y, C.peach);
  }
  set(g, 2, 4, C.peach);
  set(g, 3, 4, C.peach);
  set(g, 1, 2, C.dark);
  set(g, 4, 2, C.dark);
  set(g, 2, 3, C.cream);
  set(g, 3, 3, C.cream);
  set(g, 2, 2, C.gold);
  set(g, 3, 2, C.gold);
  return { rewards: [], obstacles: [] };
}

function fox(g) {
  for (const x of [0, 1, 5, 6]) set(g, x, 0, C.dark);
  for (const x of [0, 1, 2, 4, 5, 6]) set(g, x, 1, C.coral);
  for (let y = 2; y <= 3; y += 1) {
    for (let x = 0; x < 7; x += 1) set(g, x, y, C.coral);
  }
  for (let x = 1; x <= 5; x += 1) {
    set(g, x, 4, C.coral);
    set(g, x, 5, C.coral);
  }
  set(g, 2, 2, C.dark);
  set(g, 4, 2, C.dark);
  set(g, 3, 3, C.white);
  set(g, 2, 4, C.white);
  set(g, 3, 4, C.white);
  set(g, 4, 4, C.white);
  set(g, 3, 5, C.white);
  return { rewards: [], obstacles: [] };
}

function panda(g) {
  for (const x of [1, 2, 5, 6]) set(g, x, 0, C.dark);
  for (let x = 1; x <= 6; x += 1) set(g, x, 1, C.white);
  for (let y = 2; y <= 4; y += 1) {
    for (let x = 0; x < 8; x += 1) set(g, x, y, C.white);
  }
  for (let y = 5; y <= 6; y += 1) {
    for (let x = 1; x <= 6; x += 1) set(g, x, y, C.white);
  }
  set(g, 2, 3, C.dark);
  set(g, 5, 3, C.dark);
  set(g, 3, 2, C.mint);
  set(g, 4, 2, C.mint);
  set(g, 3, 4, C.dark);
  set(g, 4, 4, C.dark);
  set(g, 3, 5, C.mint);
  set(g, 4, 5, C.mint);
  return { rewards: [], obstacles: [] };
}

function frog(g) {
  for (const x of [1, 2, 3, 5, 6, 7]) set(g, x, 0, C.white);
  for (const x of [1, 2, 3, 5, 6, 7]) set(g, x, 1, C.mint);
  for (let x = 1; x <= 7; x += 1) set(g, x, 2, C.mint);
  for (let y = 3; y <= 5; y += 1) {
    for (let x = 0; x < 9; x += 1) set(g, x, y, C.mint);
  }
  for (let x = 1; x <= 7; x += 1) {
    set(g, x, 6, C.mint);
    set(g, x, 7, C.mint);
  }
  set(g, 2, 1, C.dark);
  set(g, 6, 1, C.dark);
  set(g, 3, 4, C.dark);
  set(g, 4, 4, C.dark);
  set(g, 5, 4, C.dark);
  set(g, 0, 5, C.teal);
  set(g, 8, 5, C.teal);
  return { rewards: [], obstacles: [] };
}

function chick(g) {
  blob(g, 10, 16, 6.5, 7.2, C.yellow, C.gold);
  ellipse(g, 10, 13, 4.5, 4, C.cream);
  ellipse(g, 6.5, 11, 1.2, 1.5, C.dark);
  ellipse(g, 13.5, 11, 1.2, 1.5, C.dark);
  set(g, 6, 10, C.white);
  set(g, 13, 10, C.white);
  polygon(g, [[9, 14], [12, 14], [10.5, 16]], C.coral);
  ellipseRot(g, 5, 17, 2, 3.5, 0.25, C.peach);
  ellipseRot(g, 15, 17, 2, 3.5, -0.25, C.peach);
  line(g, 8, 23, 7, 25, C.coral);
  line(g, 8, 23, 9, 25, C.coral);
  line(g, 12, 23, 11, 25, C.coral);
  line(g, 12, 23, 13, 25, C.coral);
  rect(g, 3, 25, 15, 2, C.peach);
  const obstacles = [[4, 26], [5, 26], [15, 26], [16, 26]];
  for (const [x, y] of obstacles) set(g, x, y, C.gold);
  const rewards = [[9, 19], [10, 19], [11, 19]];
  for (const [x, y] of rewards) set(g, x, y, C.gold);
  return { rewards, obstacles };
}

function fish(g) {
  blob(g, 9, 15, 6.8, 4.5, C.sky, C.blue);
  polygon(g, [[14, 15], [20, 9], [20, 21]], C.blue);
  polygon(g, [[16, 15], [19, 11], [19, 19]], C.sky);
  polygon(g, [[7, 10.5], [10, 7], [13, 10.5]], C.blue);
  polygon(g, [[7, 19.5], [10, 22], [12, 19.5]], C.blue);
  ellipse(g, 5.5, 14, 1.5, 1.5, C.white);
  ellipse(g, 5.5, 14, 0.8, 0.9, C.dark);
  line(g, 4, 17, 6, 17, C.blue);
  for (let i = 0; i < 3; i += 1) {
    set(g, 7 + i * 2, 13 + (i % 2), C.mint);
    set(g, 7 + i * 2, 16 - (i % 2), C.mint);
  }
  ellipse(g, 16, 5, 1.1, 1.1, C.white);
  ellipse(g, 18, 7, 0.8, 0.8, C.white);
  ellipse(g, 15, 2.5, 0.7, 0.7, C.white);
  for (const [x, y] of [[2, 24], [3, 23], [2, 22], [18, 24], [19, 23], [18, 22]]) {
    set(g, x, y, C.teal);
  }
  const rewards = [[10, 12], [10, 15], [10, 18]];
  for (const [x, y] of rewards) set(g, x, y, C.gold);
  const obstacles = [[3, 25], [2, 26], [18, 26], [19, 25]];
  for (const [x, y] of obstacles) set(g, x, y, C.teal);
  return { rewards, obstacles };
}

function butterfly(g) {
  line(g, 10, 11, 10, 22, C.dark, 2);
  line(g, 10, 10, 7, 5, C.dark);
  line(g, 11, 10, 14, 5, C.dark);
  set(g, 7, 4, C.gold);
  set(g, 14, 4, C.gold);
  ellipseRot(g, 5.5, 12, 4.3, 5.2, -0.35, C.violet);
  ellipseRot(g, 15.5, 12, 4.3, 5.2, 0.35, C.violet);
  ellipseRot(g, 5.5, 12, 3.6, 4.4, -0.35, C.pink);
  ellipseRot(g, 15.5, 12, 3.6, 4.4, 0.35, C.lavender);
  ellipseRot(g, 6.5, 19.5, 3.2, 3.2, 0.25, C.rose);
  ellipseRot(g, 14.5, 19.5, 3.2, 3.2, -0.25, C.sky);
  ellipse(g, 4.5, 11, 1.1, 1.1, C.white);
  ellipse(g, 16.5, 11, 1.1, 1.1, C.white);
  ellipse(g, 6.5, 19, 0.9, 0.9, C.cream);
  ellipse(g, 14.5, 19, 0.9, 0.9, C.cream);
  set(g, 10, 8, C.rose);
  shadeBottom(g, C.lilac, 1);
  const rewards = [[4, 10], [16, 10], [10, 20]];
  for (const [x, y] of rewards) set(g, x, y, C.gold);
  const obstacles = [];
  return { rewards, obstacles };
}

function penguin(g) {
  blob(g, 10, 16, 6.2, 8, C.dark, C.violet);
  ellipse(g, 10, 18, 4, 5.8, C.white);
  ellipse(g, 7, 10.5, 1.4, 1.7, C.white);
  ellipse(g, 13, 10.5, 1.4, 1.7, C.white);
  ellipse(g, 7, 10.5, 0.7, 0.9, C.dark);
  ellipse(g, 13, 10.5, 0.7, 0.9, C.dark);
  polygon(g, [[9, 12], [12, 12], [10.5, 14.5]], C.coral);
  ellipseRot(g, 4, 17, 1.8, 4.2, 0.18, C.dark);
  ellipseRot(g, 16, 17, 1.8, 4.2, -0.18, C.dark);
  polygon(g, [[7, 24], [10, 24], [7, 26]], C.coral);
  polygon(g, [[10, 24], [13, 24], [13, 26]], C.coral);
  for (let x = 2; x < 19; x += 2) set(g, x, 26, C.sky);
  line(g, 2, 25, 6, 25, C.sky);
  line(g, 14, 25, 19, 25, C.sky);
  const rewards = [[10, 16], [10, 17], [9, 17]];
  for (const [x, y] of rewards) set(g, x, y, C.gold);
  const obstacles = [[3, 26], [7, 26], [13, 26], [17, 26]];
  for (const [x, y] of obstacles) set(g, x, y, C.violet);
  return { rewards, obstacles };
}

// ---------- 花卉 ----------

function daisy(g) {
  stem(g, 10, 14, 26, C.mint, 0.1);
  leaf(g, 6, 20, -1, C.teal);
  leaf(g, 14, 17, 1, C.teal);
  for (let i = 0; i < 8; i += 1) {
    const angle = (i / 8) * Math.PI * 2;
    ellipseRot(g, 10 + Math.cos(angle) * 3.6, 10 + Math.sin(angle) * 3.6, 1.5, 3, angle, C.white);
  }
  ellipse(g, 10, 10, 2.6, 2.6, C.gold);
  ellipse(g, 10, 10, 1.7, 1.7, C.yellow);
  const rewards = [[9, 9], [10, 10], [11, 11]];
  for (const [x, y] of rewards) set(g, x, y, C.gold);
  const obstacles = [[8, 25], [11, 25]];
  for (const [x, y] of obstacles) set(g, x, y, C.violet);
  return { rewards, obstacles };
}

function tulip(g) {
  stem(g, 10, 12, 25, C.mint);
  leaf(g, 6, 19, -1, C.teal);
  leaf(g, 14, 17, 1, C.teal);
  polygon(g, [[6, 5], [9, 2], [9, 13], [6, 13]], C.rose);
  polygon(g, [[14, 5], [11, 2], [11, 13], [14, 13]], C.rose);
  ellipse(g, 10, 9, 3.4, 4.8, C.pink);
  ellipse(g, 10, 11, 2.2, 2.2, C.cream);
  set(g, 10, 7, C.rose);
  set(g, 8, 10, C.white);
  set(g, 12, 10, C.white);
  pot(g, []);
  const rewards = [[7, 10], [10, 5], [13, 10]];
  for (const [x, y] of rewards) set(g, x, y, C.gold);
  return { rewards, obstacles: [] };
}

function sunflower(g) {
  stem(g, 10, 14, 25, C.mint);
  leaf(g, 5, 20, -1, C.teal);
  leaf(g, 15, 18, 1, C.teal);
  for (let i = 0; i < 12; i += 1) {
    const angle = (i / 12) * Math.PI * 2;
    ellipseRot(g, 10 + Math.cos(angle) * 4.2, 10 + Math.sin(angle) * 4.2, 1.3, 2.6, angle, C.gold);
  }
  ellipse(g, 10, 10, 3.2, 3.2, C.dark);
  ellipse(g, 10, 10, 2.4, 2.4, C.violet);
  set(g, 9, 9, C.yellow);
  set(g, 11, 10, C.yellow);
  set(g, 10, 11, C.gold);
  pot(g, []);
  const rewards = [[9, 9], [11, 10], [10, 11]];
  for (const [x, y] of rewards) set(g, x, y, C.gold);
  return { rewards, obstacles: [] };
}

function rose(g) {
  stem(g, 10, 14, 25, C.mint);
  leaf(g, 5, 19, -1, C.teal);
  leaf(g, 15, 16, 1, C.teal);
  line(g, 6, 23, 4, 21, C.teal);
  line(g, 14, 21, 16, 19, C.teal);
  ellipse(g, 10, 10, 5.2, 5, C.rose);
  ellipse(g, 10, 10, 4.2, 4, C.pink);
  ellipse(g, 10, 10, 3, 2.8, C.rose);
  ellipse(g, 10, 10, 2, 1.8, C.pink);
  ellipse(g, 10, 10, 1, 0.9, C.cream);
  set(g, 8, 8, C.rose);
  set(g, 12, 9, C.rose);
  set(g, 9, 12, C.rose);
  set(g, 12, 12, C.cream);
  pot(g, []);
  const rewards = [[7, 7], [13, 11], [10, 14]];
  for (const [x, y] of rewards) set(g, x, y, C.gold);
  return { rewards, obstacles: [] };
}

function lotus(g) {
  for (let i = 0; i < 7; i += 1) {
    const angle = -Math.PI / 2 + (i - 3) * 0.42;
    ellipseRot(g, 10 + Math.cos(angle) * 3.6, 12 + Math.sin(angle) * 2.2, 1.8, 3.6, angle + Math.PI / 2, C.pink);
  }
  ellipse(g, 10, 13, 2.4, 1.6, C.gold);
  ellipse(g, 10, 12, 1.5, 1, C.yellow);
  ellipse(g, 10, 23, 8, 3.2, C.teal);
  clear(g, 10, 23);
  clear(g, 9, 23);
  line(g, 2, 20, 6, 20, C.sky);
  line(g, 14, 20, 19, 20, C.sky);
  line(g, 1, 25, 5, 25, C.sky);
  line(g, 15, 26, 20, 26, C.sky);
  const rewards = [[9, 12], [10, 12], [11, 12]];
  for (const [x, y] of rewards) set(g, x, y, C.gold);
  const obstacles = [[3, 22], [4, 22], [16, 22], [17, 22]];
  for (const [x, y] of obstacles) set(g, x, y, C.teal);
  return { rewards, obstacles };
}

function lavender(g) {
  for (const x of [5, 10, 15]) {
    stem(g, x, 10 + (x % 3), 25, C.mint, x === 10 ? 0 : x === 5 ? 0.2 : -0.2);
    for (let y = 4; y < 15; y += 2) {
      set(g, x, y, C.lavender);
      set(g, x + 1, y, C.violet);
      set(g, x - 1, y + 1, C.lavender);
      set(g, x + 2, y + 1, C.violet);
    }
    leaf(g, x - 3, 21, -1, C.teal);
  }
  pot(g, []);
  const rewards = [[5, 5], [10, 6], [15, 7]];
  for (const [x, y] of rewards) set(g, x, y, C.gold);
  return { rewards, obstacles: [] };
}

function cherryBlossom(g) {
  line(g, 1, 22, 19, 8, C.peach, 2);
  line(g, 6, 18, 4, 10, C.peach);
  line(g, 12, 14, 17, 18, C.peach);
  line(g, 15, 11, 18, 4, C.peach);
  const centers = [[5, 14], [12, 10], [17, 17], [8, 21], [14, 21]];
  for (const [cx, cy] of centers) {
    for (let i = 0; i < 5; i += 1) {
      const angle = (i / 5) * Math.PI * 2 - Math.PI / 2;
      ellipse(g, cx + Math.cos(angle) * 1.7, cy + Math.sin(angle) * 1.7, 1.3, 1.3, C.pink);
    }
    ellipse(g, cx, cy, 0.9, 0.9, C.gold);
  }
  for (const [x, y] of [[3, 8], [10, 5], [18, 12], [2, 18], [16, 4]]) {
    set(g, x, y, C.rose);
  }
  const rewards = [[5, 14], [12, 10], [17, 17]];
  for (const [x, y] of rewards) set(g, x, y, C.gold);
  const obstacles = [];
  return { rewards, obstacles };
}

function poppy(g) {
  stem(g, 10, 14, 25, C.mint);
  leaf(g, 5, 20, -1, C.teal);
  leaf(g, 15, 18, 1, C.teal);
  for (let i = 0; i < 5; i += 1) {
    const angle = (i / 5) * Math.PI * 2 - Math.PI / 2;
    ellipseRot(g, 10 + Math.cos(angle) * 3.3, 10 + Math.sin(angle) * 3.3, 2.3, 3.4, angle, C.rose);
    ellipseRot(g, 10 + Math.cos(angle) * 3.1, 10 + Math.sin(angle) * 3.1, 1.5, 2.3, angle, C.coral);
  }
  ellipse(g, 10, 10, 2, 2, C.dark);
  set(g, 9, 9, C.dark);
  set(g, 11, 10, C.dark);
  set(g, 10, 11, C.dark);
  pot(g, []);
  const rewards = [[7, 7], [13, 8], [10, 13]];
  for (const [x, y] of rewards) set(g, x, y, C.gold);
  const obstacles = [[9, 9], [11, 10], [10, 11]];
  return { rewards, obstacles };
}

function bluebell(g) {
  line(g, 10, 26, 10, 8, C.mint, 2);
  line(g, 10, 16, 5, 10, C.mint);
  line(g, 10, 13, 15, 8, C.mint);
  leaf(g, 6, 22, -1, C.teal);
  leaf(g, 14, 24, 1, C.teal);
  const bells = [[5, 11], [15, 9], [10, 9], [6, 15], [14, 14]];
  for (const [cx, cy] of bells) {
    polygon(g, [[cx - 2.5, cy - 2], [cx + 2.5, cy - 2], [cx + 2, cy + 2], [cx, cy + 3], [cx - 2, cy + 2]], C.blue);
    set(g, cx, cy - 3, C.mint);
    set(g, cx, cy + 3, C.gold);
  }
  pot(g, []);
  const rewards = [[10, 12], [5, 12], [15, 10]];
  for (const [x, y] of rewards) set(g, x, y, C.gold);
  return { rewards, obstacles: [] };
}

function hibiscus(g) {
  stem(g, 10, 14, 25, C.mint);
  leaf(g, 5, 20, -1, C.teal);
  leaf(g, 15, 18, 1, C.teal);
  for (let i = 0; i < 5; i += 1) {
    const angle = (i / 5) * Math.PI * 2 - Math.PI / 2;
    ellipseRot(g, 10 + Math.cos(angle) * 3.5, 10 + Math.sin(angle) * 3.5, 2.4, 3.6, angle, C.pink);
    ellipseRot(g, 10 + Math.cos(angle) * 3.2, 10 + Math.sin(angle) * 3.2, 1.6, 2.5, angle, C.rose);
  }
  ellipse(g, 10, 10, 2.2, 2.2, C.gold);
  line(g, 10, 10, 10, 5, C.coral);
  ellipse(g, 10, 4, 0.8, 0.8, C.yellow);
  pot(g, []);
  const rewards = [[9, 9], [10, 10], [11, 11]];
  for (const [x, y] of rewards) set(g, x, y, C.gold);
  return { rewards, obstacles: [] };
}

// ---------- 风景 ----------

function mountain(g) {
  ellipse(g, 16, 6, 2.6, 2.6, C.gold);
  ellipse(g, 16, 6, 1.6, 1.6, C.yellow);
  ellipse(g, 5, 7, 2.6, 1.4, C.white);
  ellipse(g, 8, 6, 2, 1.2, C.white);
  polygon(g, [[0, 23], [7, 9], [14, 23]], C.blue);
  polygon(g, [[7, 9], [9.5, 14], [7, 15], [5, 13]], C.white);
  polygon(g, [[7, 23], [14, 10], [21, 23]], C.lavender);
  polygon(g, [[14, 10], [16, 14], [14, 15], [12.5, 13]], C.white);
  rect(g, 0, 22, 21, 4, C.mint);
  for (let x = 1; x < 20; x += 3) set(g, x, 24, C.teal);
  line(g, 1, 25, 6, 25, C.teal);
  line(g, 14, 26, 20, 26, C.teal);
  const rewards = [[15, 5], [16, 6], [17, 6]];
  for (const [x, y] of rewards) set(g, x, y, C.gold);
  const obstacles = [[2, 23], [3, 23], [17, 23], [18, 23]];
  for (const [x, y] of obstacles) set(g, x, y, C.teal);
  return { rewards, obstacles };
}

function rainbow(g) {
  const bands = [
    [9.6, 11, C.rose], [8.2, 9.6, C.coral], [6.8, 8.2, C.gold],
    [5.4, 6.8, C.mint], [4, 5.4, C.sky], [2.6, 4, C.lavender],
  ];
  for (const [r0, r1, color] of bands) {
    arcBand(g, 10, 25, r0, r1, color, -Math.PI, 0);
  }
  ellipse(g, 2, 21, 3.2, 1.8, C.white);
  ellipse(g, 18, 21, 3.2, 1.8, C.white);
  ellipse(g, 1.5, 22, 2.2, 1.4, C.lilac);
  ellipse(g, 18.5, 22, 2.2, 1.4, C.lilac);
  set(g, 5, 4, C.yellow);
  set(g, 15, 3, C.yellow);
  set(g, 18, 8, C.gold);
  rect(g, 0, 25, 21, 3, C.mint);
  const rewards = [[5, 4], [15, 3], [18, 8]];
  for (const [x, y] of rewards) set(g, x, y, C.gold);
  const obstacles = [[2, 26], [3, 26], [17, 26], [18, 26]];
  for (const [x, y] of obstacles) set(g, x, y, C.teal);
  return { rewards, obstacles };
}

function night(g) {
  ellipse(g, 14, 8, 4.2, 4.2, C.gold);
  clearEllipse(g, 16, 6.5, 3.4, 3.4);
  const stars = [[3, 4], [6, 8], [2, 12], [8, 3], [18, 14], [16, 18], [4, 17], [11, 4]];
  for (const [x, y] of stars) {
    set(g, x, y, C.yellow);
    set(g, x - 1, y, C.white);
    set(g, x + 1, y, C.white);
    set(g, x, y - 1, C.white);
    set(g, x, y + 1, C.white);
  }
  polygon(g, [[0, 22], [5, 18], [10, 23], [15, 19], [21, 23], [21, 27], [0, 27]], C.violet);
  polygon(g, [[0, 24], [4, 21], [9, 25], [14, 22], [21, 25], [21, 27], [0, 27]], C.lavender);
  const rewards = [[3, 4], [8, 3], [16, 18]];
  for (const [x, y] of rewards) set(g, x, y, C.gold);
  const obstacles = [[2, 25], [3, 25], [17, 25], [18, 25]];
  for (const [x, y] of obstacles) set(g, x, y, C.dark);
  return { rewards, obstacles };
}

function tree(g) {
  rect(g, 9, 15, 3, 11, C.peach);
  rect(g, 10, 15, 1, 11, C.gold);
  line(g, 9, 19, 5, 16, C.peach);
  line(g, 11, 18, 16, 15, C.peach);
  ellipse(g, 10, 9, 8, 6.5, C.mint);
  ellipse(g, 8, 7, 4, 3.2, C.teal);
  ellipse(g, 14, 9, 3.5, 3, C.mint);
  ellipse(g, 6, 11, 3, 2.5, C.teal);
  for (const [x, y] of [[5, 8], [13, 5], [15, 12], [8, 13]]) {
    ellipse(g, x, y, 1.4, 1.4, C.rose);
  }
  rect(g, 0, 25, 21, 3, C.lilac);
  const rewards = [[5, 8], [13, 5], [15, 12]];
  for (const [x, y] of rewards) set(g, x, y, C.gold);
  const obstacles = [[9, 22], [10, 23], [11, 22], [9, 24], [11, 24]];
  for (const [x, y] of obstacles) set(g, x, y, C.peach);
  return { rewards, obstacles };
}

function house(g) {
  polygon(g, [[1, 14], [10, 3], [19, 14]], C.rose);
  polygon(g, [[3, 13], [10, 5], [17, 13]], C.coral);
  rect(g, 4, 14, 13, 11, C.cream);
  rect(g, 4, 14, 13, 1, C.peach);
  rect(g, 8, 19, 4, 6, C.violet);
  set(g, 11, 22, C.gold);
  rect(g, 5, 16, 3, 3, C.sky);
  rect(g, 13, 16, 3, 3, C.sky);
  line(g, 5, 17, 7, 17, C.white);
  line(g, 13, 17, 15, 17, C.white);
  rect(g, 15, 6, 2, 5, C.violet);
  ellipse(g, 3, 5, 1.8, 1.8, C.gold);
  rect(g, 0, 24, 21, 2, C.mint);
  const rewards = [[10, 8], [5, 17], [13, 17]];
  for (const [x, y] of rewards) set(g, x, y, C.gold);
  const obstacles = [[15, 7], [16, 7], [15, 9], [16, 9]];
  for (const [x, y] of obstacles) set(g, x, y, C.violet);
  return { rewards, obstacles };
}

function lighthouse(g) {
  polygon(g, [[7, 10], [13, 10], [15, 25], [5, 25]], C.cream);
  for (let y = 12; y < 25; y += 4) {
    rect(g, 6, y, 9, 2, C.rose);
  }
  rect(g, 7, 6, 6, 4, C.gold);
  rect(g, 9, 7, 2, 2, C.white);
  polygon(g, [[6, 6], [10, 2], [14, 6]], C.rose);
  polygon(g, [[3, 5], [7, 6], [7, 9], [3, 8]], C.yellow);
  polygon(g, [[17, 5], [13, 6], [13, 9], [17, 8]], C.yellow);
  rect(g, 0, 24, 21, 4, C.sky);
  for (let x = 1; x < 20; x += 4) {
    line(g, x, 25, x + 2, 25, C.blue);
    line(g, x + 2, 27, x + 4, 27, C.blue);
  }
  for (const [x, y] of [[2, 23], [3, 23], [17, 23], [18, 23]]) set(g, x, y, C.lavender);
  const rewards = [[8, 6], [10, 7], [12, 6]];
  for (const [x, y] of rewards) set(g, x, y, C.gold);
  const obstacles = [[2, 23], [3, 23], [17, 23], [18, 23]];
  return { rewards, obstacles };
}

function sailboat(g) {
  rect(g, 0, 20, 21, 8, C.sky);
  for (let y = 21; y < 27; y += 2) {
    for (let x = 0; x < 21; x += 4) line(g, x, y, x + 2, y, C.blue);
  }
  polygon(g, [[2, 20], [18, 20], [15, 25], [5, 25]], C.coral);
  line(g, 10, 5, 10, 21, C.dark, 2);
  polygon(g, [[11, 6], [11, 19], [18, 19]], C.white);
  polygon(g, [[9, 8], [9, 19], [3, 19]], C.pink);
  ellipse(g, 17, 5, 2.2, 2.2, C.gold);
  ellipse(g, 3, 8, 2.4, 1.2, C.white);
  polygon(g, [[0, 24], [4, 22], [7, 25], [0, 25]], C.violet);
  const rewards = [[17, 4], [17, 5], [6, 17]];
  for (const [x, y] of rewards) set(g, x, y, C.gold);
  const obstacles = [[1, 24], [2, 24], [17, 26], [18, 26]];
  for (const [x, y] of obstacles) set(g, x, y, C.violet);
  return { rewards, obstacles };
}

function balloon(g) {
  const stripes = [C.rose, C.peach, C.gold, C.mint, C.sky];
  for (let y = 2; y < 18; y += 1) {
    for (let x = 3; x < 18; x += 1) {
      const dx = (x + 0.5 - 10) / 6.2;
      const dy = (y + 0.5 - 10) / 7.5;
      if (dx * dx + dy * dy <= 1) {
        const index = Math.min(4, Math.floor(((x - 4) / 13) * 5));
        set(g, x, y, stripes[index]);
      }
    }
  }
  rect(g, 4, 18, 13, 1, C.violet);
  line(g, 6, 18, 8, 22, C.gold);
  line(g, 14, 18, 12, 22, C.gold);
  rect(g, 8, 22, 5, 4, C.peach);
  rect(g, 8, 22, 5, 1, C.gold);
  rect(g, 8, 24, 5, 1, C.coral);
  ellipse(g, 3, 5, 2.4, 1.2, C.white);
  ellipse(g, 18, 7, 2.2, 1.1, C.white);
  ellipse(g, 2, 15, 2, 1, C.lilac);
  const rewards = [[9, 8], [10, 8], [11, 8]];
  for (const [x, y] of rewards) set(g, x, y, C.gold);
  const obstacles = [[9, 23], [11, 23], [10, 25]];
  for (const [x, y] of obstacles) set(g, x, y, C.peach);
  return { rewards, obstacles };
}

function rainCloud(g) {
  ellipse(g, 7, 8, 4.5, 3.5, C.lilac);
  ellipse(g, 13, 8, 4.5, 3.5, C.lilac);
  ellipse(g, 10, 6, 4, 3.5, C.white);
  ellipse(g, 5, 9, 2.5, 2, C.white);
  ellipse(g, 15, 9, 2.5, 2, C.white);
  for (let i = 0; i < 6; i += 1) {
    const x = 3 + i * 3;
    line(g, x, 13, x - 1, 18, C.sky);
    line(g, x + 1, 13, x, 18, C.blue);
  }
  polygon(g, [[9, 14], [12, 14], [10, 18], [13, 18], [8, 24], [10, 19], [7, 19]], C.gold);
  ellipse(g, 10, 25, 7, 2, C.sky);
  const rewards = [[10, 16], [11, 17], [9, 18]];
  for (const [x, y] of rewards) set(g, x, y, C.gold);
  const obstacles = [[3, 25], [4, 25], [16, 25], [17, 25]];
  for (const [x, y] of obstacles) set(g, x, y, C.blue);
  return { rewards, obstacles };
}

function castle(g) {
  rect(g, 8, 8, 5, 17, C.cream);
  rect(g, 2, 12, 5, 13, C.lilac);
  rect(g, 14, 12, 5, 13, C.lilac);
  rect(g, 0, 16, 3, 9, C.lavender);
  rect(g, 18, 16, 3, 9, C.lavender);
  for (const [x, y] of [[8, 7], [10, 7], [12, 7], [2, 11], [4, 11], [14, 11], [16, 11], [0, 15], [2, 15], [18, 15], [20, 15]]) {
    set(g, x, y, C.white);
  }
  polygon(g, [[7, 8], [10.5, 2], [14, 8]], C.rose);
  polygon(g, [[1, 12], [4.5, 7], [8, 12]], C.coral);
  polygon(g, [[13, 12], [16.5, 7], [20, 12]], C.coral);
  rect(g, 9, 19, 3, 6, C.violet);
  set(g, 10, 20, C.gold);
  rect(g, 3, 15, 2, 3, C.gold);
  rect(g, 16, 15, 2, 3, C.gold);
  rect(g, 9, 11, 3, 3, C.sky);
  line(g, 10, 2, 10, -1, C.dark);
  set(g, 11, 1, C.rose);
  rect(g, 0, 24, 21, 2, C.mint);
  const rewards = [[3, 16], [16, 16], [10, 12]];
  for (const [x, y] of rewards) set(g, x, y, C.gold);
  const obstacles = [[1, 22], [2, 22], [18, 22], [19, 22], [8, 16], [12, 16]];
  for (const [x, y] of obstacles) set(g, x, y, C.lavender);
  return { rewards, obstacles };
}

const LEVELS = [
  { name: 'cat', theme: 'animals', art: cat, title: '猫咪', cols: 4, rows: 3, bricks: 10 },
  { name: 'bunny', theme: 'animals', art: bunny, title: '兔子', cols: 5, rows: 4, bricks: 16 },
  { name: 'bear', theme: 'animals', art: bear, title: '小熊', cols: 6, rows: 5, bricks: 24 },
  { name: 'fox', theme: 'animals', art: fox, title: '狐狸', cols: 7, rows: 6, bricks: 34 },
  { name: 'panda', theme: 'animals', art: panda, title: '熊猫', cols: 8, rows: 7, bricks: 46 },
  { name: 'frog', theme: 'animals', art: frog, title: '青蛙', cols: 9, rows: 8, bricks: 60 },
  { name: 'chick', theme: 'animals', art: chick, title: '小鸡' },
  { name: 'fish', theme: 'animals', art: fish, title: '小鱼' },
  { name: 'butterfly', theme: 'animals', art: butterfly, title: '蝴蝶' },
  { name: 'penguin', theme: 'animals', art: penguin, title: '企鹅' },
  { name: 'daisy', theme: 'flowers', art: daisy, title: '雏菊' },
  { name: 'tulip', theme: 'flowers', art: tulip, title: '郁金香' },
  { name: 'sunflower', theme: 'flowers', art: sunflower, title: '向日葵' },
  { name: 'rose', theme: 'flowers', art: rose, title: '玫瑰' },
  { name: 'lotus', theme: 'flowers', art: lotus, title: '荷花' },
  { name: 'lavender', theme: 'flowers', art: lavender, title: '薰衣草' },
  { name: 'cherry', theme: 'flowers', art: cherryBlossom, title: '樱花' },
  { name: 'poppy', theme: 'flowers', art: poppy, title: '虞美人' },
  { name: 'bluebell', theme: 'flowers', art: bluebell, title: '风铃草' },
  { name: 'hibiscus', theme: 'flowers', art: hibiscus, title: '木槿' },
  { name: 'mountain', theme: 'scenery', art: mountain, title: '雪山' },
  { name: 'rainbow', theme: 'scenery', art: rainbow, title: '彩虹' },
  { name: 'night', theme: 'scenery', art: night, title: '星夜' },
  { name: 'tree', theme: 'scenery', art: tree, title: '果树' },
  { name: 'house', theme: 'scenery', art: house, title: '小屋' },
  { name: 'lighthouse', theme: 'scenery', art: lighthouse, title: '灯塔' },
  { name: 'sailboat', theme: 'scenery', art: sailboat, title: '帆船' },
  { name: 'balloon', theme: 'scenery', art: balloon, title: '热气球' },
  { name: 'rain', theme: 'scenery', art: rainCloud, title: '雨云' },
  { name: 'castle', theme: 'scenery', art: castle, title: '城堡' },
];

function configFor(id) {
  const count = id >= 21 ? 3 : id >= 6 ? 2 : 1;
  const speed = Math.round((560 + (id - 1) * 6) / 2) * 2;
  return { count, speed };
}

// 奖励/减益砖用最远点采样摊开：先取离重心最远的一格，再依次取离已选格最远的一格。
function hash2(id, x, y) {
  let h = (Math.imul(id, 374761393) + Math.imul(x, 668265263) + Math.imul(y, 2246822519)) >>> 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177) >>> 0;
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

function chooseSpread(g, blocked, count, id, salt) {
  if (count <= 0) return [];
  const candidates = [];
  let sumX = 0;
  let sumY = 0;
  for (let y = 0; y < gridH(g); y += 1) {
    for (let x = 0; x < gridW(g); x += 1) {
      if (g[y][x] == null || blocked.has(x + ',' + y)) continue;
      candidates.push({ x, y });
      sumX += x;
      sumY += y;
    }
  }
  if (candidates.length <= count) {
    return candidates.map((cell) => [cell.x, cell.y]).sort((a, b) => a[1] - b[1] || a[0] - b[0]);
  }
  const cx = sumX / candidates.length;
  const cy = sumY / candidates.length;
  const chosen = [];
  const remaining = candidates.slice();
  let first = 0;
  let firstScore = -1;
  for (let i = 0; i < remaining.length; i += 1) {
    const cell = remaining[i];
    const score = (cell.x - cx) ** 2 + (cell.y - cy) ** 2 + hash2(id + salt, cell.x, cell.y) * 1e-3;
    if (score > firstScore) {
      firstScore = score;
      first = i;
    }
  }
  chosen.push(remaining.splice(first, 1)[0]);
  while (chosen.length < count) {
    let best = 0;
    let bestGap = -1;
    let bestTie = -1;
    for (let i = 0; i < remaining.length; i += 1) {
      const cell = remaining[i];
      let gap = Infinity;
      for (const pick of chosen) {
        const dx = cell.x - pick.x;
        const dy = cell.y - pick.y;
        gap = Math.min(gap, dx * dx + dy * dy);
      }
      const tie = hash2(id + salt + chosen.length * 131, cell.x, cell.y);
      if (gap > bestGap || (gap === bestGap && tie > bestTie)) {
        bestGap = gap;
        bestTie = tie;
        best = i;
      }
    }
    chosen.push(remaining.splice(best, 1)[0]);
  }
  return chosen.map((cell) => [cell.x, cell.y]).sort((a, b) => a[1] - b[1] || a[0] - b[0]);
}

// 底三行留给挡板活动区，像素画只能落在 0..24 行。
const PLAY_ROWS = 25;

// 1–10 关为明确砖数目标，先从 10 块慢坡爬到 120 块；11 关后沿用原有难度带。
const TARGETS = [10, 16, 24, 34, 46, 60, 76, 90, 105, 120];

const BANDS = [
  { from: 7, to: 7, min: 76, max: 76 },
  { from: 8, to: 8, min: 90, max: 90 },
  { from: 9, to: 9, min: 105, max: 105 },
  { from: 10, to: 10, min: 120, max: 120 },
  { from: 11, to: 12, min: 120, max: 150 },
  { from: 13, to: 16, min: 150, max: 175 },
  { from: 17, to: 19, min: 175, max: 199 },
  { from: 20, to: 24, min: 200, max: 250 },
  { from: 25, to: 30, min: 250, max: 330 },
];

function bandFor(id) {
  for (const band of BANDS) {
    if (id >= band.from && id <= band.to) return band;
  }
  throw new Error('关卡 ' + id + ' 没有难度带');
}

function rewardCountFor(total) {
  return Math.max(1, Math.min(6, Math.round(total / 12)));
}

function maskGrid() {
  return Array.from({ length: H }, () => new Array(W).fill(false));
}

function rescale(g, mask, destH) {
  const scale = destH / H;
  const destW = Math.max(1, Math.min(W, Math.round(W * scale)));
  const ox = Math.floor((W - destW) / 2);
  const oy = PLAY_ROWS - destH;
  const out = grid();
  const outMask = maskGrid();
  for (let y = 0; y < destH; y += 1) {
    const sy = Math.min(H - 1, Math.floor(((y + 0.5) * H) / destH));
    for (let x = 0; x < destW; x += 1) {
      const sx = Math.min(W - 1, Math.floor(((x + 0.5) * W) / destW));
      const color = g[sy][sx];
      if (color == null) continue;
      out[oy + y][ox + x] = color;
      if (mask[sy][sx]) outMask[oy + y][ox + x] = true;
    }
  }
  // 原画底部可能自带透明留白，整体下移让可见最底行贴住第 24 行。
  let lowest = -1;
  for (let y = 0; y < PLAY_ROWS; y += 1) {
    if (out[y].some((color) => color != null)) lowest = y;
  }
  const shift = PLAY_ROWS - 1 - lowest;
  if (shift > 0) {
    for (let y = PLAY_ROWS - 1; y >= 0; y -= 1) {
      out[y] = y - shift >= 0 ? out[y - shift] : new Array(W).fill(null);
    }
    for (let y = PLAY_ROWS - 1; y >= 0; y -= 1) {
      outMask[y] = y - shift >= 0 ? outMask[y - shift] : maskGrid()[0];
    }
  }
  return { g: out, mask: outMask, destH };
}

function countDestructibleGrid(g, mask) {
  let total = 0;
  for (let y = 0; y < gridH(g); y += 1) {
    for (let x = 0; x < gridW(g); x += 1) {
      if (g[y][x] != null && !(mask[y] && mask[y][x])) total += 1;
    }
  }
  return total;
}

function makeMask(w, h) {
  return Array.from({ length: h }, () => new Array(w).fill(false));
}

// 取能满足砖数上限的最大缩放，像素画占满 25 行时即“接近满屏”。
function fitToBand(src, srcMask, band, name) {
  for (let destH = PLAY_ROWS; destH >= 6; destH -= 1) {
    const scaled = rescale(src, srcMask, destH);
    const count = countDestructibleGrid(scaled.g, scaled.mask);
    if (count <= band.max) return { ...scaled, count };
  }
  throw new Error(name + ' 无法压到砖数上限 ' + band.max);
}

function backdropColor(theme, name) {
  if (theme === 'flowers') return C.lilac;
  if (theme === 'scenery') return name === 'night' ? C.lavender : C.sky;
  return C.cream;
}

function contentBounds(g) {
  let minX = gridW(g);
  let maxX = -1;
  let minY = gridH(g);
  let maxY = -1;
  for (let y = 0; y < gridH(g); y += 1) {
    for (let x = 0; x < gridW(g); x += 1) {
      if (g[y][x] == null) continue;
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    }
  }
  if (maxX < 0) throw new Error('像素画为空');
  return { minX, maxX, minY, maxY };
}

// 只补图案包围盒内部与上方，不把画布扩成满宽。
function fillBackdrop(g, need, color, name) {
  let left = need;
  const box = contentBounds(g);
  for (let y = box.minY; y <= box.maxY && left > 0; y += 1) {
    for (let x = box.minX; x <= box.maxX && left > 0; x += 1) {
      if (g[y][x] != null) continue;
      g[y][x] = color;
      left -= 1;
    }
  }
  let top = box.minY;
  while (left > 0) {
    if (top <= 0) throw new Error(name + ' 背景填充不足，仍缺 ' + left);
    top -= 1;
    for (let x = box.minX; x <= box.maxX && left > 0; x += 1) {
      g[top][x] = color;
      left -= 1;
    }
  }
}

function maskCells(mask) {
  const out = [];
  for (let y = 0; y < mask.length; y += 1) {
    for (let x = 0; x < mask[y].length; x += 1) {
      if (mask[y][x]) out.push([x, y]);
    }
  }
  return out;
}

function cropGrid(g, mask) {
  const box = contentBounds(g);
  const cols = box.maxX - box.minX + 1;
  const rows = box.maxY - box.minY + 1;
  const out = makeGrid(cols, rows);
  const outMask = makeGrid(cols, rows).map((row) => row.map(() => false));
  for (let y = 0; y < rows; y += 1) {
    for (let x = 0; x < cols; x += 1) {
      const sx = box.minX + x;
      const sy = box.minY + y;
      out[y][x] = g[sy][sx];
      outMask[y][x] = !!(mask && mask[sy] && mask[sy][sx]);
    }
  }
  return { g: out, mask: outMask, cols, rows };
}

function debuffCountFor(id) {
  if (id <= 3) return 0;
  if (id <= 7) return 1;
  if (id <= 12) return 2;
  if (id <= 19) return 3;
  return 4;
}

function debuffKindsFor(id, count) {
  const start = Math.max(0, id - 4) % DEBUFF_IDS.length;
  return Array.from({ length: count }, (_, i) => DEBUFF_IDS[(start + i) % DEBUFF_IDS.length]);
}

function toRgba(g) {
  const w = gridW(g);
  const h = gridH(g);
  const rgba = Buffer.alloc(w * h * 4);
  for (let y = 0; y < h; y += 1) {
    for (let x = 0; x < w; x += 1) {
      const color = g[y][x];
      if (color == null) continue;
      const offset = (y * w + x) * 4;
      const rgb = PALETTE[color];
      const n = parseInt(rgb.slice(1), 16);
      rgba[offset] = (n >> 16) & 255;
      rgba[offset + 1] = (n >> 8) & 255;
      rgba[offset + 2] = n & 255;
      rgba[offset + 3] = 255;
    }
  }
  return rgba;
}

function makeCover() {
  const cw = 500;
  const ch = 400;
  const rgba = Buffer.alloc(cw * ch * 4);
  const top = [255, 246, 250];
  const bottom = [232, 225, 255];
  for (let y = 0; y < ch; y += 1) {
    const t = y / (ch - 1);
    for (let x = 0; x < cw; x += 1) {
      const offset = (y * cw + x) * 4;
      rgba[offset] = Math.round(top[0] + (bottom[0] - top[0]) * t);
      rgba[offset + 1] = Math.round(top[1] + (bottom[1] - top[1]) * t);
      rgba[offset + 2] = Math.round(top[2] + (bottom[2] - top[2]) * t);
      rgba[offset + 3] = 255;
    }
  }
  const tiles = [5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 4];
  const cell = 52;
  const gap = 10;
  const cols = 6;
  const rows = 4;
  const gridW = cols * cell + (cols - 1) * gap;
  const gridH = rows * cell + (rows - 1) * gap;
  const ox = (cw - gridW) / 2;
  const oy = 52;
  for (let row = 0; row < rows; row += 1) {
    for (let col = 0; col < cols; col += 1) {
      const colorIndex = tiles[(row * cols + col) % tiles.length];
      const n = parseInt(PALETTE[colorIndex].slice(1), 16);
      const r = (n >> 16) & 255;
      const g = (n >> 8) & 255;
      const b = n & 255;
      const x0 = Math.round(ox + col * (cell + gap));
      const y0 = Math.round(oy + row * (cell + gap));
      const radius = 10;
      for (let y = 0; y < cell; y += 1) {
        for (let x = 0; x < cell; x += 1) {
          if (x < radius && y < radius && (radius - x) ** 2 + (radius - y) ** 2 > radius * radius) continue;
          if (x >= cell - radius && y < radius && (x - (cell - radius - 1)) ** 2 + (radius - y) ** 2 > radius * radius) continue;
          if (x < radius && y >= cell - radius && (radius - x) ** 2 + (y - (cell - radius - 1)) ** 2 > radius * radius) continue;
          if (x >= cell - radius && y >= cell - radius && (x - (cell - radius - 1)) ** 2 + (y - (cell - radius - 1)) ** 2 > radius * radius) continue;
          const px = x0 + x;
          const py = y0 + y;
          if (px < 0 || px >= cw || py < 0 || py >= ch) continue;
          const shade = y < cell * 0.35 ? 1.08 : y > cell * 0.82 ? 0.9 : 1;
          const offset = (py * cw + px) * 4;
          rgba[offset] = Math.min(255, Math.round(r * shade));
          rgba[offset + 1] = Math.min(255, Math.round(g * shade));
          rgba[offset + 2] = Math.min(255, Math.round(b * shade));
          rgba[offset + 3] = 255;
        }
      }
    }
  }
  return encodePng(cw, ch, rgba);
}

function main() {
  mkdirSync(SRC_DIR, { recursive: true });
  mkdirSync(COVER_DIR, { recursive: true });
  const report = [];
  for (let i = 0; i < LEVELS.length; i += 1) {
    const id = i + 1;
    const def = LEVELS[i];
    const icon = def.cols != null;
    const art = icon ? makeGrid(def.cols, def.rows) : grid();
    const result = def.art(art);
    const artMask = icon ? makeMask(def.cols, def.rows) : maskGrid();
    for (const [x, y] of result.obstacles) {
      if (art[y][x] == null) throw new Error(def.name + ' 障碍坐标为空: ' + x + ',' + y);
      artMask[y][x] = true;
    }

    let fitted;
    if (icon) {
      fitted = { g: art, mask: artMask };
      const iconCount = countDestructibleGrid(art, artMask);
      if (iconCount !== def.bricks) {
        throw new Error(def.name + ' 图标砖数应为 ' + def.bricks + '，实际 ' + iconCount);
      }
    } else {
      const band = bandFor(id);
      fitted = fitToBand(art, artMask, band, def.name);
      if (fitted.count < band.min) {
        fillBackdrop(fitted.g, band.min - fitted.count, backdropColor(def.theme, def.name), def.name);
      }
      const fittedCount = countDestructibleGrid(fitted.g, fitted.mask);
      if (fittedCount < band.min || fittedCount > band.max) {
        throw new Error(def.name + ' 砖数 ' + fittedCount + ' 超出区间 ' + band.min + '..' + band.max);
      }
    }

    const count = countDestructibleGrid(fitted.g, fitted.mask);
    if (id <= TARGETS.length && count !== TARGETS[id - 1]) {
      throw new Error(def.name + ' 目标砖数应为 ' + TARGETS[id - 1] + '，实际 ' + count);
    }

    // 裁到图案包围盒：小图放大成大方砖，大图保持接近满尺寸。
    const cropped = cropGrid(fitted.g, fitted.mask);
    const obstacles = maskCells(cropped.mask);
    const blocked = new Set(obstacles.map(([x, y]) => x + ',' + y));
    const rewardCount = rewardCountFor(count);
    const rewards = chooseSpread(cropped.g, blocked, rewardCount, id, 0);
    if (rewards.length !== rewardCount) {
      throw new Error(def.name + ' 奖励砖应为 ' + rewardCount + ' 块，实际 ' + rewards.length);
    }
    for (const [x, y] of rewards) {
      blocked.add(x + ',' + y);
      set(cropped.g, x, y, C.gold);
    }
    const debuffCount = count < 40 ? 0 : debuffCountFor(id);
    const debuffs = chooseSpread(cropped.g, blocked, debuffCount, id, 977);
    const kinds = debuffKindsFor(id, debuffs.length);
    const debuffMeta = debuffs.map(([x, y], index) => {
      set(cropped.g, x, y, C.dark);
      return [x, y, kinds[index]];
    });
    for (const [x, y] of debuffs) {
      if (cropped.g[y][x] == null) throw new Error(def.name + ' 减益坐标为空: ' + x + ',' + y);
    }

    const cell = cellForGrid(cropped.cols, cropped.rows);
    const base = String(id).padStart(2, '0') + '-' + def.name;
    writeFileSync(
      path.join(SRC_DIR, base + '.png'),
      encodePng(cropped.cols, cropped.rows, toRgba(cropped.g)),
    );
    const meta = {
      id,
      name: def.name,
      title: def.title,
      theme: def.theme,
      size: [cropped.cols, cropped.rows],
      cell,
      anchor: 'top',
      ball: configFor(id),
      obstacles,
      rewards,
      debuffs: debuffMeta,
    };
    writeFileSync(path.join(SRC_DIR, base + '.json'), JSON.stringify(meta, null, 2) + '\n');
    report.push({
      id,
      name: def.name,
      destructible: count,
      rewards: rewards.length,
      debuffs: debuffMeta.length,
      obstacles: obstacles.length,
      cols: cropped.cols,
      rows: cropped.rows,
      cell,
      speed: meta.ball.speed,
      balls: meta.ball.count,
    });
  }
  writeFileSync(path.join(COVER_DIR, 'cover.png'), makeCover());
  console.log('[levels] 生成 ' + LEVELS.length + ' 关源图 → assets/levels/src/');
  for (const row of report) {
    console.log('  ' + String(row.id).padStart(2, '0') + ' ' + row.name.padEnd(10)
      + ' bricks ' + String(row.destructible).padStart(3)
      + ' · reward ' + row.rewards
      + ' · debuff ' + row.debuffs
      + ' · obstacle ' + row.obstacles
      + ' · grid ' + row.cols + '×' + row.rows
      + ' · cell ' + row.cell.toFixed(2)
      + ' · balls ' + row.balls + ' · speed ' + row.speed);
  }
  console.log('[levels] 分享封面 → apps/game/assets/share/cover.png');
}

main();
