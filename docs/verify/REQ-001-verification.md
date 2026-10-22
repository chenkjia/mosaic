# REQ-001 V1 验证报告

- 日期：2026-10-21
- 范围：`apps/game`、`packages/shared`、`scripts/`、三端产物
- 结论：数据层、三端构建、产物 smoke 与 web 浏览器全流程通过；真机、真实广告 SDK、平台分享、低端机性能与关卡美术人工走查待用户执行。

## 环境

| 项 | 值 |
|---|---|
| 系统 | macOS arm64 |
| Node | v24.18.0 |
| 包管理 | `corepack pnpm` 10.12.1（`packageManager` 锁定） |
| 构建 | esbuild 0.28.2 |
| 浏览器 | Chromium 150 / Electron 43，视口 701×781 @2x（桌面窗口） |
| 服务 | `python3 -m http.server 8000 --directory dist/web` |

## 已执行命令

| 命令 | 结果 |
|---|---|
| `corepack pnpm test` | 42 项全部通过（shared 25 项 / 3 个文件；game 17 项 / 5 个文件） |
| `corepack pnpm build` | web / wechat / douyin 三端构建成功 |
| `node scripts/verify-dist.mjs` | OK：产物存在、探针隔离、版本注入、单包结构（无分包字段）、体积预警线 |
| `node --check`（本轮修改文件） | 通过 |

## 构建与体积

| 产物 | 单包 |
|---|---|
| `dist/web` | 0.44MB |
| `dist/wechat` | 0.44MB |
| `dist/douyin` | 0.44MB |

预警线：单包 ≤ 2MB、≤ 18MB 上限，均远低于阈值。版本号 `0.1.0` 由 `apps/game/package.json` 注入三端。

产物 smoke（`scripts/verify-dist.mjs`）：

- `__MOSAIC_DEBUG__` 仅存在于 `dist/web/main.js`，微信/抖音包内零命中。
- `dist/wechat`、`dist/douyin` 的 `game.js` 无 `window.` / `document.` 直接引用（`wx.` / `tt.` 属 adapter 合法使用）。
- 微信/抖音 `game.json` 均不声明分包，且声明竖屏；产物只有 `game.js` + `game.json` + `assets/`。
- 三端均含 `[game] boot` 启动标记与分享封面 `assets/share/cover.png`。

## 验收标准对照

| # | 验收项 | 证据 | 结论 |
|---|---|---|---|
| 1 | 三端构建、体积、探针 | 构建输出、`verify-dist.mjs` | 通过 |
| 2 | 确定性物理 600 步一致、四类碰撞、有限坐标 | `packages/shared/test/physics.test.mjs` | 通过 |
| 3 | 清除率不计障碍、100% 过关 | `physics.test.mjs`「障碍不计入清除率分母，破坏完触发过关」 | 通过 |
| 4 | 8 球上限、球球碰撞无粘连 | `physics.test.mjs` 对应用例 | 通过 |
| 5 | 球色伤害 / 分裂规则 | `physics.test.mjs`「球色：蓝对硬砖 1 伤，红对硬砖 2 伤，绿命中分裂」 | 通过（规则层） |
| 6 | 技能与金币 | `physics.test.mjs` 技能、掉落、扩容用例 | 通过 |
| 7 | 存档往返与损坏降级 | `packages/shared/test/save.test.mjs` | 通过 |
| 8 | 三个广告点位、复活一次、双倍数值 | web 模拟广告浏览器核验 + 平台测试 | 通过（模拟链路） |
| 9 | 30 关 schema、主题、可破坏数 | `scripts/validate-levels.js`、`apps/game/test/levels.test.mjs` | 通过 |
| 10 | demo1 三视口静态走查 | Ticket 02 记录（390×844 / 768×1024 / 750×1334） | 通过 |
| 11 | 浏览器全流程、控制台无报错 | 下表 | 通过 |
| 12 | 真机走查清单 | [`device-checklist.md`](device-checklist.md) | 已产出 |
| 13 | 卡片铺底与手势接管 | `apps/game/test/render.test.mjs` + 浏览器真实 PointerEvent（见下节） | 通过 |

