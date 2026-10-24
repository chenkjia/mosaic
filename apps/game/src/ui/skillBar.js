import { BALL, SKILL, SKILL_IDS, skillMultiplier } from '@mosaic/shared';
import { roundRectPath } from '../gfx/roundRect.js';
import { C, FONT, SKILL_META } from './theme.js';

export function drawSkillIcon(ctx, skill, cx, cy, color) {
  ctx.fillStyle = color;
  ctx.strokeStyle = color;
  ctx.lineWidth = 2.4;
  ctx.lineCap = 'round';
  if (skill === 'bigBall') {
    ctx.beginPath();
    ctx.arc(cx, cy + 1, 11, 0, Math.PI * 2);
    ctx.fill();
    ctx.save();
    ctx.globalAlpha = 0.55;
    ctx.lineWidth = 2.6;
    ctx.beginPath();
    ctx.arc(cx, cy + 1, 16.5, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
    ctx.beginPath();
    ctx.arc(cx - 3.6, cy - 3.2, 3.2, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255,255,255,0.72)';
    ctx.fill();
  } else if (skill === 'widePaddle') {
    roundRectPath(ctx, cx - 17, cy - 4, 34, 9, 4.5);
    ctx.fill();
    ctx.globalAlpha = 0.55;
    roundRectPath(ctx, cx - 10, cy + 8, 20, 5, 2.5);
    ctx.fill();
    ctx.globalAlpha = 1;
  } else if (skill === 'split') {
    ctx.beginPath();
    ctx.arc(cx, cy - 6, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(cx - 11, cy + 9, 4.6, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(cx + 11, cy + 9, 4.6, 0, Math.PI * 2);
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(cx - 3.5, cy - 1);
    ctx.lineTo(cx - 8, cy + 3.5);
    ctx.moveTo(cx + 3.5, cy - 1);
    ctx.lineTo(cx + 8, cy + 3.5);
    ctx.stroke();
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

function drawPlayGlyph(ctx, cx, cy, color) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(cx - 4, cy - 6);
  ctx.lineTo(cx + 6, cy);
  ctx.lineTo(cx - 4, cy + 6);
  ctx.closePath();
  ctx.fill();
}

function drawStatusPill(ctx, rect, fill, color, label, showPlay) {
  const w = showPlay ? 100 : 96;
  const h = 24;
  const x = rect.x + (rect.w - w) / 2;
  const y = rect.y + 82;
  ctx.fillStyle = fill;
  roundRectPath(ctx, x, y, w, h, h / 2);
  ctx.fill();

  ctx.fillStyle = color;
  ctx.font = FONT.tinyBold;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  if (showPlay) {
    drawPlayGlyph(ctx, x + 22, y + h / 2, color);
    ctx.fillText(label, x + 58, y + h / 2 + 1);
  } else {
    ctx.fillText(label, x + w / 2, y + h / 2 + 1);
  }
}

export function formatMultiplier(value) {
  return '×' + (Math.round(value * 100) / 100).toFixed(2).replace(/0$/, '');
}

function drawMultiplier(ctx, rect, value) {
  const w = 58;
  const h = 24;
  const x = rect.x + rect.w - w - 8;
  const y = rect.y + 8;
  ctx.fillStyle = 'rgba(42,35,68,0.58)';
  roundRectPath(ctx, x, y, w, h, h / 2);
  ctx.fill();
  ctx.fillStyle = C.white;
  ctx.font = FONT.tinyBold;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(formatMultiplier(value), x + w / 2, y + h / 2 + 1);
}

function slotState(sim, skill) {
  if (skill === 'bigBall') return sim.bigBall ? 'full' : 'ready';
  if (skill === 'widePaddle') {
    return sim.skillStacks.widePaddle >= SKILL.wideMaxStacks ? 'full' : 'ready';
  }
  if (skill === 'slow') {
    return sim.skillStacks.slow >= SKILL.slowMaxStacks ? 'full' : 'ready';
  }
  if (sim.balls.length >= BALL.cap) return 'full';
  if (skill === 'split' && !sim.balls.some((ball) => !ball.docked)) return 'noTarget';
  return 'ready';
}

export function drawSkillBar(ctx, layout, sim, now) {
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  for (let i = 0; i < layout.skill.slots.length; i += 1) {
    const rect = layout.skill.slots[i];
    const skill = SKILL_IDS[i];
    const meta = SKILL_META[skill];
    const state = slotState(sim, skill);
    const ready = state === 'ready';

    ctx.fillStyle = ready ? meta.color : 'rgba(255,255,255,0.64)';
    roundRectPath(ctx, rect.x, rect.y, rect.w, rect.h, 20);
    ctx.fill();

    if (ready) {
      ctx.save();
      roundRectPath(ctx, rect.x, rect.y, rect.w, rect.h, 20);
      ctx.clip();
      ctx.fillStyle = 'rgba(255,255,255,0.20)';
      ctx.fillRect(rect.x, rect.y, rect.w, rect.h * 0.46);
      ctx.restore();
    }

    ctx.strokeStyle = ready ? 'rgba(255,255,255,0.40)' : 'rgba(91,75,196,0.22)';
    ctx.lineWidth = 1.4;
    roundRectPath(ctx, rect.x, rect.y, rect.w, rect.h, 20);
    ctx.stroke();

    const cx = rect.x + rect.w / 2;
    ctx.save();
    if (!ready) ctx.globalAlpha = 0.58;
    ctx.translate(cx, rect.y + 32);
    ctx.scale(1.22, 1.22);
    drawSkillIcon(ctx, skill, 0, 0, ready ? C.white : meta.color);
    ctx.restore();

    ctx.fillStyle = ready ? C.white : C.muted;
    ctx.font = FONT.h3;
    ctx.fillText(meta.label, cx, rect.y + 66);

    if (ready) {
      const pulse = 0.78 + 0.22 * Math.sin(now / 380);
      ctx.save();
      ctx.globalAlpha = pulse;
      drawStatusPill(ctx, rect, 'rgba(255,255,255,0.22)', C.white, '看广告', true);
      ctx.restore();
      const stacked = skill === 'widePaddle' || skill === 'slow';
      if (stacked && sim.skillStacks[skill] > 0) {
        drawMultiplier(ctx, rect, skillMultiplier(sim, skill));
      }
    } else {
      drawStatusPill(ctx, rect, 'rgba(91,75,196,0.10)', C.primary, state === 'full' ? '已满' : '无目标', false);
    }
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
