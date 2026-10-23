# REQ-001 V1 验证报告

- 日期：2026-10-21（初版），2026-10-22（HUD / 技能栏 / 失败线 / 无首页 / 奖励砖必掉 / 奖励砖扩量分散 / 分裂技能与减益砖复核），2026-10-23（技能即时施放、技能格广告入口、减益掉落与永久叠加、清除率移除复核；同日直接开局、递增计数与「可破坏」文案清理复核）
- 范围：`apps/game`、`packages/shared`、`scripts/`、三端产物
- 结论：数据层、三端构建、产物校验与 web 浏览器全流程通过。2026-10-23 复核覆盖：技能取消充能与点击释放、掉落接到即施放、技能格点击直接拉广告、加宽/减速永久叠层、减益砖改为掉落物且接到才生效、清除率整体移除、预开局额外球广告移除；同日再复核删除开局弹窗（直接进入准备态）、HUD 改为递增的已清除 / 总数且无说明文字、全部界面清除「可破坏」文案。真机、真实广告 SDK、平台分享、低端机性能与关卡美术人工走查待用户执行。

## 环境

| 项 | 值 |
|---|---|
| 系统 | macOS arm64 |
| Node | v24.18.0 |
| 包管理 | `corepack pnpm` 10.12.1（`packageManager` 锁定） |
| 构建 | esbuild 0.28.2 |
| 浏览器 | Chrome headless + CDP，390×844 @2x（2026-10-23）；历史记录另含 701×781 @2x、375×812 @2x、750×1247 |
| 服务 | `python3 -m http.server 8000 --bind 127.0.0.1`（仓库根，访问 `/dist/web/`） |

## 已执行命令

| 命令 | 结果 |
|---|---|
| `corepack pnpm test` | 67 项全部通过（shared 与 game 共 9 个测试文件） |
| `corepack pnpm build` | web / wechat / douyin 三端构建成功 |
| `corepack pnpm verify:dist` | OK：产物存在、探针隔离、版本注入、单包结构（无分包字段）、体积预警线 |
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
- 三端 bundle 内 `extraBall` / `skillCharge` 零命中，广告点位只剩 `revive` / `skill`。

## 验收标准对照

| # | 验收项 | 证据 | 结论 |
|---|---|---|---|
| 1 | 三端构建、体积、探针 | 构建输出、`verify-dist.mjs` | 通过 |
| 2 | 确定性物理 600 步一致、四类碰撞、有限坐标 | `packages/shared/test/physics.test.mjs` | 通过 |
| 3 | 清除率移除：障碍不计入剩余数、剩余归零过关 | `physics.test.mjs`「障碍不计入剩余数，破坏完触发过关」「部分破坏只减少剩余数」；共享层无 `clearPercent` 导出 | 通过 |
| 4 | 8 球上限、球球碰撞无粘连 | `physics.test.mjs` 对应用例 | 通过 |
| 5 | 球色伤害 / 分裂规则 | `physics.test.mjs`「球色：蓝对硬砖 1 伤，红对硬砖 2 伤，绿命中分裂」 | 通过（规则层） |
| 6 | 四技能无充能即时施放、加宽/减速叠层、奖励掉落接到即施放 | `physics.test.mjs` 多球 / 加宽 / 减速 / 分裂 / 奖励掉落用例；浏览器 `castSkill` 与广告链路实测 | 通过 |
| 7 | 存档往返、旧金币字段丢弃、损坏降级 | `packages/shared/test/save.test.mjs` | 通过 |
| 8 | 两个广告点位（复活 / 技能施放）与广告暂停 | web 模拟广告浏览器核验 22 项（见下） | 通过（模拟链路） |
| 9 | 30 关 schema、主题、难度带砖数、每关 6 块分散奖励砖、减益数量、底三行与挡板间隙 | `scripts/validate-levels.js`、`apps/game/test/levels.test.mjs`、生成器统计（最近两块 5.8–10.8 格，最底行 24，间隙 52.5px） | 通过（关卡数据本轮未改） |
| 10 | 三种减益砖掉落、接到生效、永久叠加、颜色 + 图标编码、状态条层数 | `physics.test.mjs` 减益用例；`render.test.mjs` 减益状态条用例；浏览器 debug 触发实测 | 通过 |
| 11 | demo1 三视口静态走查 | Ticket 02 记录（390×844 / 768×1024 / 750×1334） | 通过 |
| 12 | 无首页、浏览器全流程、控制台无报错 | 下表 | 通过 |
| 13 | 真机走查清单 | [`device-checklist.md`](device-checklist.md) | 已更新 |
| 14 | 卡片铺底、失败线与手势接管 | `apps/game/test/render.test.mjs` + 历史真实 PointerEvent 记录（见下节） | 通过 |

