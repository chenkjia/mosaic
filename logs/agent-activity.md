# Agent 活动日志

> 对产生文档、代码、资源或决策的任务追加记录。格式：日期、REQ、关键决定、验证结果、剩余风险与下一步。可参考 sanguoV2 / qian 仓库同名文件的记法。

## 2026-09-16 · canvas-minigame.md 增「布局语言」节（模板反哺）

- qian ADR-0004 + sanguoV2 REQ-040 两仓验证的多分辨率经验沉淀为通用五条：fit-width 默认（设计基准常量降级为参考值）、安全区 seam（贴底装饰穿 home indicator、可交互区收在可视段）、MIN_DESIGN_H 宽屏保底回退、新增高度显式分配（比例实机预览定案）、多分辨率真实尺寸断言口径。
- 同轮以本模板为基准审查两个成熟项目：sanguoV2 建多分辨率提案 REQ-067 + 验证条款对齐三层口径；qian 删 vendored skills、docs/skills 补齐至 8 份、验证条款对齐、采纳 pre-commit 自动构建。

## 2026-09-16 · 六技能集成（分析定案，全按推荐）

- 删除 .zcode/skills/game-feel 双份副本（与 .agents/skills 版零漂移确认后删），保留单一来源。
- README 流程速览补三行：阶段工具映射（grill → /to-spec+codebase-design → /to-tickets → implement/tdd → /code-review）、game-feel 边界句（项目负面约束优先于技能默认通道，先例 sanguoV2 不整屏位移）、h5-mini-game-generator 定位（独立小游戏快车道，产物进正式工程须走 matt-workflow 门禁）。
- matt-workflow.md Spec 节注明 Seams 用 codebase-design 词汇（module / interface / seam / adapter）。
- issue-tracker.md 增 ready-for-agent = todo 同义词行；sanguoV2/qian 同步。
- code-review 硬编码 tracker 路径（docs/agents/）与实际（docs/skills/）的偏差经两项目实战验证可自愈，定案不处理。
- sanguoV2 REQ-067 已按 to-tickets 约定拆 5 票，暂不实施（用户指令）。

## 2026-10-21 · Mosaic 立项：模板落地 + REQ-001 设计定案

- REQ：REQ-001（核心玩法 V1）、REQ-002（上线与商业化待办）。
- 关键决定（用户 grilling Q1–Q27 确认，末轮「确认；全按推荐」）：
  - 2D 平面棋盘 + 伪 3D 宝石砖块，不做真 3D/透视/WebGL（ADR-0002）。
  - 原生 Canvas 2D 渲染，不引渲染引擎（ADR-0001）。
  - 球间弹性碰撞保留、球数上限 8；三球色、四砖型、无星级、只记最高关。
  - 固定步长 1/120s + xorshift32 显式种子，物理可复现（ADR-0003）。
  - V1 纯单机本地存档；商业化仅激励视频（复活/额外球/双倍金币）+ 分享，无内购。
  - 30 关 = 3 主题 × 10 关，21×28 像素画 → 16 色量化 → 关卡 JSON。
- 产物：`AGENTS.md` 项目参数与玩法定案、`CONTEXT.md` 术语表、REQ-001/002、`.scratch/mosaic-core/spec.md` 与 8 张 tickets、ADR-0001/0002/0003。
- 验证：文档相对链接检查通过；术语表与 spec/REQ 用词一致；代码未实施，无构建/测试可跑。
- 剩余风险：球间碰撞在低端真机的手感与性能未验证；30 关美术产能与量化效果待 demo1 校准；软著、广告位、平台资质尚未启动。
- 下一步：用户确认 REQ-001 + spec 后，从 Ticket 01（脚手架/构建/adapters）开始实施。

## 2026-10-21 · Git 操作授权调整

