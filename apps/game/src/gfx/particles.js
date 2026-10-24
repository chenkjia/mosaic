const CAPACITY = 180;

export function createParticles() {
  const items = new Array(CAPACITY);
  for (let i = 0; i < CAPACITY; i += 1) {
    items[i] = { life: 0, max: 1, x: 0, y: 0, vx: 0, vy: 0, size: 2, color: '#FFFFFF' };
  }
  let cursor = 0;
  let seed = 0x9E3779B9;

  function next() {
    seed ^= seed << 13;
    seed >>>= 0;
    seed ^= seed >>> 17;
    seed ^= seed << 5;
    seed >>>= 0;
    return seed / 4294967296;
  }

  function spawn(x, y, color, count, power) {
    if (!Number.isFinite(x) || !Number.isFinite(y)) return;
    const n = Math.min(count || 4, CAPACITY);
    const force = power == null ? 1 : power;
    for (let i = 0; i < n; i += 1) {
      const p = items[cursor];
      cursor = (cursor + 1) % CAPACITY;
      const angle = next() * Math.PI * 2;
      const speed = (40 + next() * 150) * force;
      p.x = x;
      p.y = y;
      p.vx = Math.cos(angle) * speed;
      p.vy = Math.sin(angle) * speed - 30 * force;
      p.size = 2 + next() * 3.5;
      p.max = 0.35 + next() * 0.35;
      p.life = p.max;
      p.color = color || '#FFFFFF';
    }
  }

  function rain(x, y, color, count) {
    if (!Number.isFinite(x) || !Number.isFinite(y)) return;
    const n = Math.min(count || 2, CAPACITY);
    for (let i = 0; i < n; i += 1) {
      const p = items[cursor];
      cursor = (cursor + 1) % CAPACITY;
      p.x = x + (next() - 0.5) * 36;
      p.y = y + (next() - 0.5) * 10;
      p.vx = (next() - 0.5) * 140;
      p.vy = 200 + next() * 200;
      p.size = 4 + next() * 4.5;
      p.max = 1.1 + next() * 0.5;
      p.life = p.max;
      p.color = color || '#FFFFFF';
    }
  }

  function update(dt) {
    for (let i = 0; i < CAPACITY; i += 1) {
      const p = items[i];
      if (p.life <= 0) continue;
      p.life -= dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += 480 * dt;
      p.vx *= 0.98;
    }
  }

  function draw(ctx) {
    ctx.save();
    for (let i = 0; i < CAPACITY; i += 1) {
      const p = items[i];
      if (p.life <= 0) continue;
      ctx.globalAlpha = Math.max(0, p.life / p.max);
      ctx.fillStyle = p.color;
      ctx.fillRect(p.x, p.y, p.size, p.size);
    }
    ctx.restore();
  }

  function reset() {
    for (let i = 0; i < CAPACITY; i += 1) items[i].life = 0;
  }

  return { spawn, rain, update, draw, reset };
}
