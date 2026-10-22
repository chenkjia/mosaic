# REQ-001 V1 验证报告

- 日期：2026-10-21（初版），2026-10-22（HUD / 技能栏 / 失败线 / 无首页 / 奖励砖必掉 / 奖励砖扩量分散与点击释放 / 分裂技能与减益砖复核）
- 范围：`apps/game`、`packages/shared`、`scripts/`、三端产物
- 结论：数据层、三端构建、产物 smoke 与 web 浏览器全流程通过；2026-10-22 复核覆盖固定四格技能栏、空槽广告补给、失败线下移、HUD 精简、移除首页、奖励砖必掉、每关 6 块分散奖励砖、拾取只存充能、点击技能格才释放，以及激光替换为分裂、三种减益砖、按砖数分带的关卡难度、底三行留空与挡板小间隙。真机、真实广告 SDK、平台分享、低端机性能与关卡美术人工走查待用户执行。

## 环境

| 项 | 值 |
|---|---|
| 系统 | macOS arm64 |
| Node | v24.18.0 |
| 包管理 | `corepack pnpm` 10.12.1（`packageManager` 锁定） |
| 构建 | esbuild 0.28.2 |
| 浏览器 | 701×781 @2x（内置浏览器）；375×812 @2x / 390×844 @2x（Chrome headless + Playwright）；750×1247（Chrome headless + CDP，2026-10-22 分裂/减益复核） |
| 服务 | `python3 -m http.server 8000 --directory dist/web` |

## 已执行命令

| 命令 | 结果 |
|---|---|
| `corepack pnpm test` | 57 项全部通过（shared 与 game 共 9 个测试文件） |
| `corepack pnpm build` | web / wechat / douyin 三端构建成功 |
| `node scripts/verify-dist.mjs` | OK：产物存在、探针隔离、版本注入、单包结构（无分包字段）、体积预警线 |
| `node --check`（本轮修改文件） | 通过 |

## 构建与体积

| 产物 | 单包 |
|---|---|
| `dist/web` | 0.43MB |
| `dist/wechat` | 0.43MB |
| `dist/douyin` | 0.43MB |

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
| 6 | 四格技能栏、充能上限、奖励砖必掉、拾取只充能、点击释放、分裂语义 | `physics.test.mjs`「每块奖励砖必掉技能充能，可被挡板拾取」「四格技能满时奖励砖不再生成掉落物」「奖励砖拾取只充能，点击释放才生效」及分裂用例（1→2、无移动球拒绝、8 球阻塞）；浏览器真实 PointerEvent 拖出格不触发；debug 实测分裂 1→2 球 | 通过 |
| 7 | 存档往返、旧金币字段丢弃、损坏降级 | `packages/shared/test/save.test.mjs` | 通过 |
| 8 | 三个广告点位（复活 / 额外球 / 技能补给）与广告暂停 | web 模拟广告浏览器核验 + 平台测试 | 通过（模拟链路） |
| 9 | 30 关 schema、主题、难度带砖数、每关 6 块分散奖励砖、减益数量、底三行与挡板间隙 | `scripts/validate-levels.js`、`apps/game/test/levels.test.mjs`、生成器统计（最近两块 5.8–10.8 格，最底行 24，间隙 52.5px） | 通过 |
| 10 | 三种减益砖、颜色 + 图标编码、数值与刷新、状态条 | `physics.test.mjs` 减益用例；`render.test.mjs` 减益砖/状态条用例；浏览器 debug 触发三种减益实测 | 通过 |
| 11 | demo1 三视口静态走查 | Ticket 02 记录（390×844 / 768×1024 / 750×1334） | 通过 |
| 12 | 无首页、浏览器全流程、控制台无报错 | 下表 | 通过 |
| 13 | 真机走查清单 | [`device-checklist.md`](device-checklist.md) | 已产出 |
| 14 | 卡片铺底、失败线与手势接管 | `apps/game/test/render.test.mjs` + 浏览器真实 PointerEvent（见下节） | 通过 |

关卡统计：30 关（animals 1–10、flowers 11–20、scenery 21–30），可破坏砖块 72–264 块/关、合计 5028，奖励砖 180（每关 6 块，最远点采样分散），减益砖 79（0/1/2/3/4 块递增，shrink 26 / speed 26 / reverse 27），障碍 57，硬砖 1200（比例 6%→36%），调色板上限 16 色，球速 560→734。所有关卡可见最底砖块均在 24 行，挡板间隙 52.5px。