- 用户指令「Git 你也自行操作」：agent 接管 `git add` / `commit` / `push` 与仓库级 `git config`，不再留给用户执行。
- 已执行 `git config --local core.hooksPath scripts/git-hooks`，pre-commit 自动构建生效（当前 apps/game 无 build script，hook 跳过）。
- 破坏性操作边界保留：`push --force`、`reset --hard`、删除分支/远程分支仍需先确认。根 `AGENTS.md` 与 README 已同步。

## 2026-10-21 · REQ-001 / Ticket 01 工程骨架与三端 adapter

- Status：Ticket 01 done。
- 实现：`apps/game/src/platform/`（contract + web/minigame adapter + 750 坐标换算 + KV storage）、boot/loading（主包纯代码）、`pkgGame` 分包空主页、esbuild 三端构建与平台模板。
- 关键决定：主包入口不 import 游戏代码，分包走运行时 `require('./pkg-game/index.js')`；web 单 bundle，`loadSubpackage` 直接就绪但保留 loading 时间下限；`platform/index.js` 为 contract + 三端工厂出口。
- 验证：`corepack pnpm install` 通过；`node --test` 10/10；三端构建成功（主包 0.01MB / 分包 0.00MB / 总包 0.02MB）；`dist/web/index.html` 在 `file://` 与 8000 端口均输出 `[game] boot 0.1.0` → `[boot] home 0.1.0`；主包 grep 无主页文案；微信/抖音分包字段大小写正确。
- 踩坑 1：pnpm 10 拦截 esbuild postinstall，但 0.28.2 的平台二进制经 optionalDependencies 提供，构建正常；已回写 `apps/game/AGENTS.md`。
- 踩坑 2：pre-commit 直接调用 `pnpm`，本机仅 corepack 提供 pnpm，首次提交被 hook 阻断；hook 改为优先 `pnpm`、缺失时回退 `corepack pnpm`。
- 下一步：Ticket 02 `apps/demo/demo1/` 伪 3D 宝石砖块校准页，视觉经用户确认后冻结并 port 进游戏。

## 2026-10-21 · REQ-001 / Ticket 02 demo1 伪 3D 砖块校准页

- Status：Ticket 02 in_progress，实现与三视口核验完成，待用户视觉确认后冻结。
- 产物：`apps/demo/demo1/index.html`、`demo1.js`、`README.md`。零构建、`file://` 直开，`?view=` / `#view=` 模拟 390×844、768×1024、750×1334。
- 视觉：750 设计宽 + 1334 最小高；21×28 棋盘、格 34、内缩 1.5、圆角 7、714×952；16 色马卡龙调色板；普通/硬砖（裂纹 + hp 点）/障碍（斜纹）/奖励（菱形）四态；爱心像素画内含 6 块障碍与 5 块奖励。
- 验证：`node --check` 通过；浏览器无 console 报错；701×781 实时 fallback、390×844 fit、768×1024 fallback、750×1334 fit 截图逐项走查，`scrollWidth/Height` 与视口一致；`G` 网格线与格子对齐。
- 踩坑 1：浏览器对 `file://` 导航丢弃 query，`?view=` 读不到 → 增加 `#view=` 解析，README 标注两种写法。
- 踩坑 2：`CLEARED · 0%` 使用白色在浅色 HUD 上不可见 → 改深紫；障碍砖原本放在爱心外呈漂浮块 → 移入爱心内部。
- 踩坑 3：实时视口下右上 badge 压住 HUD，底部提示在浅底上不可见 → 实时诊断移入画布底部留白（design y=1248），提示改深紫胶囊底。
- 下一步：用户确认视觉 → 冻结 demo1 → Ticket 03 共享确定性物理。

## 2026-10-21 · REQ-001 / Ticket 03 共享确定性物理与规则核