关卡统计：30 关（animals 1–10、flowers 11–20、scenery 21–30），可破坏砖块 72–264 块/关、合计 5028，奖励砖 180（每关 6 块，最远点采样分散），减益砖 79（0/1/2/3/4 块递增，shrink 26 / speed 26 / reverse 27），障碍 57，硬砖 1200（比例 6%→36%），调色板上限 16 色，球速 560→734。所有关卡可见最底砖块均在 24 行，挡板间隙 52.5px。

## 浏览器端到端记录（2026-10-23）

以 Chrome headless + CDP 驱动 `http://127.0.0.1:8000/dist/web/index.html?adMs=700`，清空存档后用 `window.__MOSAIC_DEBUG__` 执行，22 项断言全部通过：

1. 冷启动直达局内：`modal=null / phase=ready / paused=false`，无开局弹窗、无首页，`rects.modal=null`；HUD 从 `0 / 72` 起算，无「剩余 / 总数」与「可破坏」文字。
2. 准备态点击分裂格：停泊球阶段 `skillCanCast[2]=false`，点击只 toast「没有运动中的球」，`modal=null / adBusy=false`，不拉广告。
3. `castSkill(1)` 加宽一层 → `paddleW=210`（150×1.4）；`castSkill(3)` 减速两层 → 倍率 0.7225；`triggerDebuff('shrink')` 两次 + `triggerDebuff('speed')` 一次 → `paddleW=88.725`（150×1.4×0.65²），`debuffs={shrink:2,speed:1,reverse:0}`。
4. 点击棋盘发球 → `phase=playing / time>0`。
5. 点击多球格 → 立即 `modal=ad / adBusy=true / paused=true`，没有确认层；广告期间等待 300ms 后 `sim.time` 保持点击时的值不变；广告结束 `modal=null / paused=false`，球数 1→3，快照无 `charges` / `effects` 字段。
6. `setSkillStacks({widePaddle:3,slow:5})` → 倍率封顶 `2 / 0.5`；点击已满的加宽格只 toast「加宽已满」，不进入广告。
7. `forceFail` → 失败弹层按钮仅「复活 +1 球（广告）」「重来一局」，无主页；点复活进入广告，结束后 `phase=ready / balls=1 / reviveUsed=true`；二次失败复活按钮为 disabled「本关已复活」。
8. 截图走查：HUD 开局只有「0 / 72」，击碎后变为「1 / 72」递增，全程无「剩余 / 总数」与「可破坏」文字，无 CLEARED 与百分比；四格技能分别呈「看广告」「×1.4」「无目标」「×0.72」态；技能栏上方减益丸为「缩板 ×2」「加速 ×1」，无倒计时；满级态两格显示「已满」；广告弹层显示「多球 立即施放」并压暗背景。

历史浏览器核验（2026-10-21/22）仍有效的部分：卡片铺底与失败线随布局重算、真实 PointerEvent 拖动跨区不断手、多指接管互不抢占、暂停面板五按钮、分享在桌面 Chromium 返回 `false` 并回退提示、控制台仅启动日志。技能充能、点击释放、额外球广告与减益计时相关记录已随本轮模型替换失效。

## 界面铺底、失败线与手势接管核验（2026-10-21，2026-10-22 复核）

派发真实 `PointerEvent`（`pointerdown` 打在 canvas、`pointermove/pointerup` 打在 window，带 `pointerId`），读 `getSnapshot()` 的 `dragging / paddleTarget / phase / modal`：

