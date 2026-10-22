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

- `src/platform/`：三端 adapter（web/微信/抖音）。平台差异只允许出现在这里；构建期多入口与平台能力封装收拢于此。
- `src/gfx/`：绘制原语层（圆角路径、渐变、离屏 canvas、bitmap-cache）。只做「怎么画」，不知道「画什么」。
- `src/ui/`：组件层。每个组件自带规格表，负责「画什么」。
- 场景/业务层：组合层，只调用 ui/gfx，不直接写 ctx 样式细节。
- 业务层永远在 750 设计坐标系绘制，platform 层 fit 缩放；触摸换算读画布实际尺寸。
- 局内界面一张卡：游戏面板与棋盘同宽（714，左右各留 18），从 HUD 下沿铺到屏幕物理最底，底部圆角画在屏外；卡内分隔线在四格技能栏上沿，同时是模拟层失败线（`failY`）。棋盘底边到失败线之间是下落带，只保留左右边界。操作区是独立的通宽矩形（HUD 下沿到屏幕底、左右贴屏），判定禁止用卡片或棋盘矩形（会断手）。技能栏固定贴底，底边自「屏幕底 − `safeBottom`」向上留 24。
- 无首页：`createGameApp` 只创建 `play` 场景，启动即 `play.start(store.get().highestLevel)`，预开局弹层只有开始与广告加球；暂停保留继续/音效/音乐/分享/重开。不要恢复 `scene/home.js`、`onExit` 或任何「返回主页」按钮。

## 单包架构