- Status：Ticket 03 done。
- 产物：`packages/shared/src/{constants,level,palette,physics,rng,save,index}.js`；`packages/shared/test/{physics,level,save}.test.mjs`（25 项）。
- 关键决定：固定步长 1/120s、单帧最多 8 步；xorshift32 显式种子；球-球等质量弹性碰撞 + 位置分离；障碍不入清除率分母；四技能同类刷新、异类共存；存档校验与降级收口 shared。
- 验证：同种子同输入 600 步逐帧一致；球-砖/墙/挡板/球球、8 球上限、三色球、掉落、扩容、存档损坏全部有断言；所有输出坐标有限。
- 剩余风险：红/绿球规则可构造但无玩法产出入口，登记为待确认设计缺口，未擅自改 spec。

## 2026-10-21 · REQ-001 / Ticket 04–05 局内场景与 30 关管线

- Status：Ticket 04、05 done。
- 产物：`gfx/`（宝石砖、bitmap-cache、粒子）、`ui/`（主题、按钮、弹层、toast、HUD、技能槽）、`game/`（布局、存档、音频、home/play 场景）；`scripts/generate-level-art.js`、`level-from-png.js`、`validate-levels.js`、`assets/levels/`、`apps/game/src/data/levels.json`。
- 关键决定：`play.draw()` 内驱动 `tick(now)`；静态砖块单张离屏 canvas 复用，键 `levelId|brickVersion|scale`；球/掉落/粒子/激光为动态层；结算倒计时 6.5s、切后台取消；关卡 JSON 由 esbuild import，无运行时 fetch。
- 验证：30 关校验通过（animals/flowers/scenery 各 10，破坏砖 6674，palette ≤ 16，球速 560→734）；渲染布局在 1334/1400/1624/1900 高度坐标合法；浏览器完成主页 → 预开局 → 发球 → 失败 → 复活 → 结算 → 双倍 → 下一关 → 暂停。
- 踩坑：draw 只渲染不 tick 会让 sim 停在 ready；微信首几次 `createCanvas` 可能返回主画布；截图坐标不是设计坐标。均已回写 `apps/game/AGENTS.md`。

## 2026-10-21 · REQ-001 / Ticket 06–07 技能经济存档、广告与分享

- Status：Ticket 06、07 done（真实广告与平台分享待真机）。
- 产物：`game/saveStore.js`（唯一读写点）、`game/audio.js`（V1 no-op）、`ui/skillBar.js`、主页扩容入口；`platform/minigame.js` 的 SDK 广告/分享/模拟回退；`config/ads.js` 由微信/抖音 entries 注入 `AD_UNIT_ID` / `AD_UNIT_IDS`。
- 关键决定：存档 `mosaic.save.v1` 含最高关/金币/槽容量/音效/音乐；扩容 200/500；结算金币 = 20 + 局内金币；广告位为空走 3 秒模拟广告；分享封面自动补 `pkg-game/` 前缀，V1 不发奖励。
- 验证：浏览器 1000 金币 → 800/3 槽 → 300/4 槽 → 满槽不再扣费；三处模拟广告发奖正确；复活二次失败置灰；分享无 `navigator.share` 时返回 false 并提示；产物无平台全局泄漏。
- 剩余风险：真实广告位、平台分享卡片、广告切后台回前台行为未真机验证。

## 2026-10-21 · REQ-001 / Ticket 08 三端验证、发布材料与收尾

- Status：Ticket 08 done（agent 侧产物；真机走查待用户）。
- 产物：`scripts/verify-dist.mjs`、`docs/verify/REQ-001-verification.md`、`docs/verify/device-checklist.md`；README、REQ-001/002 状态、tickets 03–08、根/游戏端 AGENTS 同步更新。
- 验证：42/42 测试通过；三端构建 web 0.44MB、微信/抖音主包 0.02MB + 分包 0.42MB；`verify:dist` 通过（探针仅 web、版本 0.1.0、分包字段与竖屏正确）；浏览器全流程无 console error。
- 关键修复：结算自动倒计时改用真实 rAF 时间并在切后台取消；bitmap-cache 复用单张离屏 canvas；广告位配置从 adapter 硬编码改为 `config/ads.js` 注入。
- 剩余风险：微信/抖音真机与低端机性能未验证；真实激励视频三通道与分享卡片未验；关卡美术辨识度未人工走查；软著材料未产出；红/绿球缺少玩家可见的产出入口，需用户确认来源后再改 spec。
- 下一步：用户按 `docs/verify/device-checklist.md` 执行双平台真机走查并回报；确认红/绿球产出方式；配置真实广告位；推进 REQ-002 软著与上线资质。

