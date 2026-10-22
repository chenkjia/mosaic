// 生成 30 关的 21×28 像素画源图（PNG）+ 类型/难度 sidecar。
// 源图是派生 levels.json 的输入，重新跑本脚本会覆盖同名文件。
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { PALETTE } from '../packages/shared/src/palette.js';
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

function grid() {
  return Array.from({ length: H }, () => new Array(W).fill(null));
}

function set(g, x, y, color) {
  if (x < 0 || x >= W || y < 0 || y >= H || color == null) return;
  g[y][x] = color;
}

function clear(g, x, y) {
  if (x < 0 || x >= W || y < 0 || y >= H) return;
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
  for (let y = 0; y < H; y += 1) {
    for (let x = 0; x < W; x += 1) {
      const dx = (x + 0.5 - cx) / rx;
      const dy = (y + 0.5 - cy) / ry;
      if (dx * dx + dy * dy <= 1) set(g, x, y, color);
    }
  }
}

function clearEllipse(g, cx, cy, rx, ry) {
  for (let y = 0; y < H; y += 1) {
    for (let x = 0; x < W; x += 1) {
      const dx = (x + 0.5 - cx) / rx;
      const dy = (y + 0.5 - cy) / ry;
      if (dx * dx + dy * dy <= 1) clear(g, x, y);
    }
  }
}

