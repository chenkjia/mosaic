#!/usr/bin/env node
import { build } from 'esbuild';
import {
  cpSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync,
} from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const GAME_DIR = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const ROOT = path.resolve(GAME_DIR, '../..');
const SRC = path.join(GAME_DIR, 'src');
const TEMPLATES = path.join(GAME_DIR, 'templates');
const ASSETS = path.join(GAME_DIR, 'assets');
const MB = 1024 * 1024;

const pkg = JSON.parse(readFileSync(path.join(GAME_DIR, 'package.json'), 'utf8'));

const TARGETS = {
  web: { kind: 'web', entry: 'entries/web.js', outfile: 'main.js' },
  wechat: { kind: 'minigame', entry: 'entries/wechat.js', outfile: 'game.js' },
  douyin: { kind: 'minigame', entry: 'entries/douyin.js', outfile: 'game.js' },
};

function parseTarget() {
  const argv = process.argv.slice(2);
  let target = 'all';
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] === '--target' && argv[i + 1]) target = argv[i + 1];
    if (argv[i].startsWith('--target=')) target = argv[i].slice('--target='.length);
  }
  if (target !== 'all' && !TARGETS[target]) {
    console.error('未知 target: ' + target + '（可选 web|wechat|douyin|all）');
    process.exit(1);
  }
  return target;
}

function dirSize(p) {
  const st = statSync(p);
  if (st.isFile()) return st.size;
  return readdirSync(p).reduce((sum, name) => sum + dirSize(path.join(p, name)), 0);
}

function toMb(bytes) {
  return (bytes / MB).toFixed(2);
}

async function bundle({ entry, outfile, format, outDir }) {
  await build({
    entryPoints: [path.join(SRC, entry)],
    bundle: true,
    format,
    platform: 'browser',
    target: ['es2018'],
    minify: false,
    outfile: path.join(outDir, outfile),
    define: { __APP_VERSION__: JSON.stringify(pkg.version) },
    logLevel: 'warning',
  });
}

function copyTemplates(name, outDir) {
  const dir = path.join(TEMPLATES, name);
  if (existsSync(dir)) cpSync(dir, outDir, { recursive: true });
}

function copyAssets(outDir) {
  if (existsSync(ASSETS)) cpSync(ASSETS, path.join(outDir, 'assets'), { recursive: true });
}

function stampWebHtml(outDir) {
  const index = path.join(outDir, 'index.html');
  if (!existsSync(index)) return;
  let html = readFileSync(index, 'utf8');
  html = html.replace(/(<script src=")(main\.js)(")/, `$1$2?v=${Date.now()}$3`);
  if (!/http-equiv="Cache-Control"/.test(html)) {
    html = html.replace('</head>', '<meta http-equiv="Cache-Control" content="no-cache, no-store, must-revalidate">\n</head>');
  }
  writeFileSync(index, html);
}

async function buildWeb(outDir) {
  const cfg = TARGETS.web;
  await bundle({ entry: cfg.entry, outfile: cfg.outfile, format: 'iife', outDir });
  copyTemplates('web', outDir);
  copyAssets(outDir);
  stampWebHtml(outDir);
  console.log('[build] web OK  合计 ' + toMb(dirSize(outDir)) + 'MB');
}

async function buildMinigame(name, outDir) {
  const cfg = TARGETS[name];
  await bundle({ entry: cfg.entry, outfile: cfg.outfile, format: 'iife', outDir });
  copyTemplates(name, outDir);
  copyAssets(outDir);

  const totalSize = dirSize(outDir);
  const warn = [];
  if (totalSize > 2 * MB) warn.push('包体超过 2MB 预警线（微信单包上限 4MB / 抖音 4MB）');
  if (totalSize > 18 * MB) warn.push('包体超过 18MB 预警线（微信上限 30MB / 抖音上限 20MB）');

  console.log('[build] ' + name + ' OK  合计 ' + toMb(totalSize) + 'MB');
  for (const line of warn) console.log('  [WARN] ' + line);
}

async function buildTarget(name) {
  const outDir = path.join(ROOT, 'dist', name);
  rmSync(outDir, { recursive: true, force: true });
  mkdirSync(outDir, { recursive: true });
  if (TARGETS[name].kind === 'web') {
    await buildWeb(outDir);
  } else {
    await buildMinigame(name, outDir);
  }
}

const target = parseTarget();
const names = target === 'all' ? Object.keys(TARGETS) : [target];
for (const name of names) await buildTarget(name);
console.log('[build] 完成: ' + names.join(', '));