关卡统计：30 关（animals 1–10、flowers 11–20、scenery 21–30），可破坏砖块 133–333 块/关、合计 6674，奖励砖 90、障碍 77，调色板上限 16 色，球速 560→734。

## 浏览器端到端记录

清空 `localStorage['mosaic.save.v1']` 后，以 `window.__MOSAIC_DEBUG__` 驱动：

1. 主页加载：`scene=home`，默认存档 `highestLevel=1 / coins=0 / slotCapacity=2`。
2. 点击继续 → 第 1 关预开局弹层：232 块可破坏砖，`phase=ready`。
3. 开始 → 点击棋盘发球：`phase=playing`，清除率 6%，bitmap-cache 建立 13 次（命中/破碎后重建）。
4. 球掉落 → 失败弹层；点击复活 → 广告遮罩 `adBusy=true`，3 秒模拟广告后 `phase=ready / reviveUsed=true / docked=[true]`。
5. `forceClear` → 过关弹层：`resultBase=20`，存档金币 +20，`highestLevel=2`。
6. 点击「看广告 ×2」→ 广告遮罩 → `doubled=true`，金币再 +20，按钮置灰。
7. 点击「下一关」→ 第 3 关预开局，`levelId=3`（前一轮已推进到第 2 关）。
8. 暂停 → 六按钮暂停面板；音效/音乐开关持久化；分享调用返回 `false`（桌面 Chromium 无 `navigator.share`）并显示回退提示，无异常。
9. 主页扩容：金币 1000 → 点击一次 800/容量 3 → 再次 300/容量 4 → 第三次无变化，持久化写入 `mosaic.save.v1`。
10. 控制台仅 `[game] boot 0.1.0`、`[boot] home 0.1.0`，无 error / warning。

## 界面铺底与手势接管核验（2026-10-21，2026-10-22 复核）

派发真实 `PointerEvent`（`pointerdown` 打在 canvas、`pointermove/pointerup` 打在 window，带 `pointerId`），读 `getSnapshot()` 的 `dragging / paddleTarget / phase`：

| 场景 | 观测 |
|---|---|
| 设计坐标 (375, 260) 按下 | `paddleTarget=357`（= 375−18）、`dragging=true`、`phase: ready → playing`（按下即发球） |
| 拖到 (690, 1331)，即屏幕最底 | `paddleTarget=639`（棋盘内钳制）、`dragging=true` —— 越过旧棋盘下沿 1132 不再断手 |
| 抬手 | `dragging=false`、`paddleTarget=639` 保留不回中 |
| HUD 空白 (210, 96) 按下 | `paddleTarget` 不变、`dragging=false` |
| 技能槽中心按下 | `dragging=false`、挡板不动（只在按下一点判定） |
| 卡片左侧窄边 (10, 1200) 按下 | `dragging=true`、`paddleTarget=75`（钳制到挡板半宽）、`phase: ready → playing` —— 卡片外、操作区内也能起手 |
| 接管中拖到卡片右侧外 (740, 900) | `dragging=true`、`paddleTarget=639`；抬手后保留 639 |
| 手指 4 拖动中，手指 5 在面板底部按下并移动 | `paddleTarget` 保持 412 不被抢；手指 4 继续跟随到 232；释放后手指 6 按下重新接管到 602 |

视口两种模式的矩形读数均符合定案：