## 浏览器端到端记录

清空 `localStorage['mosaic.save.v1']` 后，以 `window.__MOSAIC_DEBUG__` 驱动：

1. 冷启动直达局内：`scene=play / levelId=1 / phase=ready`，默认存档 `{highestLevel:1,sound:true,music:true}`，无 `coins` / `slotCapacity`；预开局弹层只有「开始」「看广告 +1 球」，无首页。
2. 点击开始 → `modal=null / paused=false`；点击棋盘发球 → `phase=playing`，清除率上升，bitmap-cache 建立（命中/破碎后重建）。
3. `forceFail` → 失败弹层，按钮仅 `revive / retry`；点击复活 → 广告遮罩 `adBusy=true / paused=true`，模拟广告后 `phase=ready / reviveUsed=true / modal=null`。
4. `forceClear` → 过关弹层，按钮仅 `next`，只推进 `highestLevel`，不再结算金币；「下一关」进入第 2 关预开局。
5. 暂停 → 五按钮暂停面板（继续 / 音效 / 音乐 / 分享 / 重开），无「返回主页」；音效/音乐开关持久化；分享调用返回 `false`（桌面 Chromium 无 `navigator.share`）并显示回退提示，无异常。
6. 点击空技能格 → `modal=skillCharge / paused=true / chargingSkill=i`；取消后恢复 `paused=false`、充能不变。
7. 再次点击空技能格 → 「看广告补充」→ 广告中 `modal=ad / adBusy=true / paused=true`，`sim.time` 在广告前后保持 `0.2333` 不变；结束后 `charges[i]=1 / modal=null / paused=false`。
8. 点击已充能格 → `charges[i]=0`，对应效果计时开始（分裂立即生成同色球 / 加宽 15s / 减速 10s），多球球数增加且不超过 8；停球状态使用分裂被拒绝且充能保留。
9. 四类弹层按钮实测：预开局 `start / extraBall`，暂停 `resume / sound / music / share / restart`，结算 `next`，失败 `revive / retry`；均无首页入口。
10. 控制台仅 `[game] boot 0.1.0`、`[boot] play 0.1.0`，无 error / warning（404 为 favicon，忽略）。

## 奖励砖扩量分散与点击释放核验（2026-10-22）

以 `http://localhost:8000/?adMs=0` 驱动，清空存档后进入第 1 关：

- 预开局弹层显示「奖励砖 6」；截图中 6 块奖励砖（金色底色 + 菱形标记）分布在棋盘上、中、下部，无聚簇。30 关数据层统计每关均为 6 块，同一关最近两块相距 5.8–10.8 格。
- 点击空技能格 → `modal=skillCharge / chargingSkill=0`；确认看广告后 `charges[0]=1`，`effects` 仍全为 0（`multiBallUntil / wideUntil / split / slowUntil` 均未开始计时），`modal=null`。
- 点击已充能格 → `charges[0]=0`，多球生效，球数 1 → 3。
- 真实 `PointerEvent`：在技能格中心按下，移动 120 设计 px 后抬手 → `charges` 不变、无新效果；再原地按下并抬手 → 技能释放（球数 3 → 5）。按下后拖出格子不会误触。
- 击碎底部奖励砖 → 掉落被挡板拾取，对应格充能只 +1，`effects` 不启动，证明拾取只存入充能、不会自动释放；已充能格文案为「点击释放」，空槽为「看广告」。

## 分裂技能与减益砖核验（2026-10-22）

内置浏览器窗口不可见，改用 Chrome headless（750×1247 视口）+ CDP 驱动 `http://localhost:8000/?adMs=0`，构建后强制刷新并截图：

- 第 20 关：`total=200 / debuffs=4 / skills=[multiBall,widePaddle,split,slow]`。截图中四块减益砖分别为红底 `>>`（加速）、紫底反向箭头（反转）、橙底缩板图标（缩板）、红底 `>>`；棋盘可见最底行贴住第 24 行，与挡板间隙约 52.5px。
- 分裂拒绝：停球阶段 `setCharges([0,0,1,0])` → `useSkill(2)` 返回 `noMovingBall`，`charges[2]` 仍为 1。
- 分裂生效：第 1 关发球后 0.25s 使用分裂，球数 1 → 2，两颗均为 `blue`，充能清零；`ballSpawned` 事件来源 `splitAll`。8 球上限与多球阻塞由 `physics.test.mjs` 覆盖。
- 减益触发：第 20 关依次 `triggerDebuff('shrink'|'speed'|'reverse')`，事件时长 8/8/6s；快照 `effects` 为 `shrink≈7.875 / speed≈7.875 / reverse≈5.875`，`paddleW=97.5`（150×0.65）。截图中技能栏上方同时显示「缩板 8s」「加速 8s」「反向 6s」三枚状态丸，挡板变为橙色加粗。
- 减益砖击碎流程：自然游玩中击碎加速砖后出现「加速 7s」状态丸与 `已使用 · 分裂` toast 共存，HUD 清除率同步上升，证明减益触发与技能释放互不干扰。

