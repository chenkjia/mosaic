#!/usr/bin/env node
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DIST = path.join(ROOT, 'dist');
const MB = 1024 * 1024;
const MINIGAMES = ['wechat', 'douyin'];
const VERSION = JSON.parse(
  readFileSync(path.join(ROOT, 'apps/game/package.json'), 'utf8'),
).version;

const failures = [];
const notes = [];

function fail(msg) {
  failures.push(msg);
}

function read(file) {
  return readFileSync(file, 'utf8');
}

function dirSize(p) {
  const st = statSync(p);
  if (st.isFile()) return st.size;
  return readdirSync(p).reduce((sum, name) => sum + dirSize(path.join(p, name)), 0);
}

function walk(dir) {
  return readdirSync(dir).flatMap((name) => {
    const p = path.join(dir, name);
    return statSync(p).isDirectory() ? walk(p) : [p];
  });
}

function listText(dir) {
  return walk(dir).filter((p) => /\.(js|json|html)$/.test(p));
}

function expectFile(file, label) {
  if (!existsSync(file)) fail(label + '缺失: ' + path.relative(ROOT, file));
  else if (statSync(file).size === 0) fail(label + '为空: ' + path.relative(ROOT, file));
}

function checkSize(name, dir) {
  const total = dirSize(dir);
  const totalMb = (total / MB).toFixed(2);
  let main = total;
  let pkg = 0;
  if (name !== 'web') {
    const pkgDir = path.join(dir, 'pkg-game');
    if (existsSync(pkgDir)) pkg = dirSize(pkgDir);
    main = total - pkg;
    if (main > 2 * MB) fail(name + ' 主包 ' + (main / MB).toFixed(2) + 'MB 超过 2MB 预警线');
    if (total > 18 * MB) fail(name + ' 总包 ' + totalMb + 'MB 超过 18MB 预警线');
    notes.push(name + ': 主包 ' + (main / MB).toFixed(2) + 'MB / 分包 ' + (pkg / MB).toFixed(2) + 'MB / 总包 ' + totalMb + 'MB');
  } else {
    notes.push(name + ': 总包 ' + totalMb + 'MB');
  }
}

function checkWeb() {
  const dir = path.join(DIST, 'web');
  if (!existsSync(dir)) {
    fail('dist/web 不存在（先执行 pnpm build）');
    return;
  }
  const html = path.join(dir, 'index.html');
  const main = path.join(dir, 'main.js');
  expectFile(html, 'web index.html ');
  expectFile(main, 'web main.js ');
  expectFile(path.join(dir, 'assets/share/cover.png'), 'web 分享封面 ');

  if (existsSync(main)) {
    const js = read(main);
    if (!js.includes('__MOSAIC_DEBUG__')) fail('web main.js 缺少调试探针 __MOSAIC_DEBUG__');
    if (!js.includes(VERSION)) fail('web main.js 未注入版本号 ' + VERSION);
    if (!js.includes('[game] boot ')) fail('web main.js 缺少启动标记日志 [game] boot');
  }
  if (existsSync(html)) {
    const doc = read(html);
    if (!/main\.js\?v=\d+/.test(doc)) fail('web index.html 缺少 main.js 缓存击穿参数');
    if (!doc.includes('<canvas id="game">')) fail('web index.html 缺少游戏画布');
  }
  checkSize('web', dir);
}

function checkMinigame(name) {
  const dir = path.join(DIST, name);
  if (!existsSync(dir)) {
    fail('dist/' + name + ' 不存在（先执行 pnpm build）');
    return;
  }
  const boot = path.join(dir, 'game.js');
  const manifest = path.join(dir, 'game.json');
  const pkgDir = path.join(dir, 'pkg-game');
  const pkg = path.join(pkgDir, 'index.js');
  expectFile(boot, name + ' game.js ');
  expectFile(manifest, name + ' game.json ');
  expectFile(pkg, name + ' pkg-game/index.js ');
  expectFile(path.join(pkgDir, 'assets/share/cover.png'), name + ' 分享封面 ');

  if (existsSync(manifest)) {
    let json;
    try {
      json = JSON.parse(read(manifest));
    } catch (err) {
      fail(name + ' game.json 非法 JSON: ' + err.message);
    }
    if (json) {
      const subs = json.subpackages || json.subPackages || [];
      if (!subs.some((s) => s.root === 'pkg-game/')) fail(name + ' game.json 缺少 pkg-game 分包配置');
      if (json.deviceOrientation !== 'portrait') fail(name + ' game.json 未声明竖屏 deviceOrientation');
    }
  }

  for (const file of listText(dir)) {
    const js = read(file);
    const rel = path.relative(ROOT, file);
    if (js.includes('__MOSAIC_DEBUG__')) fail(rel + ' 含调试探针 __MOSAIC_DEBUG__（不得进入小游戏包）');
    if (file.endsWith('.js') && !js.includes(VERSION)) fail(rel + ' 未注入版本号 ' + VERSION);
  }
  if (existsSync(boot) && !read(boot).includes('[game] boot ')) {
    fail(name + ' game.js 缺少启动标记日志 [game] boot');
  }

  if (existsSync(pkg)) {
    const js = read(pkg);
    const hits = js.match(/\b(window|document|wx|tt)\./g) || [];
    if (hits.length) fail(name + ' pkg-game/index.js 直接引用平台全局: ' + [...new Set(hits)].join(', '));
  }
  checkSize(name, dir);
}

for (const name of ['web', ...MINIGAMES]) {
  if (name === 'web') checkWeb();
  else checkMinigame(name);
}

for (const line of notes) console.log('  ' + line);
if (failures.length) {
  console.error('\n[verify-dist] FAIL');
  for (const line of failures) console.error('  - ' + line);
  process.exit(1);
}
console.log('\n[verify-dist] OK  web / wechat / douyin');
