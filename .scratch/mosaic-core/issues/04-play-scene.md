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
