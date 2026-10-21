# 微信/抖音单包交付

微信与抖音小游戏不声明 `subpackages` / `subPackages`，游戏代码与全部图片资源打进同一个主包，启动时一次加载。

立项时曾按「主包只含 boot + loading、游戏进 `pkg-game/` 分包」实现。用户在微信开发者工具导入产物时报 `未找到 ["subpackages"][0]["root"] 对应的 /pkg-game/game.js`：分包根目录必须自带 `game.js`，而构建只输出了 `pkg-game/index.js`。当时包体仅 0.44MB，远低于小游戏单包 4MB 上限，分包没有收益，却引入分包布局、异步加载、分享路径前缀与清单大小写等一系列校验成本。

考虑过的替代方案：在 `pkg-game/` 内补 `game.js` 修正分包布局；或保留分包等资源变大再拆。选择单包是因为当前体积无压力，且单包让启动、资源路径、构建与 smoke 校验都更简单。

后果：资源继续增长时需重新评估分包或 CDN（先做图集压缩与裁图）；分享封面等资源路径统一为包根相对路径；`verify:dist` 断言 `game.json` 无分包字段、产物不得出现 `pkg-game/`。

关联：REQ-001；背景见 `.scratch/mosaic-core/issues/01-scaffold-build-adapters.md`「后续变更」；工程细则见 `apps/game/AGENTS.md`「单包架构」。
