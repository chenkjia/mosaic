import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const GAME_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (rel) => readFileSync(path.join(GAME_DIR, rel), 'utf8');

test('微信/抖音分包字段大小写与官方一致', () => {
  const wechat = JSON.parse(read('templates/wechat/game.json'));
  assert.ok(Array.isArray(wechat.subpackages));
  assert.equal(wechat.subPackages, undefined);
  assert.deepEqual(wechat.subpackages[0], { name: 'pkgGame', root: 'pkg-game/' });

  const douyin = JSON.parse(read('templates/douyin/game.json'));
  assert.ok(Array.isArray(douyin.subPackages));
  assert.equal(douyin.subpackages, undefined);
  assert.deepEqual(douyin.subPackages[0], { name: 'pkgGame', root: 'pkg-game/' });
});

test('主包入口不静态引用游戏分包代码', () => {
  for (const name of ['wechat', 'douyin']) {
    const entry = read('src/entries/' + name + '.js');
    assert.ok(!entry.includes("from '../game/"), name + ' entry 不应 import 游戏代码');
    assert.ok(entry.includes("./pkg-game/index.js"), name + ' entry 应运行时 require 分包');
  }
  assert.ok(read('src/entries/pkg-game.js').includes('createGameApp'));
});

test('web 调试页挂载主画布与构建产物', () => {
  const html = read('templates/web/index.html');
  assert.ok(html.includes('<canvas id="game">'));
  assert.ok(html.includes('src="main.js"'));
});