## 2026-10-21 · REQ-001 取消分包，改单包交付

- 触发：微信开发者工具报 `未找到 ["subpackages"][0]["root"] 对应的 /pkg-game/game.js`。根因是分包 root 内必须自带 `game.js`，旧构建只有 `pkg-game/index.js`。
- 关键决定：按用户要求取消分包，微信/抖音改为单包（`game.js` + `game.json` + `assets/`）；删除 `loadSubpackage` seam、`entries/pkg-game.js` 与分享封面 `pkg-game/` 前缀。决策见 [ADR-0004](docs/adr/0004-single-main-package.md)。
- 改动：`boot/main.js` 直接初始化静态引入的游戏模块；`platform/{contract,web,minigame}.js` 移除分包 seam；`scripts/build.mjs` 单入口输出与单包体积；两份 `game.json` 去分包字段；`verify-dist.mjs` 断言无分包且无 `pkg-game/`；manifest/platform 测试与相关文档同步。
- 验证：42/42 测试通过；三端构建各 0.44MB；`verify:dist` OK；`dist/wechat`、`dist/douyin` 仅 `game.js` + `game.json` + `assets/share/cover.png`；web 浏览器启动 `scene=home`、无 console error。
- 剩余风险：真机走查仍需按清单执行；单包 4MB 上限下后续资源增长需靠图集压缩/裁图控制。


## 2026-10-21 · REQ-001 局内界面铺到底 + 手势接管

- 触发：用户反馈手指滑出游戏区域挡板就断手，要求界面直接延伸到屏幕最底。经 grilling 定案 Q28–Q35：面板通宽铺到底、双层保留棋盘底面、控件避让 `safeBottom`、按下跟到抬手、第一根手指独占、空白处按下即发球、触点即位置、只改局内场景。
- 根因：断手不是画布尺寸问题（canvas 本就全屏），而是场景按触点位置过滤输入（`play.js` 的 `inBoard` 矩形）；同时小游戏 adapter 只上报 `touches[0]`，事件没有手指 id，无法实现手势归属。
- 改动：`game/layout.js` 新增 `panel`（HUD 下沿通宽铺到设计底边，兼作操作区判定）与 `safeBottom` 避让；`game/scene/play.js` 拆出 `drawPanel`、新增 `dragId` 接管状态并重写 `onPointer`、快照加 `dragging`；`platform/web.js` 事件补 `pointerId` 且 `pointercancel` 改发 `cancel`；`platform/minigame.js` 逐 `changedTouches` 上报带 `identifier` 的事件并注册 `onTouchCancel`；`game/index.js` 调试 `click` 补发 `end`。
- 术语：`CONTEXT.md` 新增 棋盘 / 游戏面板 / 操作区，改写 挡板（原定义「位置直接跟随触点」与代码不符）。
- 验证：44/44 测试通过（新增面板铺底、安全区避让两组；platform 测试补多指与 cancel 断言）；`build` + `verify:dist` 三端通过（0.44/0.45/0.45MB）；浏览器派发真实 PointerEvent 断言按下即发球、拖到设计底边 `dragging` 保持、抬手保留 639、HUD 空白与技能槽按下不动挡板、第二指不抢接管、调试 click 后真实按下仍可驱动；fallback 与 375×812 fit 两视口面板下沿均等于设计底边；控制台无 error。
- 剩余风险：真机多指与系统手势打断（`onTouchCancel` 在抖音的可用性）未验证，已列入走查清单 2.16–2.19、6.6–6.7；1334 高 + 大安全区的极端组合下提示文字贴近安全区（技能槽仍避让）。
- 下一步：用户真机走查新增条目；面板与棋盘双层质感如需加强对比再调 alpha。


