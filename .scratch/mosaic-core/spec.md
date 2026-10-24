# Spec — Mosaic 核心玩法 V1

关联：REQ-001、REQ-002；术语见 `CONTEXT.md`。

## Problem

把 Midnight Crushers 的打砖块玩法搬到微信/抖音小游戏：原版是带透视的 3D 棋盘，本作要在 2D 平面棋盘上做伪 3D 宝石砖块；要同时产出 web/微信/抖音三端、纯单机、可广告变现。原版的球间碰撞带来混乱与不可控，用户明确要求保留，因此物理必须确定、可测试、可调参。

## Solution

一套 ES modules 源码，三个构建入口；玩法规则全部在 `packages/shared`（纯函数、固定步长、显式种子），渲染与输入在 `apps/game`，平台差异全部收在 `platform` adapter。关卡由「像素画源图 → 16 色量化 → 网格 JSON」离线管线生成，运行时只读 JSON。

## Seams

| Seam | 位置 | 接口 |
|---|---|---|
| platform | `apps/game/src/platform/` | `getSystemInfo()`、`getMainCanvas()`、`loadImage(src)`、`storage.get/set`、`share(payload)`、`showRewardedAd(placement)`、`audio.create(src, loop)`、`onPointer(handler)`（事件 `{type: start\|move\|end\|cancel, id, x, y}`，小游戏端逐 `changedTouches` 上报）、`onHide/onShow` |
| sim | `packages/shared/src/physics.js` | `createState(level, seed)`、`step(state, input, dt)` → `{ state, events }`；不读时间、不读全局随机 |
| level | `packages/shared/src/level.js` | `parseLevel(json)`、`validateLevel(json)`、`gridToBricks(png)`（离线脚本复用） |
| save | `packages/shared/src/save.js` | `defaultSave()`、`migrate(raw)`、`serialize(save)`；损坏降级 |
| gfx | `apps/game/src/gfx/` | `roundRectPath`、`drawGemBrick`、`drawText`、`bitmapCache`、`drawParticles` |
| ui | `apps/game/src/ui/` | HUD、四格技能栏、按钮、弹层；每个组件自带规格表 |
| scene | `apps/game/src/game/scene/` | `play`（含暂停/第 30 关通关/失败弹层，普通关过关撒花后直接下一关，无开局弹层）；只组合 ui/gfx |

## Implementation Decisions

### 坐标与布局

- 业务层固定 750 设计宽，fit-width：`scale = vw / 750`，运行时 `designH = vh / scale`。
- 棋盘 21 列 × 28 行，格 34 设计 px，砖块内缩 1.5px 形成缝隙；棋盘尺寸 `714 × 952`，水平居中。
- 顶部 HUD 高 140，棋盘顶 `y = 160`；游戏面板是与棋盘同宽（714）的一张卡，从 HUD 下沿铺到设计高度底边（含窄屏出血区的物理底），底部圆角落在屏外。
- 四格技能栏固定贴底：`SLOT_W = 165`、`SLOT_H = 112`、`SLOT_GAP = 18`，四格合计正好铺满棋盘宽 714；底边 = `屏幕底 − safeBottom − 24`，上不高于棋盘底 +18。技能栏上沿同时是卡内分隔线与失败线（`layout.dividerY = layout.skill.y`，`layout.failY = dividerY − board.y`）。棋盘底边到失败线之间为下落带，只保留左右反弹。
- 操作区是独立的通宽矩形（HUD 下沿到物理底、左右贴屏），卡片两侧窄边也能起手。宽屏按 `MIN_DESIGN_H = 1334` 回退等比留边。
- 主画布物理分辨率 `canvas.width = screenWidth × pixelRatio`，触摸换算读画布实际尺寸。

### 物理与确定性

