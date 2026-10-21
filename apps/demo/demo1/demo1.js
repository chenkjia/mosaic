(function () {
  'use strict';

  var SPEC = {
    designWidth: 750,
    minDesignH: 1334,
    cols: 21,
    rows: 28,
    cell: 34,
    inset: 1.5,
    radius: 7,
    hudH: 140,
    boardTop: 160,
    boardW: 714,
    boardH: 952,
    legendTop: 1154,
  };

  var PALETTE = [
    '#FFF6FA', '#E9E1FF', '#5B4BC4', '#FFFFFF',
    '#2A2344', '#FF9FC2', '#FF6F9E', '#FFC58A',
    '#FF9A5C', '#FFD86E', '#FFB84D', '#7BDCC8',
    '#4CC9B0', '#8FD3FF', '#5AA9F0', '#A9A0FF',
  ];

  var stage = document.getElementById('stage');
  var ctx = stage.getContext('2d');
  var badge = document.getElementById('badge');
  var specPanel = document.getElementById('spec');
  var sim = parseSim();
  var winW = 0;
  var winH = 0;
  var dpr = 1;
  var gridOn = false;
  var pattern = buildPattern();
  var destructible = pattern.filter(function (b) { return b.type !== 'obstacle'; }).length;

  function parseSim() {
    var query = new URLSearchParams(window.location.search).get('view');
    if (!query) {
      var hash = /(?:^#|&)view=([^&]+)/.exec(window.location.hash);
      query = hash ? decodeURIComponent(hash[1]) : '';
    }
    if (!query) return null;
    var match = /^(\d+)x(\d+)$/.exec(query);
    if (!match) return null;
    return { w: Number(match[1]), h: Number(match[2]) };
  }

  function rgbOf(hex) {
    var n = parseInt(hex.slice(1), 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }

  function mix(from, to, amount) {
    var a = rgbOf(from);
    var b = rgbOf(to);
    return 'rgb(' + Math.round(a[0] + (b[0] - a[0]) * amount)
      + ',' + Math.round(a[1] + (b[1] - a[1]) * amount)
      + ',' + Math.round(a[2] + (b[2] - a[2]) * amount) + ')';
  }

  function roundRectPath(context, x, y, w, h, radius) {
    var r = Math.max(0, Math.min(radius, w / 2, h / 2));
    context.beginPath();
    context.moveTo(x + r, y);
    context.arcTo(x + w, y, x + w, y + h, r);
    context.arcTo(x + w, y + h, x, y + h, r);
    context.arcTo(x, y + h, x, y, r);
    context.arcTo(x, y, x + w, y, r);
    context.closePath();
  }

  function heartAt(col, row) {
    var x = (col - 10) / 8.4;
    var y = -(row - 13.5) / 9.6;
    var q = x * x + y * y - 1;
    return q * q * q - x * x * y * y * y <= 0;
  }

  function buildPattern() {
    var bricks = [];
    var rewards = [[8, 7], [8, 13], [13, 10], [17, 8], [17, 12]];
    var obstacles = [
      [6, 9], [7, 9], [6, 10],
      [12, 15], [13, 15], [12, 16],
    ];

    for (var row = 0; row < SPEC.rows; row += 1) {
      for (var col = 0; col < SPEC.cols; col += 1) {
        if (!heartAt(col, row)) continue;
        var edge = !heartAt(col - 1, row) || !heartAt(col + 1, row)
          || !heartAt(col, row - 1) || !heartAt(col, row + 1);
        var type = 'normal';
        var hp = 1;
        if (edge && (row + col) % 2 === 0) {
          type = 'hard';
          hp = 2;
        } else if (!edge && row % 6 === 0 && col % 5 === 0) {
          type = 'hard';
          hp = 3;
        }
        bricks.push({
          col: col,
          row: row,
          type: type,
          hp: hp,
          color: 5 + ((row * 2 + col * 3) % 11),
        });
      }
    }

    for (var i = 0; i < rewards.length; i += 1) {
      var reward = rewards[i];
      for (var j = 0; j < bricks.length; j += 1) {
        if (bricks[j].col === reward[0] && bricks[j].row === reward[1]) {
          bricks[j].type = 'reward';
          bricks[j].hp = 1;
          bricks[j].color = 9;
          break;
        }
      }
    }

    for (var k = 0; k < obstacles.length; k += 1) {
      bricks.push({
        col: obstacles[k][0],
        row: obstacles[k][1],
        type: 'obstacle',
        hp: Infinity,
        color: 2,
      });
    }

    return bricks;
  }

  function layoutFor(vw, vh) {
    var fitScale = vw / SPEC.designWidth;
    var fitH = vh / fitScale;
    if (fitH >= SPEC.minDesignH - 0.5) {
      return {
        mode: 'fit',
        scale: fitScale,
        designH: fitH,
        offsetX: 0,
        bleedX: 0,
        bleedW: vw / fitScale,
      };
    }
    var scale = Math.min(fitScale, vh / SPEC.minDesignH);
    var offsetX = (vw - SPEC.designWidth * scale) / 2;
    return {
      mode: 'fallback',
      scale: scale,
      designH: SPEC.minDesignH,
      offsetX: offsetX,
      bleedX: -offsetX / scale,
      bleedW: vw / scale,
    };
  }

  function panelFor() {
    if (!sim) return { x: 0, y: 0, w: winW, h: winH, scale: 1, sim: false };
    var padX = 46;
    var padY = 62;
    var s = Math.min((winW - padX * 2) / sim.w, (winH - padY * 2) / sim.h);
    var w = sim.w * s;
    var h = sim.h * s;
    return {
      x: (winW - w) / 2,
      y: (winH - h) / 2 + 8,
      w: w,
      h: h,
      scale: s,
      sim: true,
    };
  }

  function draw() {
    dpr = window.devicePixelRatio || 1;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, winW, winH);

    var surround = ctx.createLinearGradient(0, 0, 0, winH);
    surround.addColorStop(0, '#24163F');
    surround.addColorStop(1, '#140D26');
    ctx.fillStyle = surround;
    ctx.fillRect(0, 0, winW, winH);

    var panel = panelFor();
    var vw = sim ? sim.w : winW;
    var vh = sim ? sim.h : winH;
    var layout = layoutFor(vw, vh);

    if (panel.sim) {
      ctx.save();
      ctx.shadowColor = 'rgba(0,0,0,0.48)';
      ctx.shadowBlur = 34;
      ctx.shadowOffsetY = 14;
      ctx.fillStyle = '#0C0818';
      roundRectPath(ctx, panel.x, panel.y, panel.w, panel.h, 18);
      ctx.fill();
      ctx.restore();

      ctx.fillStyle = '#CFC6FF';
      ctx.font = '600 13px "PingFang SC", "Microsoft YaHei", sans-serif';
      ctx.textAlign = 'right';
      ctx.textBaseline = 'alphabetic';
      ctx.fillText('模拟视口 ' + sim.w + '×' + sim.h + ' · ' + layout.mode, panel.x + panel.w, panel.y - 14);
      ctx.textAlign = 'left';
    }

    ctx.save();
    roundRectPath(ctx, panel.x, panel.y, panel.w, panel.h, panel.sim ? 18 : 0);
    ctx.clip();
    var s = panel.scale * layout.scale;
    var tx = panel.x + panel.scale * layout.offsetX;
    var ty = panel.y;
    ctx.setTransform(dpr * s, 0, 0, dpr * s, dpr * tx, dpr * ty);
    drawScene(layout);
    ctx.restore();

    if (panel.sim) {
      ctx.strokeStyle = 'rgba(207,198,255,0.24)';
      ctx.lineWidth = 1;
      roundRectPath(ctx, panel.x, panel.y, panel.w, panel.h, 18);
      ctx.stroke();
    }

    badge.textContent = (sim ? '模拟 ' : '实时 ') + vw + '×' + vh
      + ' · ' + layout.mode + ' · scale ' + layout.scale.toFixed(2);
    badge.style.display = sim ? 'block' : 'none';
  }

  function drawScene(layout) {
    var background = ctx.createLinearGradient(0, 0, 0, layout.designH);
    background.addColorStop(0, PALETTE[0]);
    background.addColorStop(1, PALETTE[1]);
    ctx.fillStyle = background;
    ctx.fillRect(layout.bleedX, 0, layout.bleedW, layout.designH);

    drawHud(layout);
    drawBoard();
    drawLegend();
    if (!sim) drawDiagnostics(layout);
  }

  function drawDiagnostics(layout) {
    ctx.textAlign = 'right';
    ctx.textBaseline = 'alphabetic';
    ctx.fillStyle = 'rgba(91,75,196,0.62)';
    ctx.font = '500 18px "PingFang SC", "Microsoft YaHei", sans-serif';
    ctx.fillText('实时 ' + winW + '×' + winH + ' · ' + layout.mode
      + ' · scale ' + layout.scale.toFixed(2), 710, 1248);
    ctx.textAlign = 'left';
  }

  function drawHud(layout) {
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
    ctx.fillStyle = PALETTE[2];
    ctx.font = '800 48px "PingFang SC", "Microsoft YaHei", sans-serif';
    ctx.fillText('MOSAIC', 40, 66);

    ctx.fillStyle = PALETTE[2];
    ctx.font = '500 22px "PingFang SC", "Microsoft YaHei", sans-serif';
    ctx.fillText('砖块校准 · demo1', 40, 102);

    ctx.textAlign = 'right';
    ctx.fillStyle = PALETTE[2];
    ctx.font = '700 26px "PingFang SC", "Microsoft YaHei", sans-serif';
    ctx.fillText('CLEARED · 0%', 710, 62);
    ctx.fillStyle = PALETTE[2];
    ctx.font = '400 16px "PingFang SC", "Microsoft YaHei", sans-serif';
    ctx.fillText('0 / ' + destructible + ' 可破坏', 710, 90);

    ctx.textAlign = 'left';
    for (var i = 0; i < PALETTE.length; i += 1) {
      var x = 40 + i * 24;
      roundRectPath(ctx, x, 114, 16, 16, 4);
      ctx.fillStyle = PALETTE[i];
      ctx.fill();
      ctx.strokeStyle = 'rgba(42,35,68,0.12)';
      ctx.lineWidth = 1;
      ctx.stroke();
    }
    ctx.fillStyle = 'rgba(91,75,196,0.66)';
    ctx.font = '400 13px "PingFang SC", "Microsoft YaHei", sans-serif';
    ctx.fillText('16 色调色板', 40 + PALETTE.length * 24 + 12, 128);

    ctx.textAlign = 'right';
    ctx.fillStyle = 'rgba(91,75,196,0.66)';
    ctx.font = '400 16px "PingFang SC", "Microsoft YaHei", sans-serif';
    ctx.fillText('21 × 28 · cell 34 · inset 1.5', 710, 148);
    ctx.textAlign = 'left';
  }

  function drawBoard() {
    var boardX = (SPEC.designWidth - SPEC.boardW) / 2;
    roundRectPath(ctx, boardX, SPEC.boardTop, SPEC.boardW, SPEC.boardH, 20);
    ctx.fillStyle = 'rgba(255,255,255,0.30)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(91,75,196,0.16)';
    ctx.lineWidth = 1;
    ctx.stroke();

    var size = SPEC.cell - SPEC.inset * 2;
    for (var i = 0; i < pattern.length; i += 1) {
      var brick = pattern[i];
      var x = boardX + brick.col * SPEC.cell + SPEC.inset;
      var y = SPEC.boardTop + brick.row * SPEC.cell + SPEC.inset;
      drawBrick(x, y, size, brick);
    }

    if (gridOn) drawGrid(boardX);
  }

  function drawBrick(x, y, size, brick) {
    var color = PALETTE[brick.color];
    var r = SPEC.radius;

    ctx.fillStyle = 'rgba(42,35,68,0.16)';
    roundRectPath(ctx, x + 1.2, y + 2.2, size, size, r);
    ctx.fill();

    var base = ctx.createLinearGradient(x, y, x, y + size);
    base.addColorStop(0, mix(color, PALETTE[3], 0.20));
    base.addColorStop(0.56, color);
    base.addColorStop(1, mix(color, PALETTE[4], 0.16));
    roundRectPath(ctx, x, y, size, size, r);
    ctx.fillStyle = base;
    ctx.fill();

    ctx.save();
    roundRectPath(ctx, x, y, size, size, r);
    ctx.clip();

    var gloss = ctx.createLinearGradient(x, y, x, y + size * 0.62);
    gloss.addColorStop(0, 'rgba(255,255,255,0.46)');
    gloss.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = gloss;
    ctx.fillRect(x, y, size, size * 0.62);

    ctx.fillStyle = 'rgba(255,255,255,0.28)';
    roundRectPath(ctx, x + 3, y + 3, size - 6, 7, 3.5);
    ctx.fill();

    ctx.fillStyle = 'rgba(42,35,68,0.12)';
    ctx.fillRect(x, y + size * 0.78, size, size * 0.22);
    ctx.fillStyle = 'rgba(255,255,255,0.12)';
    ctx.fillRect(x + 2.4, y + 8, 1.4, size - 16);

    if (brick.type === 'obstacle') drawStripes(x, y, size);
    if (brick.type === 'hard') drawCracks(x, y, size, brick.hp);
    if (brick.type === 'reward') drawReward(x, y, size);

    ctx.restore();

    roundRectPath(ctx, x, y, size, size, r);
    ctx.strokeStyle = 'rgba(42,35,68,0.32)';
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.beginPath();
    ctx.ellipse(x + size * 0.25, y + size * 0.21, 2.3, 1.35, -0.2, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255,255,255,0.78)';
    ctx.fill();

    if (brick.type === 'hard') {
      ctx.fillStyle = 'rgba(42,35,68,0.58)';
      for (var i = 0; i < brick.hp; i += 1) {
        ctx.beginPath();
        ctx.arc(x + 6 + i * 5, y + size - 5.5, 1.35, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  function drawCracks(x, y, size, hp) {
    ctx.strokeStyle = 'rgba(42,35,68,0.56)';
    ctx.lineWidth = 1.5;
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(x + size * 0.54, y + size * 0.16);
    ctx.lineTo(x + size * 0.47, y + size * 0.42);
    ctx.lineTo(x + size * 0.59, y + size * 0.56);
    ctx.lineTo(x + size * 0.51, y + size * 0.84);
    ctx.stroke();
    if (hp >= 3) {
      ctx.beginPath();
      ctx.moveTo(x + size * 0.22, y + size * 0.30);
      ctx.lineTo(x + size * 0.36, y + size * 0.52);
      ctx.lineTo(x + size * 0.28, y + size * 0.72);
      ctx.stroke();
    }
  }

  function drawStripes(x, y, size) {
    ctx.strokeStyle = 'rgba(255,255,255,0.30)';
    ctx.lineWidth = 3;
    for (var i = -size; i < size * 2; i += 9) {
      ctx.beginPath();
      ctx.moveTo(x + i, y + size);
      ctx.lineTo(x + i + size, y);
      ctx.stroke();
    }
  }

  function drawReward(x, y, size) {
    var cx = x + size / 2;
    var cy = y + size / 2;
    ctx.beginPath();
    ctx.moveTo(cx, cy - 8);
    ctx.lineTo(cx + 8, cy);
    ctx.lineTo(cx, cy + 8);
    ctx.lineTo(cx - 8, cy);
    ctx.closePath();
    ctx.fillStyle = 'rgba(255,255,255,0.96)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(42,35,68,0.32)';
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.strokeStyle = 'rgba(255,255,255,0.92)';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(x + size - 10, y + 7);
    ctx.lineTo(x + size - 10, y + 12);
    ctx.moveTo(x + size - 12.5, y + 9.5);
    ctx.lineTo(x + size - 7.5, y + 9.5);
    ctx.stroke();
  }

  function drawGrid(boardX) {
    ctx.save();
    ctx.strokeStyle = 'rgba(91,75,196,0.30)';
    ctx.lineWidth = 0.6;
    for (var col = 0; col <= SPEC.cols; col += 1) {
      var x = boardX + col * SPEC.cell;
      ctx.beginPath();
      ctx.moveTo(x, SPEC.boardTop);
      ctx.lineTo(x, SPEC.boardTop + SPEC.boardH);
      ctx.stroke();
    }
    for (var row = 0; row <= SPEC.rows; row += 1) {
      var y = SPEC.boardTop + row * SPEC.cell;
      ctx.beginPath();
      ctx.moveTo(boardX, y);
      ctx.lineTo(boardX + SPEC.boardW, y);
      ctx.stroke();
    }
    ctx.restore();

    ctx.fillStyle = PALETTE[2];
    ctx.font = '600 16px "PingFang SC", "Microsoft YaHei", sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
    ctx.fillText('GRID 21 × 28 · cell 34 · board 714 × 952', boardX, SPEC.boardTop - 8);
  }

  function drawLegend() {
    var items = [
      { type: 'normal', color: 5, hp: 1, label: '普通 · 1 击' },
      { type: 'hard', color: 7, hp: 2, label: '硬砖 · 裂纹 + hp' },
      { type: 'obstacle', color: 2, hp: Infinity, label: '障碍 · 斜纹' },
      { type: 'reward', color: 9, hp: 1, label: '奖励 · 菱形' },
    ];
    var size = SPEC.cell - SPEC.inset * 2;
    var startX = 54;
    var gap = 172;

    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
    ctx.fillStyle = PALETTE[2];
    ctx.font = '700 22px "PingFang SC", "Microsoft YaHei", sans-serif';
    ctx.fillText('砖块四态 · 颜色 + 冗余编码', 40, SPEC.legendTop - 24);

    for (var i = 0; i < items.length; i += 1) {
      var x = startX + i * gap;
      drawBrick(x, SPEC.legendTop, size, items[i]);
      ctx.fillStyle = 'rgba(42,35,68,0.76)';
      ctx.font = '500 18px "PingFang SC", "Microsoft YaHei", sans-serif';
      ctx.fillText(items[i].label, x - 2, SPEC.legendTop + size + 28);
    }
  }

  function resize() {
    winW = window.innerWidth;
    winH = window.innerHeight;
    dpr = window.devicePixelRatio || 1;
    stage.width = Math.round(winW * dpr);
    stage.height = Math.round(winH * dpr);
    stage.style.width = winW + 'px';
    stage.style.height = winH + 'px';
    draw();
  }

  window.addEventListener('resize', resize);
  window.addEventListener('keydown', function (event) {
    if (event.key === 'g' || event.key === 'G') {
      gridOn = !gridOn;
      draw();
    }
    if (event.key === 'h' || event.key === 'H') {
      specPanel.open = !specPanel.open;
    }
  });

  resize();
})();
