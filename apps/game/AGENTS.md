# apps/game/AGENTS.md - 游戏端规范

> 就近规范，优先级高于根 AGENTS.md。未覆盖项以根规范为准。适用范围：`apps/game/`。

## 职责边界

- 负责画面、界面、玩家输入、音频、局内流程，以及服务端结算结果的播放。
- UI 只消费 `packages/shared/` 的事件与结算，不私自分叉规则。
- 仅在游戏端使用原生 Canvas 2D 与小游戏平台 API，避免将其引入共享包。

## 渲染代码前置阅读

写渲染、绘制或平台适配代码前先读两份文档：

- [`docs/skills/canvas-minigame.md`](../../docs/skills/canvas-minigame.md) —— 平台行为坑：物理分辨率、DPR 来源、真机静默失效 API、NaN 坐标。管「平台行为」。
- [`docs/skills/canvas-drawing.md`](../../docs/skills/canvas-drawing.md) —— 代码组织与性能硬约束：规格表、原语提取、帧循环零分配、位图缓存。管「代码组织 + 性能」，规则为硬约束，违反即 bug。

## 分层与目录

- `src/platform/`：三端 adapter（web/微信/抖音）。平台差异只允许出现在这里；构建期多入口、`loadSubpackage` 等平台能力封装收拢于此。
- `src/gfx/`：绘制原语层（圆角路径、渐变、离屏 canvas、bitmap-cache）。只做「怎么画」，不知道「画什么」。
- `src/ui/`：组件层。每个组件自带规格表，负责「画什么」。
- 场景/业务层：组合层，只调用 ui/gfx，不直接写 ctx 样式细节。
- 业务层永远在 750 设计坐标系绘制，platform 层 fit 缩放；触摸换算读画布实际尺寸。

## 分包架构

- 主包仅 boot + loading（纯代码零图片）；游戏主 bundle 与全部位图进分包（微信 `subpackages` 全小写 / 抖音 `subPackages` 驼峰，字段大小写不同）。
- 主包启动时经 `platform.loadSubpackage` 下载分包后 require 其 cjs bundle；web 端实现为「直接就绪」，loading 时间下限保行为一致。
- 资源路径前缀在 adapter 内部拼接，资源注册表零感知。
- 构建输出大小检查三行：主包 / 分包 / 总包。主包 2MB 预警、总包 18MB 预警（微信上限 30MB / 抖音上限 20MB）。

## 编码要求

- 强制边界判断与异常捕获，禁止隐式全局变量；异步统一 async/await。
- 资源路径经统一注册表引用，禁止硬编码；资源命名与图集要求见 `assets/art/AGENTS.md`。
- 数据 JSON 经 esbuild import 打进 bundle（小游戏无本地 fetch）；位图经 `platform.loadImage` 加载。
- 调试探针只挂 web entry（按 import 图在真机构建中天然剔除）；用 smoke 断言产物 grep 无探针符号，防泄漏进真机包。

## 已知坑（踩坑集）

> 持续维护：新增踩坑回写此处，格式：现象 → 根因 → 方案 → 验证方式。真机 API 行为坑沉淀在 `docs/skills/canvas-minigame.md`，此处只收工程坑。

- 弹窗触摸穿透：弹窗打开后底层仍响应点击 → 全局交互阻断开关，弹窗打开拦截底层交互，关闭恢复。
- 滚动手势冲突：滚动容器内按钮阻断列表滚动 → 按钮只拦截 tap 点击，不阻断 pointerdown。
- 对象销毁后全局点击失效 / 长时间运行内存增长 → 销毁时同步解绑事件、清理定时器与纹理；交互命中检测容错不冒泡。
- 渲染卡顿：帧率不稳 → 简易性能统计（帧耗时、内存）；静态内容进 bitmap-cache 离屏缓存，动态层只画变化（细则见 canvas-drawing.md）。
- 包体积超限 → 检查主包内容，非首屏资源分包或 CDN 托管。
- 粒子特效拖累低端设备 → 粒子数量上限 + 低端特效降级。
- 本地存档损坏 → 统一封装存档模块：读写收口单点、损坏降级重置、异常恢复。
- 大量零散单图推高包体与开销 → 图集合并压缩，大图延迟按需加载。
- `pnpm install` 提示 `Ignored build scripts: esbuild` → pnpm 10 默认拦截依赖构建脚本；esbuild 0.28.2 的平台二进制由 optionalDependencies 提供，构建不受影响。换平台或版本后若报找不到二进制，再执行 `pnpm approve-builds` 允许 esbuild 的构建脚本。
- 局内画面能渲染但 sim 永远停在 `ready` / 浏览器自动化点击后无进展 → 场景绘制与推进脱节。**根因**：`draw()` 只渲染，没有调用 `tick(now)`，而 rAF 只挂在外层 `frame` 上。**方案**：固定由 `play.draw()` 驱动 `tick`，调试快照只读不渲染。**验证**：点击发球后 `getSnapshot().time` 增长、`percent` 变化。
- 每次击砖都新建离屏 canvas / 真机首屏偶发被覆盖 → 微信 `createCanvas` 前几次可能返回主画布，且逐次创建成本高。**方案**：bitmap-cache 只创建一张离屏 surface 反复复用；adapter 的 `createCanvas` 连续取到非主画布为止。**验证**：连续击砖 `cacheBuilds` 增长但离屏对象不增长；真机画面不再被缓存层覆盖。
- 浏览器自动化点错按钮 / 命中坐标与截图不符 → 截图是物理像素，不是 750 设计坐标。**方案**：用 `getRect` 系列（`hitModal` / `getRects`）拿设计坐标后再点中心，不靠截图目测。**验证**：点击后 `getSnapshot().modal` / `levelId` 与预期一致。
- 广告三通道在真机一直走模拟广告 → entries 没有把广告位 ID 传给 adapter。**方案**：在 `src/config/ads.js` 填 `AD_UNIT_ID` / `AD_UNIT_IDS`，由 entries 注入；留空即模拟广告。**验证**：`platform.adMode()` 返回 `sdk`，真机拉起平台广告。
- 产物混入调试探针或平台全局 → `entries/pkg-game.js` 引用了 web/平台模块。**方案**：分包入口只导出 `createGameApp`；探针只在 web adapter 安装。**验证**：`corepack pnpm verify:dist` 通过（微信/抖音零探针、无 `wx.`/`tt.`/`document.`/`window.`）。