## 界面铺底、失败线与手势接管核验（2026-10-21，2026-10-22 复核）

派发真实 `PointerEvent`（`pointerdown` 打在 canvas、`pointermove/pointerup` 打在 window，带 `pointerId`），读 `getSnapshot()` 的 `dragging / paddleTarget / phase / modal`：

| 场景 | 观测 |
|---|---|
| 设计坐标 (375, 260) 按下 | `paddleTarget=357`（= 375−18）、`dragging=true`、`phase: ready → playing`（按下即发球） |
| 拖到 (690, 1331)，即屏幕最底 | `paddleTarget=639`（棋盘内钳制）、`dragging=true` —— 越过棋盘下沿与技能栏上沿不再断手 |
| 抬手 | `dragging=false`、`paddleTarget=639` 保留不回中 |
| HUD 空白 (210, 96) 按下 | `paddleTarget` 不变、`dragging=false` |
| 空技能格中心按下 | `modal=skillCharge / paused=true / chargingSkill=格号`，`dragging=false`、挡板不动 |
| 取消补给 | `modal=null / paused=false / chargingSkill=-1`，充能不变 |
| 广告播放中 | `modal=ad / adBusy=true / paused=true`，`sim.time` 保持 0.2333 不增长 |
| 广告完成 | `charges[i]=1 / modal=null / paused=false`，其余格不变 |
| 卡片左侧窄边 (10, 1200) 按下 | `dragging=true`、`paddleTarget=75`（钳制到挡板半宽）、`phase: ready → playing` —— 卡片外、操作区内也能起手 |
| 接管中拖到卡片右侧外 (740, 900) | `dragging=true`、`paddleTarget=639`；抬手后保留 639 |
| 手指 4 拖动中，手指 5 在面板底部按下并移动 | `paddleTarget` 保持 412 不被抢；手指 4 继续跟随到 232；释放后手指 6 按下重新接管到 602 |

视口与布局读数均符合定案：

- 701×781（fallback，bleed 1197.35）：`panel = { x: 18, y: 140, w: 714, h: 1194 }` → 下沿 1334；`operation = { x: -223.68, y: 140, w: 1197.35, h: 1194 }`；`dividerY = 1198`、`failY = 1038`（= 1198 − 160）；四格技能 `{ x: 18/201/384/567, y: 1198, w: 165, h: 112 }`。
- 375×812（fit，designH=1624）：`panel = { x: 18, y: 140, w: 714, h: 1484 }` → 下沿 1624；`operation = { x: 0, y: 140, w: 750, h: 1484 }`；`dividerY = 1488`、`failY = 1328`；四格技能 y=1488，底边 1600，距屏底 24。
- 390×844 视口切换后：`dividerY=1487.08`、`failY=1327.08`、`panel bottom=1623.08`，失败线随布局重算，球未在旧位置误判。
- 单测覆盖 `safeBottom` 0/34/68 × 设计高 1334/1624/1900：卡片始终到物理底、`dividerY` 等于技能栏上沿、`failY = dividerY − board.y`，技能格底边不越入安全区。
- 两视口截图确认：HUD 左侧暂停 + 关卡号、居中清除率、右上无控件；四格技能等宽常驻并贴齐棋盘左右边；toast 位于技能栏上方；卡片上沿两角可见、下沿无可见边界。

## 数据层覆盖摘要