- 窄窗（fallback，701×781 CSS）：`panel = { x: 18, y: 140, w: 714, h: 1194 }` → 与棋盘同宽、下沿 1334 = 设计底边；`operation = { x: -223.68, y: 140, w: 1197.35, h: 1194 }` → 含出血区贴屏；`dividerY = 1112`。
- 375×812 iframe（fit，designH=1624）：`panel = { x: 18, y: 140, w: 714, h: 1484 }` → 下沿 1624；`operation = { x: 0, y: 140, w: 750, h: 1484 }`；`dividerY = 1112`；技能槽 1448–1532、提示基线 1590，均在屏内。
- 单测覆盖 `safeBottom` 0/34/68 × 设计高 1334/1624/1900：卡片始终到物理底、分隔线等于棋盘底边，技能槽底边不越入安全区；1334 高 + 大安全区的极端组合下技能槽仍避让，提示文字贴近安全区但不出屏。
- 两视口截图确认：卡片上沿两角可见、下沿无可见边界（圆角落在屏外），分隔线正对棋盘底边。

## 数据层覆盖摘要

- 物理：同种子同输入 600 步逐帧一致；球-砖正面/侧面/角落、球-墙三面、挡板左中右、球-球对心碰撞与位置分离。
- 规则：球数上限、三色球、清除率、过关/失败、复活一次、四技能刷新与共存、奖励掉落拾取、槽位扩容费用。
- 存档：默认结构、序列化往返、损坏/缺字段/越界降级、损坏回写。
- 关卡：30 关 schema、主题数量、难度递增、网格边界；PNG 管线量化与解析。
- 渲染契约：布局在 1334/1400/1624/1900 设计高度下坐标合法；游戏面板与棋盘同宽铺到设计底边、分隔线等于棋盘底边、操作区通宽、技能槽避让 `safeBottom`；砖块四态、HUD、技能槽、弹层坐标均为有限值。

## 未验证项与风险

| 项 | 状态 | 说明 |
|---|---|---|
| 微信/抖音真机启动、触摸 | 未执行 | 由用户按 `device-checklist.md` 执行 |
| 真实激励视频三通道 | 未执行 | `apps/game/src/config/ads.js` 当前为空，走模拟广告；填入真实 ID 后需真机验收 |
| 微信/抖音分享卡片 | 仅 web 回退验证 | 真机分享标题/封面/query 待验 |
| 低端机帧率、发热、内存 | 未执行 | 已做 bitmap-cache、零逐帧渐变、粒子上限；仍需真机观察 |
| 关卡像素画辨识度 | 未执行 | 需人工在 demo 或真机逐关走查 |
| 音频 | 接口预留 | V1 无音频资源，`audio.play` 为 no-op |
| 红/绿球产出入口 | **待确认** | 规则与测试已实现，但当前关卡初始球、额外球、多球技能、奖励砖掉落均只产出蓝球；玩家尚无法获得红/绿球 |
| 软著材料 | 未产出 | 截图/录屏入口见下节，申请材料按 REQ-002 第 1 项推进 |

## 截图、录屏与软著入口

建议素材清单（真机或 750 宽浏览器环境，统一竖屏原图）：

1. 启动 loading（版本号可见）。
2. 主页（最高关、金币、技能槽入口）。
3. 局内 HUD + 宝石砖块 + 技能槽（优先选含硬砖、障碍、奖励砖的关卡）。
4. 失败面板 + 复活广告入口。
5. 过关结算 + 双倍金币入口。
6. 暂停/设置面板与分享面板。

操作入口：web 端可在控制台通过 `window.__MOSAIC_DEBUG__` 的 `startLevel(id)` / `forceClear()` / `forceFail()` / `setCoins(n)` 构造画面；微信/抖音包不含探针，需自然游玩或使用开发者工具。素材目录建议与 `~/game/qian/软件著作权申请资料/` 的先例对齐，截图不入版本库；申请表、源代码材料和操作手册按 REQ-002 第 1 项另行整理。

## 下一步

1. 用户执行微信/抖音真机走查（`device-checklist.md`），回报问题后按记录修复。
2. 确认红/绿球产出方式（新增掉落类型、关卡初始球色或其它规则），确认后再改 spec 与实现。
3. 配置 `apps/game/src/config/ads.js` 的真实广告位 ID，复验三通道并补齐分享/广告素材。
4. 推进 REQ-002 的软著、主体、类目、备案与隐私协议。