| 场景 | 观测 |
|---|---|
| 设计坐标 (375, 260) 按下 | `paddleTarget=357`（= 375−18）、`dragging=true`、`phase: ready → playing`（按下即发球） |
| 拖到 (690, 1331)，即屏幕最底 | `paddleTarget=639`（棋盘内钳制）、`dragging=true` —— 越过棋盘下沿与技能栏上沿不再断手 |
| 抬手 | `dragging=false`、`paddleTarget=639` 保留不回中 |
| HUD 空白 (210, 96) 按下 | `paddleTarget` 不变、`dragging=false` |
| 技能格中心按下（2026-10-23 变更） | 直接 `modal=ad / adBusy=true / paused=true`，`dragging=false`、挡板不动；不再有确认层 |
| 广告播放中 | `sim.time` 冻结，球与减益层数不变 |
| 卡片左侧窄边 (10, 1200) 按下 | `dragging=true`、`paddleTarget=75`（钳制到挡板半宽）、`phase: ready → playing` —— 卡片外、操作区内也能起手 |
| 接管中拖到卡片右侧外 (740, 900) | `dragging=true`、`paddleTarget=639`；抬手后保留 639 |
| 手指 4 拖动中，手指 5 在面板底部按下并移动 | `paddleTarget` 保持 412 不被抢；手指 4 继续跟随到 232；释放后手指 6 按下重新接管到 602 |

视口与布局读数均符合定案：

- 701×781（fallback，bleed 1197.35）：`panel = { x: 18, y: 140, w: 714, h: 1194 }` → 下沿 1334；`operation = { x: -223.68, y: 140, w: 1197.35, h: 1194 }`；`dividerY = 1198`、`failY = 1038`（= 1198 − 160）；四格技能 `{ x: 18/201/384/567, y: 1198, w: 165, h: 112 }`。
- 375×812（fit，designH=1624）：`panel = { x: 18, y: 140, w: 714, h: 1484 }` → 下沿 1624；`operation = { x: 0, y: 140, w: 750, h: 1484 }`；`dividerY = 1488`、`failY = 1328`；四格技能 y=1488，底边 1600，距屏底 24。
- 390×844 视口切换后：`dividerY=1487.08`、`failY=1327.08`、`panel bottom=1623.08`，失败线随布局重算，球未在旧位置误判。
- 单测覆盖 `safeBottom` 0/34/68 × 设计高 1334/1624/1900：卡片始终到物理底、`dividerY` 等于技能栏上沿、`failY = dividerY − board.y`，技能格底边不越入安全区。
- 两视口截图确认：HUD 左侧暂停 + 关卡号、居中递增的已清除 / 总数数字、右上无控件；四格技能等宽常驻并贴齐棋盘左右边；toast 位于技能栏上方；卡片上沿两角可见、下沿无可见边界。

## 数据层覆盖摘要

- 物理：同种子同输入 600 步逐帧一致；球-砖正面/侧面/角落、球-墙三面、挡板左中右、球-球对心碰撞与位置分离；自定义 `failY` 下球与掉落物落到失败线即移除。
- 技能：无充能 / 无时长限制，`castSkill` 为唯一施放入口；多球每次 +2 且受 8 球上限；分裂对每颗移动球各生成一颗同色同速球（±30°、带 0.3s 分裂冷却），停泊球不参与，无移动球返回 `noMovingBall`，接近上限记 `splitBlocked`；加宽 +0.4/层、封顶 2×、最多 3 层，减速 ×0.85/层、封底 0.5×、最多 5 层，均本关永久；`skillCanCast` 统一门控技能格广告与奖励掉落随机池。
- 掉落：奖励砖击破必掉随机可用技能，四个都不可用发 `skillFull` 且不掉落；技能掉落被挡板接到立即施放，接到时已满发 `skillWasted`，漏接发 `dropLost` 且不施放；减益砖掉落固定类型减益物，接到才 `triggerDebuff`，漏接不生效，砖块仍计入剩余数。
- 减益：缩短 0.65×/层、加速 1.3×/层，永久叠加并与加宽/减速相乘；反向为二元状态、永久镜像输入；状态条只显示类型与累计层数，无倒计时。
- 存档：默认结构、序列化往返、损坏/缺字段/越界降级、损坏回写、旧档 `coins` / `slotCapacity` 等未知字段丢弃且 `highestLevel` 保留；运行期技能层数与减益层数不持久化。
- 关卡：30 关 schema、主题数量、难度带砖数、每关奖励砖 6 块且分散、减益数量与类型、底三行留空、最底行 24 与挡板间隙、PNG 管线量化与解析。
- 渲染契约：布局在 1334/1400/1624/1900 设计高度下坐标合法；游戏面板与棋盘同宽铺到设计底边、分隔线等于技能栏上沿、`failY = dividerY − board.y`、四格技能 165×112 等宽贴齐棋盘、按钮在左上、操作区通宽、技能格避让 `safeBottom`；砖块四态 + 减益三态、HUD（仅递增的已清除 / 总数，无说明文字）、技能栏（看广告 / 已满 / 无目标 + 倍率徽标）、减益状态条、弹层坐标均为有限值，不绘制清除率与倒计时。