- 固定步长 `1/120s`，帧循环用累加器，单帧最多补 8 步；禁止用可变 delta 直接推进。
- 球：基础半径 9、速度按关卡配置（560 → 734 px/s，可被减速/加速技能缩放），半径乘关卡缩放；挡板：基础宽 150、高 22，底边距棋盘底 8px，宽度与高度乘关卡缩放，宽度再叠加技能与减益。
- 球-砖、球-墙用圆 vs AABB / 线段的扫掠检测；球-球为等质量弹性碰撞 + 位置分离（防重叠粘连）；球与挡板按击球点线性映射反射角，限制在 15°–75°。
- 球数上限 8；达到上限后分裂不再生成（记 `splitBlocked`）。
- 随机性：`xorshift32`，种子 = 关卡 id + 存档内关卡尝试计数；掉落与分裂方向全部走该 RNG，禁止 `Math.random()`。
- 球色：蓝=普通（对硬砖 1 伤）；红=强力（对硬砖 2 伤，可直接击碎 1 层）；绿=分裂（命中砖块后分裂出 1 颗蓝球，冷却 0.3s，受上限约束）。
- 大球：`state.bigBall` 每关只能置位一次；施放时所有球 `r = baseBallR × 1.6`、`piercing = true`，之后 `addBall()` 生成的球继承。穿透球与普通/奖励/减益砖持续重叠时立即击碎（走正常 `breakBrick`，奖励/减益照常掉落），与硬砖每次进入重叠扣 1 点耐久，障碍、墙壁、挡板仍按普通碰撞反弹；`pierced` 记录已处理的砖 id，离开后清除。
- 减益在本关剩余时间内永久生效：`shrink` 挡板宽 ×0.65/层、`speed` 球速 ×1.3/层，层数各自累乘、不封顶（生成器保证每关同类最多 2 块，最差 0.42× 挡板与 1.69× 球速）；`reverse` 为二元状态，重复命中不叠加。增益与减益相乘（如加宽 ×0.65）。
- 发球：球吸附在挡板中心，在操作区空白处按下即以 75° ± 5° 向上发射；同屏多球时每颗独立。
- 失败线：`state.failY` 是棋盘局部 y（默认 `BOARD.h`，由测试与默认局使用）；游戏端每帧写回 `layout.failY = skillY − BOARD.y`。球心 + 半径越过 `failY` 即移除，掉落物同；球全部移除 → `failed`。

### 砖块与关卡

- 砖块类型：`normal`（hp1）、`hard`（hp2 或 3，hp1 时显示裂纹）、`obstacle`（不可破坏、不参与剩余计数）、`reward`（hp1，掉落技能掉落物）、`debuff`（hp1，带 `debuff: shrink|speed|reverse`，必掉对应类型减益掉落物，不掉技能）。
- 奖励砖数量与分布：`clamp(round(可破坏砖数/12),1,6)`，由 `scripts/generate-level-art.js` 的 `chooseSpread()` 在非特殊砖格上做确定性最远点采样——首块取离砖块质心最远的格，之后每块取「到已选格最小距离」最大的格，平局用 `hash2(id, x, y)` 稳定决胜；手工 `rewards` 数组不再决定位置。
- 减益砖数量与类型：砖数少于 40 时为 0；否则 4–7 关 1 块、8–12 关 2 块、13–19 关 3 块、20–30 关 4 块；由 `chooseSpread()` 与奖励砖一起做分散采样（奖励砖优先），类型按关卡轮换 `shrink/speed/reverse`，源图 sidecar 记录 `[x, y, kind]`，颜色 + 图标双重编码。
- 关卡缩放与难度带：第 1–6 关使用简化大格图标，直接按图标网格裁到包围盒；第 7 关起把 21×28 精细画裁到非空包围盒。按包围盒宽高计算 `cell = cellForGrid(cols, rows)`：宽度上限 `714/cols`、高度按挡板与 120px 间隙反推，且不超过 `34 × 2.2`、不小于 34，保留两位小数；生成器输出 `cell` 与 `anchor: 'top'`。难度：1–10 关精确目标 10 / 16 / 24 / 34 / 46 / 60 / 76 / 90 / 105 / 120；11–30 关 120–150、150–175、175–199、200–250、250–330。第 1–3 关不生成硬砖、减益砖与障碍，硬砖比例从第 4 关起随 id 上升。
- 掉落：奖励砖击破必掉 1 个技能掉落物（金色菱形 + 技能图标），掉落池只含加宽/分裂/减速，且从当前仍能生效的技能中随机（分裂未达 8 球上限，加宽未到 2×，减速未到 0.5×）；池内技能都不可用时生成 `skillFull` 事件，页面提示。大球不进掉落池，只从技能格广告获得。减益砖击破必掉对应类型的减益掉落物（暗红菱形 + 图标）。两类掉落物都需挡板接到才生效，越过失败线即移除；漏接无任何效果，技能掉落物若在生成到接住之间该技能封顶则作废并提示。
- 剩余计数统计 `normal + hard + reward + debuff`，障碍不计；HUD 只显示递增的「已清除 / 总数」大号数字，无说明文字，不再有清除率。
- 关卡 JSON：

```json
{
  "id": 1,
  "theme": "animals",
  "cols": 4,
  "rows": 3,
  "cell": 74.8,
  "anchor": "top",
  "palette": ["#RRGGBB", "..."],
  "seed": 1007,
  "ball": { "count": 1, "speed": 560 },
  "bricks": [{ "x": 0, "y": 0, "type": "normal", "color": 2, "hp": 1, "debuff": null }]
}
```

