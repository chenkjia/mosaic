import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const GAME_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (rel) => readFileSync(path.join(GAME_DIR, rel), 'utf8');

test('微信/抖音单包清单：竖屏且无分包字段', () => {
  for (const name of ['wechat', 'douyin']) {
    const manifest = JSON.parse(read('templates/' + name + '/game.json'));
    assert.equal(manifest.deviceOrientation, 'portrait');
    assert.equal(manifest.subpackages, undefined);
    assert.equal(manifest.subPackages, undefined);
  }
});

test('小游戏入口静态引用游戏代码，产物只有单包 game.js', () => {
  for (const name of ['wechat', 'douyin']) {
    const entry = read('src/entries/' + name + '.js');
    assert.ok(entry.includes("from '../game/index.js'"), name + ' entry 应静态 import 游戏代码');
    assert.ok(entry.includes('createGameApp'));
    assert.ok(!entry.includes('loadSubpackage'), name + ' entry 不应加载分包');
  }
});

test('web 调试页挂载主画布与构建产物', () => {
  const html = read('templates/web/index.html');
  assert.ok(html.includes('<canvas id="game">'));
  assert.ok(html.includes('src="main.js"'));
});