## 2026-10-22 · REQ-001 局内合并卡片铺到屏幕底

- 触发：用户复核 2026-10-21 的铺底改动后仍觉得游戏区域没拉到最底。根因不是判定范围，而是视觉主体：棋盘卡片止于 y=1112，下面的通宽 20% 白面板太弱，眼睛仍把卡片底边当游戏区边界。
- 关键决定（Q36–Q38，取代 Q28、Q29）：游戏面板与棋盘同宽 714、从 HUD 下沿铺到屏幕物理最底；卡内分隔线正对棋盘底边（球出界线）；操作区仍独立通宽。
- 改动：`game/layout.js` 的 `panel` 改为同宽整卡并新增 `operation` / `dividerY`；`game/scene/play.js` 合并绘制单卡 + 分隔线，删除棋盘独立底面，命中判定改用 `operation`，`debugRects` 暴露新矩形；`render.test.mjs` 同步断言；术语表新增 反弹区 / 控制区，改写 游戏面板 / 操作区。
- 验证：44/44 测试通过；三端构建 0.44/0.45/0.45MB，`verify:dist` OK；375×812 fit 与 701×781 fallback 截图确认卡片下沿贴屏；真实 PointerEvent 断言卡片左侧窄边 (10,1200) 起手 `dragging=true`、拖到 (740,900) 仍接管并钳制 639、抬手保留，技能槽与暂停不误触；控制台无 error。
- 剩余风险：真机安全区与系统手势仍待按走查清单 2.16–2.19、6.6–6.7 执行；卡片 alpha 0.40 在低亮度屏上的对比度需真机目检。

## 2026-10-22 · REQ-001 HUD 精简、失败线下移、四技能常驻与广告补给

- 触发：用户要求去掉卡内白线、球落到技能栏上沿再判失败；屏幕尺寸自由适配；右上角让位平台胶囊、金币移除、菜单与关卡号移到左上；左侧主题与总关卡数删除；底部四技能常驻、加大、等宽对齐、难获得但可看广告补充，广告期间整局暂停。grilling 定案 Q39–Q42。
- 关键决定：Q39 四种技能（多球/加宽/激光/减速）各一格、图标常驻、每格上限 1，奖励砖或广告 +1、点击消耗、每关清零；Q40 原卡内分隔线改到技能栏上沿并作为失败线，球与掉落物落到该线即移除；Q41 维持 750 设计宽，窄屏按宽度撑满、宽屏回退 1334 并横向出血；Q42 左上暂停 + 关卡号，中央保留 `CLEARED` 与剩余可破坏数，右上留空。金币、结算双倍与扩槽随 Q39 一并移除，用户于同日明确确认。
- 改动：`packages/shared` 的 `constants/physics/save/index` 改为 `failY` + `charges` + `addSkillCharge/activateSkill`，奖励砖按 50% 掉技能、存档去掉 coins/slotCapacity 并迁移旧档；`game/layout.js` 重写技能栏几何与 `dividerY/failY`；`game/scene/play.js` 同步失败线、四格技能栏、空槽广告弹层、广告暂停与 `debugSetCharges`；`ui/hud.js`、`ui/skillBar.js`、`scene/home.js`、`config/ads.js`、`game/index.js` 同步；单测与 `docs`（CONTEXT、AGENTS、REQ-001/002、spec、tickets 06/07、验证报告、真机清单）更新。
- 验证：`corepack pnpm test` 46/46 通过（shared 26 / game 20）；三端构建 0.44MB；`verify:dist` OK。浏览器读布局：701×781 fallback `dividerY=1198 / failY=1038`，375×812 fit `dividerY=1488 / failY=1328`，390×844 切换后 `dividerY=1487.08 / failY=1327.08`；四格技能 18/201/384/567、165×112、底边距屏 24；真实 PointerEvent 拖到屏幕底仍保持接管，抬手不回中；空槽弹层 `paused=true`，广告中 `adBusy=true` 且 `sim.time` 冻结在 0.2333，看完 `charges[i]=1`；暂停按钮打开六按钮面板；console 无 error。
- 剩余风险：真机、真实广告位（`revive/extraBall/skillCharge`）、分享卡片、低端机性能仍待用户按 `device-checklist.md` 执行；红/绿球仍无玩家可见产出入口；50% 技能掉落率与单格上限 1 次为调参项，待用户复核。