- 像素画按非空包围盒裁剪，`originX` 水平居中、`originY = 0` 顶部对齐；运行时砖块边长用 `level.cell`，棋盘仍为 `714 × 952`。未缩放关卡最底砖与挡板间隙 ≥72px，缩放关卡 ≥120px（由 `cellForGrid` 的高度约束与 `validate-levels.js` 保证）。
- 离线管线：第 1–6 关由 `scripts/generate-level-art.js` 内的图标函数生成小网格 PNG；第 7 关起读取 `assets/levels/src/` 的 21×28 源图 → 量化到 palette（最多 16 色）→ 裁到非空包围盒 → 计算 `cell` → 输出 PNG + sidecar；`scripts/level-from-png.js` 再切格、分配奖励/减益/硬砖并输出 JSON，派生数据不手改。

### 技能

- 四个技能固定常驻，顺序 `SKILL_IDS = ['bigBall', 'widePaddle', 'split', 'slow']`；技能本身不需要解锁，也没有充能与时长。
- 技能触发源：奖励掉落物被挡板接到、技能格广告完整看完；触发即调用 `castSkill()` 生效并发 `skillUsed` 事件。大球只能通过技能格广告获得，奖励掉落不会生成大球。
- 状态保留 `state.bigBall` 与 `state.skillStacks = { widePaddle: 0, slow: 0 }`。大球每关一次；加宽每层 ×1.4、封顶 2.0×（最多 3 层）；减速每层 ×0.85、封底 0.5×（最多 5 层）；效果本关永久，过关/重开本关/进入下一关时清零，复活保留。
- 技能效果：大球让所有球半径 ×1.6 并永久穿透（规则见「物理与确定性」）；分裂让场上每颗移动中的球同时生成 1 颗同色球，角度 = 原方向 ±30° 随机、速度相同，停泊球跳过，冷却 0.3s；无移动球时拒绝（`available = false`），达到 8 球上限记 `splitBlocked`。
- 技能格是广告入口 + 状态显示：可用时点击直接调用 `showRewardedAd('skill')`，无二次确认，看完即施放；不可用（大球已施放、加宽封顶、减速封底、分裂无目标）时不拉广告。格内显示当前倍率（如 `×1.4`、`×0.85`），大球施放后与加宽/减速封顶显示「已满」，分裂无移动球显示「无目标」。
- 广告期间 `paused = true` / `adBusy = true`，整局时间冻结；取消或失败不发奖、不改状态。
- 减益状态条：技能栏上方居中显示已吃到的减益（图标 + 累计层数，不显示倒计时）；减益砖击破、掉落被接住/漏接都不弹 toast，只有状态条变化。V1 无金币、无技能槽容量、无扩容；不做内购。

### 存档

- 键：`mosaic.save.v1`；结构 `{ version: 1, highestLevel, sound, music }`。
- 读：解析失败/字段非法 → 返回默认档并覆盖；旧档的 `coins` / `slotCapacity` 等未知字段丢弃，`highestLevel` 保留；写：单点封装，禁止散落 `storage.set`。
- 关卡内状态（剩余球、技能层数、减益层数）不持久化；重进从本关开始。

### 广告与分享

- 广告点位只有 `revive` / `skill` 两处（V1 移除开局额外球）；`showRewardedAd(placement)` 返回是否完整观看。
- 未配置 `AD_UNIT_ID`：走模拟广告层（3 秒倒计时 + 结算卡），web 与真机同链路；配置后自动切平台 SDK。
- 复活：每关仅一次，恢复 1 颗球吸附在挡板上；失败面板在看过后置灰。
- 技能施放：局内（含发球前准备态）点击可用技能格 → 直接拉起激励视频（无确认弹层）→ 看完立即施放该技能；广告期间 `paused = true` / `adBusy = true`，整局时间冻结；取消或失败回到局内且不发奖。
- 分享：`share({ title, imageUrl, query })`；无奖励、无邀请码（V1）。

### 渲染与性能

- 砖块静态层进 bitmap-cache，缓存键 = 关卡 id + 砖块状态版本 + 尺寸；球、掉落物、粒子为动态层。
- 帧循环零分配：渐变、font 字符串、样式对象在循环外准备；`drawImage` 坐标取整。
- 伪 3D 砖块由 `gfx/drawGemBrick` 单点实现：底色填充 → 顶部 1/3 高光 → 底部内阴影 → 圆角描边 → 投影；全部颜色来自关卡 palette。
- 文本必须断言坐标有限（NaN 防护）；`roundRect` 用 `gfx/roundRectPath`（arcTo）。

### 平台与构建

- esbuild 三入口：`src/entries/{web,wechat,douyin}.js`；入口只装配 adapter，不含业务分支。
- 单包交付：`game.json` 不声明 `subpackages` / `subPackages`；游戏代码与图片全部随主包一次加载，微信/抖音共用同一入口逻辑。
- 调试探针只挂 web entry；smoke 脚本 grep `dist/wechat`、`dist/douyin` 无探针符号。
- 版本号取 `apps/game/package.json` 的 `version` 注入，入口打印 `[game] boot <version>`。

