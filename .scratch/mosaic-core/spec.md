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
| ui | `apps/game/src/ui/` | HUD、技能槽、按钮、弹层；每个组件自带规格表 |
| scene | `apps/game/src/scene/` | `home`、`play`、`result`；只组合 ui/gfx |

## Implementation Decisions

### 坐标与布局

- 业务层固定 750 设计宽，fit-width：`scale = vw / 750`，运行时 `designH = vh / scale`。
- 棋盘 21 列 × 28 行，格 34 设计 px，砖块内缩 1.5px 形成缝隙；棋盘尺寸 `714 × 952`，水平居中。
- 顶部 HUD 高 140，棋盘顶 `y = 160`；游戏面板从 HUD 下沿通宽铺到设计高度底边（含窄屏出血区），既是可见底衬也是操作区判定范围，棋盘圆角底面叠在其上标示反弹边界；技能槽与提示文字自「底边 − `safeBottom`」向上排布。宽屏按 `MIN_DESIGN_H = 1334` 回退等比留边。
- 主画布物理分辨率 `canvas.width = screenWidth × pixelRatio`，触摸换算读画布实际尺寸。

### 物理与确定性

- 固定步长 `1/120s`，帧循环用累加器，单帧最多补 8 步；禁止用可变 delta 直接推进。
- 球：半径 9，速度 640 px/s（可被减速技能乘 0.7）；挡板：宽 150、高 22，y 固定在棋盘底上方 40。
- 球-砖、球-墙用圆 vs AABB / 线段的扫掠检测；球-球为等质量弹性碰撞 + 位置分离（防重叠粘连）；球与挡板按击球点线性映射反射角，限制在 15°–75°。
- 球数上限 8；达到上限后分裂与额外球不生成。
- 随机性：`xorshift32`，种子 = 关卡 id + 存档内关卡尝试计数；掉落与分裂方向全部走该 RNG，禁止 `Math.random()`。
- 球色：蓝=普通（对硬砖 1 伤）；红=强力（对硬砖 2 伤，可直接击碎 1 层）；绿=分裂（命中砖块后分裂出 1 颗蓝球，冷却 0.3s，受上限约束）。
- 发球：球吸附在挡板中心，在操作区空白处按下即以 75° ± 5° 向上发射；同屏多球时每颗独立。

### 砖块与关卡

- 砖块类型：`normal`（hp1）、`hard`（hp2 或 3，hp1 时显示裂纹）、`obstacle`（不可破坏、不计入清除率分母）、`reward`（hp1，掉落）。
- 掉落：奖励砖击破后 50% 金币（1–3）、50% 随机技能；掉落物下落到挡板区域自动拾取。
- 清除率分母只统计 `normal + hard + reward`；障碍不计。
- 关卡 JSON：

```json
{
  "id": 1,
  "theme": "animals",
  "cols": 21,
  "rows": 28,
  "palette": ["#RRGGBB", "..."],
  "seed": 1001,
  "ball": { "count": 1, "speed": 640 },
  "bricks": [{ "x": 3, "y": 4, "type": "normal", "color": 2, "hp": 1 }]
}
```

- 行数允许小于 28，底部对齐到棋盘底或按关卡中心对齐（由 `anchor` 字段决定，默认 center）。
- 离线管线：源图 21×28 PNG（透明=空格）→ 量化到 palette（最多 16 色）→ 合并相邻同色同类型格 → 输出 JSON；脚本 `scripts/level-from-png.js`，派生数据不手改。

### 技能与金币

- 技能槽默认 2 格，金币扩容：第 3 格 200、第 4 格 500；存档持久化。
- 技能效果：多球 +2（受 8 球上限）、加宽挡板 ×1.4 持续 15s、激光 10s（每 0.5s 对最近一列首个砖块造成 1 伤）、减速 0.7× 持续 10s。
- 同类型技能不可叠加持续时间，取刷新；不同技能可同时生效。
- 金币：过关 +20；结算看激励视频 ×2；只用于扩容，不做购买。

### 存档

- 键：`mosaic.save.v1`；结构 `{ version: 1, highestLevel, coins, slotCapacity }`。
- 读：解析失败/字段非法 → 返回默认档并覆盖；写：单点封装，禁止散落 `storage.set`。
- 关卡内状态（剩余球、技能剩余时间）不持久化；重进从本关开始。

### 广告与分享

- 广告点位 `revive` / `extraBall` / `doubleCoins`；`showRewardedAd(placement)` 返回是否完整观看。
- 未配置 `AD_UNIT_ID`：走模拟广告层（3 秒倒计时 + 结算卡），web 与真机同链路；配置后自动切平台 SDK。
- 复活：每关仅一次，恢复 1 颗球吸附在挡板上；失败面板在看过后置灰。
- 开局额外球：进入关卡前可选，观看后本关初始球 +1。
- 双倍金币：结算时可选，观看后本次金币 ×2。
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

- `boot`：初始化游戏模块 → 读存档 → 进入 home。
- `home`：标题 + 继续（最高关）+ 设置；无开始/关卡选择。
- `play`：HUD（金币、关卡号、清除率、技能槽、暂停）→ 发球 → 局内 → 过关/失败。
- 触控接管：操作区内按下即接管挡板横向位置，跟随到抬手/取消，越出棋盘与面板边缘不打断；第一根手指独占，其他手指只响应按钮；技能槽与暂停只在按下的那一点判定，优先于接管与发球；抬手后端点留在最后位置；弹窗打开与切后台立即释放接管。
- `result`：过关结算（金币、下一关按钮）；失败面板（复活/重来）。
- 暂停：音效/音乐开关、继续、退出到 home。

## Testing Decisions

- 数据层用 `node:test`（零依赖）：
  - 确定性：同种子 + 同输入 600 步，两次状态哈希一致。
  - 碰撞：球-砖正面/侧面/角落、球-墙、球-挡板三点击球点、球-球对心/偏心。
  - 规则：清除率分母、过关判定、球数上限、球色伤害、技能倍率、金币扩容。
  - 存档：往返、缺字段、损坏 JSON、版本迁移。
- 关卡：`scripts/validate-levels.js` 校验 30 关 schema、可破坏砖块数、网格越界。
- 浏览器核验：`apps/demo/demo1/` 静态页三尺寸截图对照；正式版主页/结算等确定性页面自动点击 + 截图。
- 操作区与接管：`apps/game/test/render.test.mjs` 断言面板通宽铺到设计底边、控件避让 `safeBottom`；接管语义在浏览器派发真实 PointerEvent，读调试快照 `dragging`/`paddleTarget` 断言跟到屏幕最底、抬手保留、第二指不抢、HUD 空白不动挡板。
- 动画、手感、音效不做截图验证：产出人工走查清单（微信/抖音真机各一份），按用户回报修复。
- 构建：三端产物存在 + 体积三行 + 探针 grep。

## Out of Scope

同 REQ-001「非范围」：服务端、排行榜、内购、星级、关卡选择、移动砖、多人、裂变奖励、真机提审。
