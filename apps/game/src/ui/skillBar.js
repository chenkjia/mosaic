import { SLOT_EXPAND_COSTS } from '@mosaic/shared';
import { roundRectPath } from '../gfx/roundRect.js';
import { C, EFFECT_META, FONT, SKILL_META } from './theme.js';

function drawIcon(ctx, skill, cx, cy, color) {
  ctx.fillStyle = color;
  ctx.strokeStyle = color;
  ctx.lineWidth = 2.4;
  ctx.lineCap = 'round';
  if (skill === 'multiBall') {
    const points = [[0, -9], [-10, 7], [10, 7]];
    for (let i = 0; i < points.length; i += 1) {
      ctx.beginPath();
      ctx.arc(cx + points[i][0], cy + points[i][1], 5.4, 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (skill === 'widePaddle') {
    roundRectPath(ctx, cx - 17, cy - 4, 34, 9, 4.5);
    ctx.fill();
    ctx.globalAlpha = 0.55;
    roundRectPath(ctx, cx - 10, cy + 8, 20, 5, 2.5);
    ctx.fill();
    ctx.globalAlpha = 1;
  } else if (skill === 'laser') {
    ctx.beginPath();
    ctx.moveTo(cx, cy + 13);
    ctx.lineTo(cx, cy - 6);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(cx - 8, cy - 13);
    ctx.lineTo(cx, cy - 4);
    ctx.lineTo(cx + 8, cy - 13);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(cx, cy + 15, 2.4, 0, Math.PI * 2);
    ctx.fill();
  } else if (skill === 'slow') {
    for (let i = 0; i < 3; i += 1) {
      const angle = (i * Math.PI) / 3;
      const dx = Math.cos(angle) * 14;
      const dy = Math.sin(angle) * 14;
      ctx.beginPath();
      ctx.moveTo(cx - dx, cy - dy);
      ctx.lineTo(cx + dx, cy + dy);
      ctx.stroke();
    }
    ctx.beginPath();
    ctx.arc(cx, cy, 6, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawLock(ctx, cx, cy) {
  ctx.strokeStyle = C.soft;
  ctx.fillStyle = C.soft;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(cx, cy - 4, 7, Math.PI, 0);
  ctx.stroke();
  roundRectPath(ctx, cx - 10, cy - 3, 20, 15, 4);
  ctx.fill();
}

export function drawSkillBar(ctx, layout, sim, now) {
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  for (let i = 0; i < layout.skill.slots.length; i += 1) {
    const rect = layout.skill.slots[i];
    const filled = i < sim.slotCapacity ? sim.slots[i] : null;
    const locked = i >= sim.slotCapacity;

    if (locked) {
      ctx.fillStyle = 'rgba(255,255,255,0.38)';
    } else if (filled) {
      ctx.fillStyle = SKILL_META[filled].color;
    } else {
      ctx.fillStyle = 'rgba(255,255,255,0.60)';
    }
    roundRectPath(ctx, rect.x, rect.y, rect.w, rect.h, 20);
    ctx.fill();

    if (filled) {
      ctx.save();
      roundRectPath(ctx, rect.x, rect.y, rect.w, rect.h, 20);
      ctx.clip();
      ctx.fillStyle = 'rgba(255,255,255,0.22)';
      ctx.fillRect(rect.x, rect.y, rect.w, rect.h * 0.46);
      ctx.restore();
    }

    ctx.strokeStyle = filled
      ? 'rgba(255,255,255,0.36)'
      : locked ? 'rgba(91,75,196,0.12)' : 'rgba(91,75,196,0.20)';
    ctx.lineWidth = 1.4;
    roundRectPath(ctx, rect.x, rect.y, rect.w, rect.h, 20);
    ctx.stroke();

    if (locked) {
      drawLock(ctx, rect.x + rect.w / 2, rect.y + 30);
      ctx.fillStyle = C.soft;
      ctx.font = FONT.slot;
      const cost = SLOT_EXPAND_COSTS[i] || 0;
      ctx.fillText(cost > 0 ? cost + ' 金币' : '未解锁', rect.x + rect.w / 2, rect.y + 64);
    } else if (filled) {
      const meta = SKILL_META[filled];
      drawIcon(ctx, filled, rect.x + rect.w / 2, rect.y + 30, C.white);
      ctx.fillStyle = 'rgba(255,255,255,0.96)';
      ctx.font = FONT.slot;
      ctx.fillText(meta.label, rect.x + rect.w / 2, rect.y + 64);
    } else {
      ctx.fillStyle = C.soft;
      ctx.font = FONT.numberSmall;
      ctx.fillText('+', rect.x + rect.w / 2, rect.y + 33);
      ctx.font = FONT.tiny;
      ctx.fillText('空槽', rect.x + rect.w / 2, rect.y + 62);
    }
  }

  const active = [];
  if (sim.time < sim.effects.wideUntil) {
    active.push({ key: 'wide', remain: sim.effects.wideUntil - sim.time });
  }
  if (sim.time < sim.effects.laserUntil) {
    active.push({ key: 'laser', remain: sim.effects.laserUntil - sim.time });
  }
  if (sim.time < sim.effects.slowUntil) {
    active.push({ key: 'slow', remain: sim.effects.slowUntil - sim.time });
  }
  if (active.length === 0) return;

  const chipW = 150;
  const chipH = 30;
  const gap = 10;
  const totalW = active.length * chipW + (active.length - 1) * gap;
  let x = (750 - totalW) / 2;
  const y = layout.effectY;
  for (let i = 0; i < active.length; i += 1) {
    const meta = EFFECT_META[active[i].key];
    ctx.fillStyle = meta.color;
    roundRectPath(ctx, x, y, chipW, chipH, chipH / 2);
    ctx.fill();
    ctx.fillStyle = C.white;
    ctx.font = FONT.tinyBold;
    ctx.fillText(meta.label + ' ' + Math.ceil(active[i].remain) + 's', x + chipW / 2, y + chipH / 2 + 1);
    x += chipW + gap;
  }
}

export function hitSkill(layout, x, y) {
  for (let i = 0; i < layout.skill.slots.length; i += 1) {
    const rect = layout.skill.slots[i];
    if (x >= rect.x && x <= rect.x + rect.w && y >= rect.y && y <= rect.y + rect.h) {
      return i;
    }
  }
  return -1;
}