- 游戏代码与全部位图资源打进一个包，微信/抖音输出 `game.js` + `game.json` + `assets/`，不声明分包，也没有 `loadSubpackage` 流程。
- 三个入口（web/微信/抖音）都静态 import `game/index.js`；平台差异只在 adapter。
- 资源路径直接用包内相对路径（如 `assets/share/cover.png`），adapter 不拼前缀。
- 构建输出单行体积：单包总量；2MB 预警、18MB 上限预警（微信上限 30MB / 抖音上限 20MB）。

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
- 包体积超限 → 单包无法靠分包减负：优先图集压缩、裁切非首屏大图或 CDN 托管。
- 粒子特效拖累低端设备 → 粒子数量上限 + 低端特效降级。
- 本地存档损坏 → 统一封装存档模块：读写收口单点、损坏降级重置、异常恢复。
- 大量零散单图推高包体与开销 → 图集合并压缩，大图延迟按需加载。
- `pnpm install` 提示 `Ignored build scripts: esbuild` → pnpm 10 默认拦截依赖构建脚本；esbuild 0.28.2 的平台二进制由 optionalDependencies 提供，构建不受影响。换平台或版本后若报找不到二进制，再执行 `pnpm approve-builds` 允许 esbuild 的构建脚本。
- 局内画面能渲染但 sim 永远停在 `ready` / 浏览器自动化点击后无进展 → 场景绘制与推进脱节。**根因**：`draw()` 只渲染，没有调用 `tick(now)`，而 rAF 只挂在外层 `frame` 上。**方案**：固定由 `play.draw()` 驱动 `tick`，调试快照只读不渲染。**验证**：点击发球后 `getSnapshot().time` 增长、`percent` 变化。
- 每次击砖都新建离屏 canvas / 真机首屏偶发被覆盖 → 微信 `createCanvas` 前几次可能返回主画布，且逐次创建成本高。**方案**：bitmap-cache 只创建一张离屏 surface 反复复用；adapter 的 `createCanvas` 连续取到非主画布为止。**验证**：连续击砖 `cacheBuilds` 增长但离屏对象不增长；真机画面不再被缓存层覆盖。
- 浏览器自动化点错按钮 / 命中坐标与截图不符 → 截图是物理像素，不是 750 设计坐标。**方案**：用 `getRect` 系列（`hitModal` / `getRects`）拿设计坐标后再点中心，不靠截图目测。**验证**：点击后 `getSnapshot().modal` / `levelId` 与预期一致。
- 广告三通道在真机一直走模拟广告 → entries 没有把广告位 ID 传给 adapter。**方案**：在 `src/config/ads.js` 填 `AD_UNIT_ID` / `AD_UNIT_IDS`，由 entries 注入；留空即模拟广告。**验证**：`platform.adMode()` 返回 `sdk`，真机拉起平台广告。
- 产物混入调试探针或 DOM 全局 → 小游戏入口误引 web/平台模块。**方案**：小游戏入口只静态 import `createGameApp` 与对应 adapter；探针只在 web adapter 安装。**验证**：`corepack pnpm verify:dist` 通过（微信/抖音零探针、无 `window.`/`document.` 直接引用）。
- 微信开发者工具报 `未找到 ["subpackages"][0]["root"] 对应的 /pkg-game/game.js` → 小游戏分包根目录必须有自己的 `game.js`，而旧构建只输出 `pkg-game/index.js`。**方案**：取消分包，改为单包 `game.js`（ADR-0004）。**验证**：`dist/wechat/game.json` 无分包字段，产物仅 `game.js` + `game.json` + `assets/`。
- 手指滑出棋盘下沿挡板就不跟 → 场景按触点**位置**过滤输入（`inBoard` 矩形），而拖动是**手势**，位置过滤必然断手。**方案**：操作区内按下即接管挡板直到抬手/取消，接管中越界只按棋盘钳制。**验证**：浏览器派发真实 PointerEvent 拖到设计底边，`getSnapshot().dragging` 始终为 `true`。
- 真机第二根手指点技能槽没反应、或误抢挡板 → adapter 只上报 `touches[0]`，事件没有手指 id，场景无法区分谁按下谁抬起。**方案**：逐 `changedTouches` 上报带 `identifier` 的事件，注册 `onTouchCancel` 发 `cancel`；场景按 id 判定第一根手指独占。**验证**：`apps/game/test/platform.test.mjs` 多指与 cancel 断言。
- 接管后挡板永久卡死不动 → 只靠抬手事件释放接管，遇到系统手势打断、切后台、调试 API 只发 `start` 时 `dragId` 永不释放。**方案**：`cancel`、`onHide`、弹窗打开、开新局一律释放；调试 `click` 补发同 id 的 `end`。**验证**：`__MOSAIC_DEBUG__.click()` 之后真实手指按下仍能驱动挡板。
- 用户仍觉得局内游戏区没铺到屏幕底 → 判定区（通宽面板）早已到底，但视觉主体是棋盘卡片，卡片底边成了眼睛看到的「游戏区」边界，低 alpha 底衬补不回来。**方案**：视觉改成与棋盘同宽的一张卡铺到屏幕物理底，卡内分隔线标出失败线；操作区保持独立通宽。**验证**：`render.test.mjs` 断言卡片同宽触底、分隔线等于技能栏上沿；fit 与 fallback 两视口截图确认卡片下沿贴屏。
- 视口变高后球在棋盘下沿就被判失败 → `sim.failY` 是纯数据，不会自己跟着布局走。**方案**：`play.draw()` 每帧由 `computePlayLayout` 重算 `layout.failY` 并写回 `sim.failY`，失败线永远等于技能栏上沿；`createState` 的默认值只服务测试。**验证**：浏览器改视口后读 `getSnapshot().failY` 与 `rects.dividerY` 差值等于棋盘 `y`；shared 测试覆盖自定义 `failY`。
- toast 遮住整排技能格 → toast 默认画在屏幕底边，技能栏改为常驻贴底后必然重叠。**方案**：局内 toast 基线取 `min(屏底 − 12, 技能栏上沿 − 16)`。**验证**：375×812 截图确认提示条完整位于技能栏上方。
- 删除金币/扩容后界面或调试按钮仍引用旧字段 → 仅改 shared 会让页面在 `store.get().coins` 处静默 NaN，调试 API 直接抛错。**方案**：共享 API 与存档字段同步删除，旧存档迁移时丢弃未知字段；全仓 grep `coins` / `slotCapacity` 只剩迁移测试。**验证**：`corepack pnpm test` 48 项通过、`verify:dist` 通过。
- 奖励砖击碎后「没掉东西」 → 掉落原为 50% 概率，且四格技能全满时静默返回，玩家无法区分未触发与已满。**方案**：`RULES.skillDropChance = 1`，四格全满时发 `skillFull`（`skill: null`），页面 toast「四个技能都已就绪」；掉落仍需挡板接住。**验证**：`physics.test.mjs` 用固定种子断言必掉与满格零掉落；浏览器击碎奖励砖可观察到菱形掉落。
- 奖励砖位置聚在一起、玩家感知「奖励太少」 → 初版每关 3 块且坐标手写在图案局部，容易落在同一区域。**方案**：每关固定 6 块，生成器 `chooseRewards()` 在非障碍砖格上做最远点采样（首块离质心最远，其后最大化到已选格的最近距离，`hash2` 决胜）；30 关源图、sidecar 与 `levels.json` 全量重生成。**验证**：每关奖励砖均为 6，最近两块相距 5.8–10.8 格；`levels:validate` 与关卡测试通过。
- 拾取技能充能后「技能自己放了」/ 手指经过技能栏就误触发 → 技能格在 `pointerdown` 立即调用 `useSkill()`，按下与拖动经过都会释放；数据层拾取本身只写充能。**方案**：改为 `slotPress` + 抬手确认——按下只记录格号、坐标与按下时充能状态，抬手仍在同格且位移 ≤ 18 设计 px 才释放；拖出、超限、按下时未充能均取消，弹窗/广告/切后台清空按压状态。**验证**：`physics.test.mjs`「奖励砖拾取只充能，点击释放才生效」；浏览器真实 PointerEvent 拖出格后充能不变，原地点击才生效。
- 移除首页后仍有入口返回空场景 → 只删 `home.js` 不够，`play` 的 `onExit`、四类弹层的 `home` 按钮与 `handleAction('home')` 会留下死路径。**方案**：`createGameApp` 直接启动最高关，删除 home import/场景分支/`backHome`/`onExit` 与全部 home 按钮。**验证**：全仓 grep `scene/home|createHomeScene|onExit|backHome` 零命中；浏览器四类弹层按钮清单无 home。
