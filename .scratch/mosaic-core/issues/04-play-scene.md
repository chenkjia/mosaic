# 04 局内场景、输入、渲染与 HUD

Status: done
依赖：01、02、03
关联：REQ-001（局内核心、界面）

## 目标

把 sim 接到渲染与输入：棋盘、球、挡板、掉落物、技能槽、HUD、暂停，跑通一关的完整流程。

## 验收项

- 竖屏；挡板跟随手指，点击发球；击球点影响反弹角。
- 伪 3D 砖块按 demo1 冻结规格绘制；静态砖块走 bitmap-cache，球/粒子为动态层。
- HUD 显示金币、关卡号、`CLEARED · x%`、4 个技能槽、暂停。
- 过关 → 结算 → 自动下一关；球全掉 → 失败面板（复活/重来）。
- 帧循环无分配、drawImage 坐标取整；控制台无报错。
- 浏览器自动点击可走通：home → 开局 → 过关 → 下一关 → 失败。

## 实施记录

- 产物：`gfx/{drawGemBrick,bitmapCache,particles,color}.js`、`ui/{theme,button,modal,toast,hud,skillBar}.js`、`game/{layout,saveStore,audio}.js`、`game/scene/{home,play}.js`、`game/index.js`；`boot/main.js` 接入前后台生命周期。
- 关键决定：`play.draw()` 内驱动 `tick(now)`，保证 rAF 与 sim 同步；静态砖块 bitmap-cache 只复用一张离屏画布，键为 `levelId|brickVersion|scale`；球/掉落/粒子/激光为动态层；弹层统一 `modal` 状态并阻断底层输入；结算自动倒计时 6.5s，切后台取消。
- 验证：`apps/game/test/render.test.mjs` 在 1334/1400/1624/1900 高度断言坐标；浏览器完成 home → 预开局 → 发球 → 失败 → 复活 → 结算 → 双倍 → 下一关 → 暂停；控制台无 error。
- 踩坑：draw 只渲染不 tick 会让 sim 永远停在 ready；调试快照不会触发渲染，自动化必须等待真实帧。已回写 `apps/game/AGENTS.md`。

## 后续变更（2026-10-21）

- 验收项口径修正：原「挡板跟随手指，点击发球」按触点位置过滤，手指滑出棋盘即断手；改为操作区（HUD 下沿到屏幕最底、左右贴屏）内按下即接管挡板、跟随到抬手，空白处按下同时发球。
- 产物：`layout.js` 新增 `panel` 矩形（通宽铺到设计底边，兼作操作区判定）与 `safeBottom` 避让；`play.js` 拆出 `drawPanel`（棋盘圆角底面叠在其上）与手势接管状态 `dragId`；`platform/{web,minigame}.js` 指针事件补 `id` 与 `cancel`，小游戏端逐 `changedTouches` 上报。
- 验证：`render.test.mjs` 44 条通过（新增面板铺底与安全区避让两组）；浏览器真实 PointerEvent 断言拖到设计底边 `dragging` 保持、抬手保留、第二指不抢、HUD 空白不动挡板；`build` + `verify:dist` 三端通过。对应 REQ-001 验收标准第 13 项。