## 未验证项与风险

| 项 | 状态 | 说明 |
|---|---|---|
| 微信/抖音真机启动、触摸 | 未执行 | 由用户按 `device-checklist.md` 执行 |
| 真实激励视频两通道 | 未执行 | `apps/game/src/config/ads.js` 当前为空，走模拟广告；`revive` / `skill` 填入真实 ID 后需真机验收 |
| 微信/抖音分享卡片 | 仅 web 回退验证 | 真机分享标题/封面/query 待验 |
| 低端机帧率、发热、内存 | 未执行 | 已做 bitmap-cache、零逐帧渐变、粒子上限；仍需真机观察 |
| 关卡像素画辨识度 | 未执行 | 需人工在 demo 或真机逐关走查 |
| 掉落手感与减益平衡 | 待人工走查 | 奖励/减益掉落改为必须挡板接到，漏接成本与掉落下落速度（230px/s）需试玩；减益永久且最多 4 块（单类最多 2）最坏 0.42× 挡板 / 1.69× 球速，需确认难度可接受 |
| 加宽 / 减速封顶节奏 | 待人工走查 | 加宽 3 层、减速 5 层，奖励掉落随机可能长期不给同一技能；需确认单局技能分布不憋屈 |
| 音频 | 接口预留 | V1 无音频资源，`audio.play` 为 no-op |
| 金币与技能槽扩容 | **已确认移除（2026-10-22）** | 旧档 `coins` / `slotCapacity` 自动丢弃，不保留兼容入口 |
| 红/绿球产出入口 | **待确认** | 规则与测试已实现，但当前关卡初始球、多球技能、奖励掉落均只产出蓝球；玩家尚无法获得红/绿球 |
| 软著材料 | 未产出 | 截图/录屏入口见下节，申请材料按 REQ-002 第 1 项推进 |

## 截图、录屏与软著入口

建议素材清单（真机或 750 宽浏览器环境，统一竖屏原图）：

1. 启动 loading（版本号可见）。
2. 冷启动直达的准备态（HUD 关卡号 + 0 / N 计数、技能栏 4 格常驻、toast「点击棋盘发球」，无开局弹窗）。
3. 局内 HUD + 宝石砖块 + 四格技能栏（优先选含硬砖、障碍、奖励砖、减益砖与减益状态条的第 20 关）。
4. 技能格广告播放中弹层（展示「××立即施放」与暂停压暗背景）。
5. 失败面板 + 复活广告入口。
6. 过关结算 + 下一关入口；暂停/设置面板与分享面板。

操作入口：web 端可在控制台通过 `window.__MOSAIC_DEBUG__` 的 `startLevel(id)` / `forceClear()` / `forceFail()` / `setSkillStacks({widePaddle,slow})` / `castSkill(i)` / `useSkill(i)`（广告链路）/ `triggerDebuff('shrink'|'speed'|'reverse')` 构造画面；微信/抖音包不含探针，需自然游玩或使用开发者工具。素材目录建议与 `~/game/qian/软件著作权申请资料/` 的先例对齐，截图不入版本库；申请表、源代码材料和操作手册按 REQ-002 第 1 项另行整理。

## 下一步

1. 用户执行微信/抖音真机走查（`device-checklist.md`），回报问题后按记录修复。
2. 确认红/绿球产出方式（新增掉落类型、关卡初始球色或其它规则），确认后再改 spec 与实现。
3. 配置 `apps/game/src/config/ads.js` 的真实广告位 ID（`revive` / `skill`），复验两通道并补齐分享/广告素材。
4. 推进 REQ-002 的软著、主体、类目、备案与隐私协议。