- 物理：同种子同输入 600 步逐帧一致；球-砖正面/侧面/角落、球-墙三面、挡板左中右、球-球对心碰撞与位置分离；自定义 `failY` 下球与掉落物落到失败线即移除（默认值等于棋盘高，兼容旧用例）。
- 规则：球数上限、三色球、清除率、过关/失败、复活一次、四技能充能（每格上限 1、拾取与广告补充、使用消耗）、每块奖励砖必掉技能充能、拾取只写入充能不自动释放（`effects` 不启动，显式 `activateSkill` 才生效）、四格全满时不生成掉落并发出 `skillFull`、关卡内充能不持久化；分裂全量生成/无移动球拒绝/8 球阻塞；三种减益的数值、刷新与叠加、减益砖不掉充能。
- 存档：默认结构、序列化往返、损坏/缺字段/越界降级、损坏回写、旧档 `coins` / `slotCapacity` 等未知字段丢弃且 `highestLevel` 保留。
- 关卡：30 关 schema、主题数量、难度带砖数、每关奖励砖 6 块且分散、减益数量与类型、底三行留空、最底行 24 与挡板间隙、PNG 管线量化与解析。
- 渲染契约：布局在 1334/1400/1624/1900 设计高度下坐标合法；游戏面板与棋盘同宽铺到设计底边、分隔线等于技能栏上沿、`failY = dividerY − board.y`、四格技能 165×112 等宽贴齐棋盘、按钮在左上、操作区通宽、技能格避让 `safeBottom`；砖块四态 + 减益三态、HUD、技能栏（分裂图标/标签）、减益状态条、弹层坐标均为有限值，状态条只显示未到时减益并带剩余秒数。

## 未验证项与风险

| 项 | 状态 | 说明 |
|---|---|---|
| 微信/抖音真机启动、触摸 | 未执行 | 由用户按 `device-checklist.md` 执行 |
| 真实激励视频三通道 | 未执行 | `apps/game/src/config/ads.js` 当前为空，走模拟广告；`revive` / `extraBall` / `skillCharge` 填入真实 ID 后需真机验收 |
| 微信/抖音分享卡片 | 仅 web 回退验证 | 真机分享标题/封面/query 待验 |
| 低端机帧率、发热、内存 | 未执行 | 已做 bitmap-cache、零逐帧渐变、粒子上限；仍需真机观察 |
| 关卡像素画辨识度 | 未执行 | 需人工在 demo 或真机逐关走查 |
| 分裂与减益的手感/平衡 | 待人工走查 | 数值与状态条已数据层/浏览器核验通过；分裂在密集球群中的可读性、减益惩罚强度与 8 球上限阻塞提示需真机试玩确认 |
| 音频 | 接口预留 | V1 无音频资源，`audio.play` 为 no-op |
| 金币与技能槽扩容 | **已确认移除（2026-10-22）** | 用户已明确确认移除金币与扩容；结算金币、双倍广告与扩槽入口均已删除，旧档 `coins` / `slotCapacity` 自动丢弃，不保留兼容入口 |
| 红/绿球产出入口 | **待确认** | 规则与测试已实现，但当前关卡初始球、额外球、多球技能、奖励砖掉落均只产出蓝球；玩家尚无法获得红/绿球 |
| 软著材料 | 未产出 | 截图/录屏入口见下节，申请材料按 REQ-002 第 1 项推进 |

## 截图、录屏与软著入口

建议素材清单（真机或 750 宽浏览器环境，统一竖屏原图）：

1. 启动 loading（版本号可见）。
2. 冷启动直达的预开局弹层（关卡号、主题、技能栏 4 格常驻）。
3. 局内 HUD + 宝石砖块 + 四格技能栏（优先选含硬砖、障碍、奖励砖、减益砖与减益状态条的第 20 关）。
4. 失败面板 + 复活广告入口。
5. 过关结算 + 下一关入口。
6. 空技能格的「看广告补充」弹层、暂停/设置面板与分享面板。

操作入口：web 端可在控制台通过 `window.__MOSAIC_DEBUG__` 的 `startLevel(id)` / `forceClear()` / `forceFail()` / `setCharges([1,0,1,0])` / `useSkill(i)` / `triggerDebuff('shrink'|'speed'|'reverse')` 构造画面；微信/抖音包不含探针，需自然游玩或使用开发者工具。素材目录建议与 `~/game/qian/软件著作权申请资料/` 的先例对齐，截图不入版本库；申请表、源代码材料和操作手册按 REQ-002 第 1 项另行整理。

## 下一步

1. 用户执行微信/抖音真机走查（`device-checklist.md`），回报问题后按记录修复。
2. 确认红/绿球产出方式（新增掉落类型、关卡初始球色或其它规则），确认后再改 spec 与实现。
3. 配置 `apps/game/src/config/ads.js` 的真实广告位 ID，复验三通道并补齐分享/广告素材。
4. 推进 REQ-002 的软著、主体、类目、备案与隐私协议。
