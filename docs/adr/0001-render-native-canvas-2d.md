# 渲染使用原生 Canvas 2D

Mosaic 的画面由几何图形、文字与静态位图组成，微信/抖音小游戏运行时均原生支持 Canvas 2D，因此不引入 PixiJS、Cocos 或 WebGL 渲染引擎，业务绘制全部走 `CanvasRenderingContext2D`，性能靠 bitmap-cache 与零分配帧循环保障。这样主包不背引擎体积、三端行为一致，也沿用模板已验证的真机坑规避经验（`docs/skills/canvas-minigame.md`）。

考虑过的替代方案：PixiJS（带来约 400KB+ 体积与额外调试面）、WebGL 自绘（真机兼容与着色器成本不划算）、Cocos Creator（重工具链，与纯 JS + esbuild 的工作流冲突）。

后果：没有现成的滤镜与批量渲染，`ctx.filter` 在小游戏不可用，宝石质感必须在 `gfx/drawGemBrick` 内手工合成；静态砖块层必须缓存为离屏位图，不能每帧重画。

关联：REQ-001；实现约束见根 [AGENTS.md](../../AGENTS.md)「技术边界」。