### 界面流程

- `boot`：初始化游戏模块 → 读存档 → 直接进入 `play` 的最高关准备态；无首页、无开局弹窗。
- `play`：准备态（提示「点击棋盘发球」）→ HUD（左上暂停 + 关卡号、居中递增的已清除/总数、右上空）→ 四格技能栏常驻 → 发球 → 局内 → 过关撒花后自动下一关 / 失败。
- 触控接管：操作区内按下即接管挡板横向位置，跟随到抬手/取消，越出棋盘与卡片边缘不打断；第一根手指独占，其他手指只响应按钮；技能格与暂停在按下点判定并抢占接管与发球，技能格按下即拉广告；抬手后端点留在最后位置；弹窗打开、广告播放与切后台立即释放接管并暂停。
- `result`：仅第 30 关撒花结束后的「全部关卡完成」弹层（再玩一次）；普通关只撒花并自动进入下一关，不弹结算。失败面板（复活/重来）。不结算金币，无返回主页。
- 暂停：音效/音乐开关、继续、分享、重开本关；无返回主页。

## Testing Decisions

- 数据层用 `node:test`（零依赖）：
  - 确定性：同种子 + 同输入 600 步，两次状态哈希一致。
  - 碰撞：球-砖正面/侧面/角落、球-墙、球-挡板三点击球点、球-球对心/偏心。
  - 规则：剩余计数分母、过关判定、球数上限、球色伤害、技能叠加倍率与封顶封底、技能自动施放（`castSkill`）、大球一次性放大与穿透（普通/奖励/减益即破、硬砖每次 1 伤、障碍反弹、新球继承）、奖励砖必掉且只在奖励池可生效技能中选、奖励池不含大球、接到后封顶作废、分裂全量生成/无移动球拒绝/8 球阻塞、三种减益的层数与永久性、减益掉落接到才生效/漏接无效、自定义失败线。
  - 存档：往返、缺字段、损坏 JSON、旧金币/扩容字段丢弃。
- 关卡：`scripts/validate-levels.js` 校验 30 关 schema、1–10 关精确砖数、11–30 关难度带、奖励砖公式、减益数量、第 1–3 关纯净、`cell` 与 `cellForGrid` 一致、最底砖与挡板间隙（基础 ≥70px、缩放 ≥119.5px）、网格越界。
- 渲染：`apps/game/test/render.test.mjs` 断言减益砖三态、四格技能栏（大球/分裂标签、倍率/已满/无目标状态）、放大格子的砖块绘制坐标、减益状态条的层数显示、HUD 无说明文字与百分比且只显示递增的已清除/总数、撒花粒子忽略非法坐标且下落绘制坐标有限、所有绘制坐标有限。
- 浏览器核验：`apps/demo/demo1/` 静态页三尺寸截图对照；正式版冷启动准备态/暂停/失败/第 30 关通关弹层等确定性界面自动点击 + 截图，断言无开局弹窗与首页入口。第 1 关校验 10 块砖、`cell=74.8`、挡板宽 330、球半径 19.8，施放大球后半径 31.68 且全部穿透；第 7 关 76 块、第 30 关 264 块 / `cell=34.9`。过关撒花不做过程截图验收，浏览器读快照断言 `settled/celebrating/modal/levelId`（普通关 1.4s 后自动进下一关，第 30 关撒花后出通关弹层），视觉密度与手感列入真机走查。
- 操作区与接管：`apps/game/test/render.test.mjs` 断言卡片与棋盘同宽并铺到设计底边、分隔线等于四格技能栏上沿（`failY = dividerY − board.y`）、四格等宽铺满棋盘宽、操作区通宽、技能栏避让 `safeBottom`、HUD 暂停在左上且无金币字段；接管语义在浏览器派发真实 PointerEvent，读调试快照 `dragging`/`paddleTarget` 断言跟到屏幕最底、卡片侧边可起手、抬手保留、第二指不抢、HUD 空白不动挡板。
- 技能施放广告：浏览器驱动可用技能格 → 直接进入广告（`adBusy=true`，无确认弹层）→ 广告中 `paused=true` 且 `time` 冻结 → 完成后对应技能层数/球半径变化、恢复 `paused=false`；大球已施放、封顶或分裂无目标时点击不进入广告。
- 动画、手感、音效不做截图验证：产出人工走查清单（微信/抖音真机各一份），按用户回报修复。
- 构建：三端产物存在 + 体积三行 + 探针 grep。

## Out of Scope

同 REQ-001「非范围」：服务端、排行榜、内购、星级、关卡选择、移动砖、多人、裂变奖励、真机提审。