function ellipseRot(g, cx, cy, rx, ry, angle, color) {
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  for (let y = 0; y < H; y += 1) {
    for (let x = 0; x < W; x += 1) {
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
  for (let y = Math.max(0, Math.floor(minY)); y <= Math.min(H - 1, Math.ceil(maxY)); y += 1) {
    for (let x = 0; x < W; x += 1) {
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
  for (let y = 0; y < H; y += 1) {
    for (let x = 0; x < W; x += 1) {
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
  for (let y = 0; y < H; y += 1) {
    for (let x = 0; x < W; x += 1) {
      if (g[y][x] != null) out.push({ x, y, color: g[y][x] });
    }
  }
  return out;
}

function findCells(g, predicate, limit) {
  const out = [];
  for (let y = 0; y < H && out.length < limit; y += 1) {
    for (let x = 0; x < W && out.length < limit; x += 1) {
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
  for (let y = H - rows; y < H; y += 1) {
    for (let x = 0; x < W; x += 1) {
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

// ---------- 动物 ----------

function cat(g) {
  polygon(g, [[3, 5], [9, 10], [3, 13]], C.violet);
  polygon(g, [[4, 6], [8, 10], [4, 11]], C.peach);
  polygon(g, [[17, 5], [11, 10], [17, 13]], C.violet);
  polygon(g, [[16, 6], [12, 10], [16, 11]], C.peach);
  blob(g, 10, 15.5, 6.8, 6, C.peach, C.violet);
  ellipse(g, 7, 14, 1.1, 1.4, C.dark);
  ellipse(g, 13, 14, 1.1, 1.4, C.dark);
  set(g, 7, 13, C.white);
  set(g, 13, 13, C.white);
  set(g, 10, 17, C.rose);
  line(g, 10, 18, 9, 19, C.dark);
  line(g, 10, 18, 11, 19, C.dark);
  line(g, 2, 17, 5, 18, C.violet);
  line(g, 2, 19, 5, 19, C.violet);
  line(g, 18, 17, 15, 18, C.violet);
  line(g, 18, 19, 15, 19, C.violet);
  ellipse(g, 10, 24, 4.5, 3, C.peach);
  ellipse(g, 10, 24.5, 2.5, 1.6, C.cream);
  set(g, 10, 22, C.gold);
  set(g, 9, 22, C.gold);
  set(g, 11, 22, C.gold);
  shadeBottom(g, C.lilac, 2);
  const obstacles = [[6, 26], [7, 26], [13, 26], [14, 26]];
  for (const [x, y] of obstacles) set(g, x, y, C.violet);
  const rewards = [[9, 22], [10, 22], [11, 22]];
  return { rewards, obstacles };
}

function bunny(g) {
  ellipseRot(g, 7.5, 6, 2.3, 5.5, -0.08, C.violet);
  ellipseRot(g, 13.5, 6, 2.3, 5.5, 0.08, C.violet);
  ellipseRot(g, 7.5, 6, 1.5, 4.6, -0.08, C.white);
  ellipseRot(g, 13.5, 6, 1.5, 4.6, 0.08, C.white);
  ellipseRot(g, 7.5, 6, 0.8, 3.2, -0.08, C.pink);
  ellipseRot(g, 13.5, 6, 0.8, 3.2, 0.08, C.pink);
  blob(g, 10, 15, 6.5, 5.6, C.white, C.violet);
  ellipse(g, 7, 14, 1.1, 1.4, C.dark);
  ellipse(g, 13, 14, 1.1, 1.4, C.dark);
  set(g, 7, 13, C.white);
  set(g, 13, 13, C.white);
  set(g, 10, 17, C.pink);
  line(g, 10, 18, 9, 19, C.dark);
  line(g, 10, 18, 11, 19, C.dark);
  ellipse(g, 6, 18, 1.4, 0.9, C.pink);
  ellipse(g, 14, 18, 1.4, 0.9, C.pink);
  blob(g, 10, 24, 4.6, 2.8, C.white, C.violet);
  polygon(g, [[15, 21], [18, 21], [16.5, 24]], C.coral);
  set(g, 15, 20, C.mint);
  set(g, 16, 20, C.mint);
  set(g, 16, 21, C.gold);
  set(g, 17, 21, C.gold);
  shadeBottom(g, C.lilac, 1);
  return { rewards: [[16, 21], [17, 21], [10, 24]], obstacles: [] };
}

function bear(g) {
  ellipse(g, 4.5, 7, 3, 3, C.violet);
  ellipse(g, 15.5, 7, 3, 3, C.violet);
  ellipse(g, 4.5, 7, 2.1, 2.1, C.peach);
  ellipse(g, 15.5, 7, 2.1, 2.1, C.peach);
  blob(g, 10, 15, 7, 6.2, C.peach, C.violet);
  ellipse(g, 10, 18.5, 3.6, 2.6, C.cream);
  ellipse(g, 10, 17.2, 1.4, 1.1, C.dark);
  line(g, 10, 18, 9, 19, C.dark);
  line(g, 10, 18, 11, 19, C.dark);
  ellipse(g, 6.5, 13.5, 1, 1.2, C.dark);
  ellipse(g, 13.5, 13.5, 1, 1.2, C.dark);
  set(g, 6, 13, C.white);
  set(g, 13, 13, C.white);
  ellipse(g, 10, 25, 4.5, 2.2, C.peach);
  rect(g, 8, 23, 5, 3, C.gold);
  set(g, 8, 23, C.violet);
  set(g, 12, 23, C.violet);
  const rewards = [[9, 24], [10, 24], [11, 24]];
  const obstacles = [[7, 25], [8, 25], [12, 25], [13, 25]];
  for (const [x, y] of obstacles) set(g, x, y, C.violet);
  return { rewards, obstacles };
}

function fox(g) {
  polygon(g, [[3, 14], [5, 4], [10, 11]], C.rose);
  polygon(g, [[18, 14], [16, 4], [11, 11]], C.rose);
  polygon(g, [[5, 6], [6, 10], [8, 11]], C.dark);
  polygon(g, [[16, 6], [15, 10], [13, 11]], C.dark);
  polygon(g, [[3, 14], [10, 7], [18, 14], [10, 22]], C.coral);
  blob(g, 10, 17, 5.5, 4.5, C.coral, C.rose);
  ellipse(g, 10, 18.5, 3.2, 2.4, C.white);
  ellipse(g, 10, 17.4, 1.3, 1, C.dark);
  ellipse(g, 6.5, 14, 1.2, 1.5, C.dark);
  ellipse(g, 13.5, 14, 1.2, 1.5, C.dark);
  set(g, 6, 13, C.white);
  set(g, 13, 13, C.white);
  line(g, 10, 19, 9, 20, C.dark);
  line(g, 10, 19, 11, 20, C.dark);
  set(g, 4, 18, C.white);
  set(g, 16, 18, C.white);
  shadeBottom(g, C.lilac, 1);
  const rewards = [[9, 21], [10, 21], [11, 21]];
  for (const [x, y] of rewards) set(g, x, y, C.gold);
  return { rewards, obstacles: [] };
}

function panda(g) {
  ellipse(g, 4, 6, 3, 3, C.dark);
  ellipse(g, 16, 6, 3, 3, C.dark);
  blob(g, 10, 15, 7, 6.2, C.white, C.violet);
  ellipseRot(g, 6.5, 13.5, 2.2, 3, 0.35, C.dark);
  ellipseRot(g, 13.5, 13.5, 2.2, 3, -0.35, C.dark);
  set(g, 6, 13, C.white);
  set(g, 14, 13, C.white);
  ellipse(g, 10, 17, 1.3, 1, C.dark);
  line(g, 10, 18, 9, 19, C.dark);
  line(g, 10, 18, 11, 19, C.dark);
  blob(g, 10, 24, 5.5, 3.2, C.dark, C.violet);
  ellipse(g, 10, 24, 3, 2, C.white);
  rect(g, 17, 4, 2, 20, C.mint);
  for (let y = 6; y < 24; y += 3) rect(g, 17, y, 2, 1, C.teal);
  set(g, 16, 8, C.mint);
  set(g, 19, 12, C.mint);
  set(g, 16, 16, C.mint);
  shadeBottom(g, C.lilac, 1);
  const obstacles = [[18, 20], [18, 21]];
  for (const [x, y] of obstacles) set(g, x, y, C.violet);
  const rewards = [[9, 11], [10, 11], [11, 11]];
  for (const [x, y] of rewards) set(g, x, y, C.gold);
  return { rewards, obstacles };
}

function frog(g) {
  blob(g, 10, 17, 7.2, 5.8, C.mint, C.teal);
  ellipse(g, 5.5, 10, 3, 3, C.teal);
  ellipse(g, 14.5, 10, 3, 3, C.teal);
  ellipse(g, 5.5, 10, 2.1, 2.1, C.white);
  ellipse(g, 14.5, 10, 2.1, 2.1, C.white);
  ellipse(g, 5.5, 10, 1.1, 1.3, C.dark);
  ellipse(g, 14.5, 10, 1.1, 1.3, C.dark);
  line(g, 5, 18, 15, 18, C.teal);
  set(g, 4, 20, C.teal);
  set(g, 16, 20, C.teal);
  ellipse(g, 10, 22, 4.5, 2.5, C.cream);
  ellipse(g, 10, 24, 3, 2, C.mint);
  set(g, 8, 16, C.teal);
  set(g, 12, 16, C.teal);
  shadeBottom(g, C.teal, 1);
  const rewards = [[8, 20], [10, 21], [12, 20]];
  for (const [x, y] of rewards) set(g, x, y, C.gold);
  const obstacles = [[3, 25], [4, 25], [16, 25], [17, 25]];
  for (const [x, y] of obstacles) set(g, x, y, C.teal);
  return { rewards, obstacles };
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
  { name: 'cat', theme: 'animals', art: cat, title: '猫咪' },
  { name: 'bunny', theme: 'animals', art: bunny, title: '兔子' },
  { name: 'bear', theme: 'animals', art: bear, title: '小熊' },
  { name: 'fox', theme: 'animals', art: fox, title: '狐狸' },
  { name: 'panda', theme: 'animals', art: panda, title: '熊猫' },
  { name: 'frog', theme: 'animals', art: frog, title: '青蛙' },
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

// 奖励砖固定在 6 块，用最远点采样摊开：先取离重心最远的一格，再依次取离已选格最远的一格。
function hash2(id, x, y) {
  let h = (Math.imul(id, 374761393) + Math.imul(x, 668265263) + Math.imul(y, 2246822519)) >>> 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177) >>> 0;
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

function chooseRewards(g, obstacles, id) {
  const blocked = new Set(obstacles.map(([x, y]) => x + ',' + y));
  const candidates = [];
  let sumX = 0;
  let sumY = 0;
  for (let y = 0; y < H; y += 1) {
    for (let x = 0; x < W; x += 1) {
      if (g[y][x] == null || blocked.has(x + ',' + y)) continue;
      candidates.push({ x, y });
      sumX += x;
      sumY += y;
    }
  }
  if (candidates.length <= 6) return candidates.map((cell) => [cell.x, cell.y]);
  const cx = sumX / candidates.length;
  const cy = sumY / candidates.length;
  const chosen = [];
  const remaining = candidates.slice();
  let first = 0;
  let firstScore = -1;
  for (let i = 0; i < remaining.length; i += 1) {
    const cell = remaining[i];
    const score = (cell.x - cx) ** 2 + (cell.y - cy) ** 2 + hash2(id, cell.x, cell.y) * 1e-3;
    if (score > firstScore) {
      firstScore = score;
      first = i;
    }
  }
  chosen.push(remaining.splice(first, 1)[0]);
  while (chosen.length < 6) {
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
      const tie = hash2(id + chosen.length * 131, cell.x, cell.y);
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

function toRgba(g) {
  const rgba = Buffer.alloc(W * H * 4);
  for (let y = 0; y < H; y += 1) {
    for (let x = 0; x < W; x += 1) {
      const color = g[y][x];
      if (color == null) continue;
      const offset = (y * W + x) * 4;
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
    const g = grid();
    const result = def.art(g);
    const rewards = chooseRewards(g, result.obstacles, id);
    for (const [x, y] of rewards) set(g, x, y, C.gold);
    const all = cells(g);
    if (all.length < 40) throw new Error(def.name + ' 砖块过少: ' + all.length);
    for (const [x, y] of rewards) {
      if (g[y][x] == null) throw new Error(def.name + ' 奖励坐标为空: ' + x + ',' + y);
    }
    for (const [x, y] of result.obstacles) {
      if (g[y][x] == null) throw new Error(def.name + ' 障碍坐标为空: ' + x + ',' + y);
    }
    const base = String(id).padStart(2, '0') + '-' + def.name;
    writeFileSync(path.join(SRC_DIR, base + '.png'), encodePng(W, H, toRgba(g)));
    const meta = {
      id,
      name: def.name,
      title: def.title,
      theme: def.theme,
      size: [W, H],
      ball: configFor(id),
      obstacles: result.obstacles,
      rewards,
    };
    writeFileSync(path.join(SRC_DIR, base + '.json'), JSON.stringify(meta, null, 2) + '\n');
    const destructible = all.length - result.obstacles.length;
    report.push({ id, name: def.name, bricks: all.length, destructible, speed: meta.ball.speed, balls: meta.ball.count });
  }
  writeFileSync(path.join(COVER_DIR, 'cover.png'), makeCover());
  console.log('[levels] 生成 ' + LEVELS.length + ' 关源图 → assets/levels/src/');
  for (const row of report) {
    console.log('  ' + String(row.id).padStart(2, '0') + ' ' + row.name.padEnd(10)
      + ' bricks ' + String(row.bricks).padStart(3)
      + ' · destructible ' + String(row.destructible).padStart(3)
      + ' · balls ' + row.balls + ' · speed ' + row.speed);
  }
  console.log('[levels] 分享封面 → apps/game/assets/share/cover.png');
}

main();