## 2026-10-22 · REQ-001 用户确认移除金币

- 触发：用户明确要求更新 REQ-001，确认移除金币。
- 改动：REQ-001 状态、范围 §3 与决策记录补记「金币与技能槽扩容整体移除」；验证报告将该风险从待确认改为已确认。代码与测试无改动。
- 验证：本轮仅文档变更，沿用同日 46/46 测试、三端构建 0.44MB 与 `verify:dist` 通过结果。
- 剩余风险：红/绿球产出入口仍待确认；50% 掉落率与单格上限 1 次为调参项；真机走查未执行。

## 2026-10-22 · REQ-001 奖励砖必掉 + 移除首页

- 触发：用户反馈「奖励砖怎么没有掉东西」，并要求「不需要首页，直接简单粗暴」。按推荐默认执行：奖励砖必掉、掉落仍需挡板接住；启动直达最高关预开局；暂停保留继续/音效/音乐/分享/重开。
- 根因：奖励掉落原为 50% 概率，且四格技能全满时静默返回，玩家无法区分「没触发」与「已满」，看起来像奖励砖不掉东西。
- 改动：`packages/shared/src/constants.js` 将 `RULES.skillDropChance` 改为 1；`physics.js` 在四格全满时发 `skillFull`（`skill: null`）且不生成掉落物；`play.js` 据此提示「四个技能都已就绪」。删除 `apps/game/src/game/scene/home.js`；`game/index.js` 只创建 `play` 并启动 `store.get().highestLevel`，移除场景分支、`backHome` 与 `onExit`；`play.js` 删除预开局/暂停/结算/失败弹层的 home 按钮与 `handleAction('home')`；`boot/main.js` 启动日志改为 `[boot] play`。
- 测试：`physics.test.mjs` 去掉种子轮询，固定种子断言每块奖励砖必掉且可拾取；新增四格全满时 `skillFull` 且零掉落用例。测试总数 46 → 47。
- 文档：REQ-001（范围、验收 6/11、决策记录）、验证报告、真机清单（含 3.8 满格奖励砖）、README、根/游戏端 AGENTS、spec、ticket 06、活动日志同步；首页相关口径全部删除。
- 验证：`corepack pnpm test` 47/47 通过（shared 27 / game 20）；三端构建 web 0.43MB、微信/抖音 0.44MB；`verify:dist` OK。清空存档后浏览器冷启动 `scene=play / levelId=1 / modal=preRound`，按钮仅 `start / extraBall`；四类弹层按钮分别为 `start+extraBall`、`resume+sound+music+share+restart`、`next`、`revive+retry`，均无 home；复活广告后 `reviveUsed=true / phase=ready`，技能补给广告后 `charges[0]=1 / paused=false`；控制台仅 `[game] boot 0.1.0`、`[boot] play 0.1.0`，无 error。
- 剩余风险：奖励砖掉落与满格提示的真机视觉未人工走查；分享卡片 query 仍不决定进入关卡（与改动前一致）；红/绿球产出入口仍待确认；真机、真实广告位与低端机性能待用户按 `device-checklist.md` 执行。
- 下一步：用户真机复核奖励砖必掉与无首页启动；确认红/绿球产出来源；配置真实广告位。
