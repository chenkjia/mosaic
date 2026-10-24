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

## 2026-10-22 · REQ-001 奖励砖扩量分散 + 拾取与释放分离

- 触发：用户要求「奖励砖要多一点，设置要分散一点。一吃到，直接技能就使用掉了。需要在下面点击。下面点击的话是看广告才有的」。
- 关键决定：奖励砖每关固定 6 块（schema 上限），位置由生成器最远点采样分散，不再使用手工坐标；拾取只把充能存入技能格，不自动释放；必须在底部技能格完成一次点击（按下并抬手、未拖出格）才释放，空格子进入激励视频补给；按下后拖出、位移超 18 设计 px 或按下时未充能均取消。
- 根因：「一吃到就使用」并非数据层自动激活——`collectDrops` 只调用 `addSkillCharge()`；实际是技能格在 `pointerdown` 立即 `useSkill()`，手指按下/经过技能栏就误触发。奖励少且聚簇则是 30 个美术函数里的 3 块手写坐标。
- 改动：
  - `scripts/generate-level-art.js` 新增 `hash2()` 与 `chooseRewards()`（非障碍砖格最远点采样，首块离质心最远，其后最大化到已选格的最近距离，哈希决胜）；`main()` 用生成结果覆盖手工奖励坐标；30 关源图、sidecar 与 `apps/game/src/data/levels.json` 全量重生成。
  - `apps/game/src/game/scene/play.js` 新增 `TAP_SLOP = 18` 与 `slotPress`：按下只记录状态，抬手仍同格且位移合规才 `useSkill()`；拖出/超限/弹窗/广告/暂停清空；拾取与补给 toast 改为「已就绪/已补充 · 点击下方释放」。
  - `packages/shared/test/physics.test.mjs` 新增「奖励砖拾取只充能，点击释放才生效」：拾取后 `charges+1`、`effects` 不启动、球数不变，显式 `activateSkill` 后才开始计时。
- 数据：每关奖励砖 6，合计 180（原 90）；障碍 77、可破坏 6674 不变；同一关最近两块奖励砖相距 5.8–10.8 格。
- 验证：`corepack pnpm test` 48/48 通过（shared 28 / game 20）；三端构建 web 0.43MB、微信/抖音 0.44MB；`verify:dist` OK。浏览器 `?adMs=0`：预开局显示「奖励砖 6」且截图无聚簇；空槽广告后 `charges[0]=1` 且 `effects` 全 0；点击充能格多球生效（球 1→3）；真实 PointerEvent 按下后拖出 120 px 抬手不消耗，原地点击才释放（球 3→5）；激光击碎奖励砖拾取后仅对应充能 +1、`effects` 只有激光计时，证明拾取不自动释放。
- 剩余风险：真机手感与 6 块奖励砖的视觉密度待走查；奖励砖具体位置只在数据层验证分散度，逐关美术辨识度仍需人工；红/绿球产出入口仍未确认。
- 下一步：用户按 `device-checklist.md` 2.8 / 2.9 / 2.20 / 3.3 真机复核；确认红/绿球来源；配置真实广告位。

## 2026-10-22 · REQ-001 分裂技能 + 减益砖 + 难度带

- 触发：用户确认「激光换成分裂」「奖励砖多一点、分散一点」「新增减益砖（缩板/加速/反转）」「关卡按砖数分带、早期像素画更小、挡板与最底砖块留小间隙」。
- 关键决定：`SKILL_IDS` 固定为 `multiBall/widePaddle/split/slow`；分裂对所有未停泊球各生成 1 颗同色球（±30°、同速、8 球上限、无移动球拒绝并保留充能）；新增 `debuff` 砖，类型固定可见（shrink 0.65×/8s、speed 1.3×/8s、reverse 6s），击破立即触发、不掉充能、计入清除率；难度改按砖数 7 段分带，球速与硬砖比例仍缓慢递增；底三行留空，可见最底砖块贴住第 24 行。
- 改动：
  - shared：`constants.js` 增加 `DEBUFF_IDS/DEBUFF`、`SKILL.splitAngleDeg`；`physics.js` 实现 `splitAllBalls`、`triggerDebuff`、挡板缩短/球速倍率/方向反转及事件；`level.js` 解析与校验 `debuff` 砖。
  - 关卡管线：`generate-level-art.js` 改为 `chooseSpread` 最远点采样 6 奖励 + N 减益；`rescale` 按难度带取最大缩放、底部对齐并整体下移消除原画底部透明留白；高关卡从顶部补背景砖；`level-from-png.js` 读取 sidecar 减益并排除特殊砖；`validate-levels.js` 校验难度带、6 奖励、减益数量、最底行 24、间隙 50–56px。30 关全量重生成。
  - 游戏端：移除激光绘制/事件；技能栏分裂图标与标签；`drawGemBrick` 三种减益图标；新增 `ui/debuffBar.js` 状态丸；`play.js` 接入分裂 toast、减益 toast/粒子/音效、挡板着色、`triggerDebuff` 调试入口；`audio.js` 增加 debuff 音效类型。
  - 测试：shared 增加减益解析/校验、三种减益数值与刷新、分裂 1→2/无移动球/8 球阻塞；game 增加减益砖绘制、状态条、难度带/最底行/间隙断言。测试总数 57。
- 数据：30 关可破坏 72–264 块、合计 5028；奖励砖 180（每关 6）；减益砖 79（shrink 26 / speed 26 / reverse 27）；障碍 57；硬砖 1200（6%→36%）；球速 560→734；所有关卡最底可见行 24、挡板间隙 52.5px。
- 验证：`corepack pnpm test` 57/57；`levels:validate` 30 关通过；三端构建 0.43MB 各端；`verify:dist` OK。内置浏览器不可见，改用 Chrome headless + CDP 强制刷新核验：第 20 关 200 砖/4 减益，截图确认底部小间隙与减益图标；停球分裂被拒绝且充能保留；发球后分裂 1→2 同色球；触发三种减益后 `effects≈7.875/7.875/5.875`、`paddleW=97.5`，截图确认三枚状态丸与挡板着色。
- 剩余风险：分裂密度、减益强度与 8 球阻塞提示需真机试玩；关卡美术逐关辨识度未人工走查；红/绿球产出入口仍待确认。
- 下一步：用户按 `device-checklist.md` 2.11 / 2.21–2.25 / 7.9 真机复核；确认红/绿球来源；配置真实广告位。

## 2026-10-23 · REQ-001 技能即时施放 + 技能格广告入口 + 减益掉落

- 触发：用户确认「技能不要有时长限制、技能直接施放；下方技能格只用来通过广告获得并立即施放；奖励砖接到就施放；减益砖也要接到掉落物才生效；去掉清除率」。
- 关键决定：技能取消充能、库存、点击释放与时长概念，`castSkill` 成为唯一施放入口；底部四格只承担广告入口与本关状态展示，点击直接拉激励视频、无确认层，广告期间整局暂停，看完立即施放；奖励砖掉落只在当前仍能生效的技能中随机，挡板接到立即施放，四个都不可用时不掉落并提示，生成后到接到前满级则本次作废；减益砖击碎必掉固定类型暗红菱形，只有挡板接到才生效，漏接不生效，砖块仍计入剩余数；减益本关永久，缩短 0.65×/层、加速 1.3×/层可叠加，反转为二元状态；加宽 +0.4/层封顶 2×（3 层），减速 ×0.85/层封底 0.5×（5 层）；清除率整体删除，HUD 只显示「剩余 / 总数 可破坏」；预开局只留「开始」，广告点位收缩为 `revive` / `skill`。
- 改动：
  - shared：`constants.js` 新增 `SKILL.wideStep/wideCap/wideMaxStacks/slowScale/slowFloor/slowMaxStacks`、`DEBUFF.shrinkScale/speedScale`，删除时长与充能常量；`physics.js` 用 `skillStacks/debuffs` 替换 `charges/effects`，新增 `skillCanCast/skillMultiplier/castSkill/syncPaddleWidth`，奖励/减益砖统一走 `spawnRewardDrop/spawnDebuffDrop`，拾取改用 `castSkill`/`triggerDebuff`，删除 `clearPercent` 与 `stats.destroyed`；`index.js` 导出同步。
  - game：`play.js` 删除 `slotPress/TAP_SLOP/pendingSkill/extraBallBought` 与充能弹层，技能格按下即 `watchSkill`（广告完成走 `castSkill`），预开局只留「开始」，HUD/失败/结算改为剩余数，快照与调试 API 换成 `skillStacks/skillMultipliers/skillCanCast/debuffs/drops`、`setSkillStacks/castSkill/useSkill`；`skillBar.js` 改为看广告/已满/无目标 + 倍率徽标；`hud.js` 去掉 CLEARED/百分比；`debuffBar.js` 改为图标 + 累计层数；`theme.js` 技能提示与减益元数据同步；`config/ads.js` 删除 `extraBall`。
  - 测试：`physics.test.mjs` 重写为 28 个用例，覆盖即时施放、加宽/减速叠层封顶、分裂语义与阻塞、减益掉落接到/漏接、奖励掉落即时施放/满级作废/全满不掉、剩余数过关，并断言旧 API 不再导出；`render.test.mjs` 用新 sim 结构断言 HUD、三态技能格、倍率、减益层数与弹层。
- 验证：`corepack pnpm test` 67/67 通过；`corepack pnpm build` 三端 0.43MB；`corepack pnpm verify:dist` OK，三端 bundle 无 `extraBall`/`skillCharge` 命中。Chrome headless + CDP（390×844@2x，`?adMs=700`）22 项断言全过：预开局只有「开始」；分裂停球不可用且不拉广告；加宽 1 层 `paddleW=210`、减速 2 层倍率 0.7225、缩板 2 层 + 加速 1 层后 `paddleW=88.725`；点击多球格直接 `modal=ad/paused=true`，广告期间 `sim.time` 冻结，结束后球 1→3；满级格不拉广告；失败弹层仅复活/重来，复活广告后 `reviveUsed=true`，二次失败按钮置灰。截图确认 HUD 无 CLEARED/百分比、四格三态与倍率、减益丸「缩板 ×2」「加速 ×1」无倒计时、广告弹层展示「多球 立即施放」。
- 踩坑：改完 shared API 后两个测试文件仍用旧字段，单测直接模块加载失败/读空属性；假 sim 必须补齐 `balls/skillStacks/debuffs`，不能只改渲染函数签名。
- 剩余风险：掉落必须挡板接到，漏接成本与 230px/s 下落速度需真机试玩；减益永久叠加最坏 0.42× 挡板 / 1.69× 球速需确认难度；加宽 3 层、减速 5 层的随机分布可能让单局憋屈；红/绿球产出入口仍待确认；真机、真实广告位、分享与低端机性能待用户走查。
- 下一步：用户按 `device-checklist.md` 2.8–2.13、2.20–2.27、3.8–3.10、4.1–4.3 真机复核；配置 `revive` / `skill` 真实广告位；确认红/绿球来源；推进软著材料。

## 2026-10-23 · REQ-001 移除开局弹窗 + HUD 递增计数 + UI 去「可破坏」

- 触发：用户先提「游戏开始时还需要有开始那个弹窗，顶部数量从小到大，不要可破坏那三个字」，随后澄清「我说错了，我想说的是每一关游戏开始时不需要有开始那个弹窗」「改成递增，不要字」「全部 UI 清掉」。即删除 preRound 弹层，HUD 改为递增的已清除 / 总数且不带任何说明文字。
- 关键决定：开局弹层整体删除，启动 / 重开 / 下一关 / 复活后都直接进入准备态并 toast「点击棋盘发球」；HUD 中央只画大号 `已清除 / 总数` 数字（0 / 72 → 72 / 72），保留左上暂停与关卡号、右上留空；预开局、失败面板、结算与暂停中的「可破坏」字样全部清除，领域术语只保留在文档与代码里。
- 改动：
  - `apps/game/src/game/scene/play.js`：`start()` 直接 `modal=null / paused=false` 并提示发球，删除 `preRoundModal()` 与 `beginRound()`，`handleAction` 去掉 `start` 分支，`debugDismissModal` 去掉 preRound 分支，删除 `THEME_LABEL` 导入；失败面板与结算副标题去掉「可破坏」。
  - `apps/game/src/ui/hud.js`：中央只画 `total - left` 与 `total`，删除「剩余 / 总数」「可破坏」与百分比。
  - `apps/game/test/render.test.mjs`：用例改名并断言 `60 / 140` 存在、「剩余 / 总数」「可破坏」不存在。
  - 文档：根 `AGENTS.md`、`apps/game/AGENTS.md`、`CONTEXT.md`、REQ-001、spec、tickets 06/07、验证报告、真机清单、README 同步直接开局、递增计数与文案清理口径。
- 验证：`corepack pnpm test` 67/67 通过；`corepack pnpm build` web 0.42MB、微信/抖音 0.43MB；`corepack pnpm verify:dist` OK。Chrome headless + CDP（390×844@2x，`?adMs=700`）22 项断言全过：启动 `modal=null / phase=ready / paused=false`、`rects.modal=null`、HUD `0 / 72`；点击后递增 `1 / 72`；分裂停球不拉广告；加宽/减速/减益数值与广告冻结时间、失败复活链路保持不变。截图确认无开局弹窗、HUD 无文字标签，toast 为「点击棋盘发球」。
- 剩余风险：无开局弹层后玩家第一次进入缺少玩法说明，目前仅靠 toast，真机观察是否有理解成本；技能广告在准备态可点但球停泊时分裂格为「无目标」；真机与真实广告位仍待用户走查。
- 下一步：用户按 `device-checklist.md` 1.1–1.6、2.1–2.5 真机复核直接开局与递增计数；评估是否需要在首关加一次性轻量引导。

## 2026-10-24 · REQ-001 挡板下移 + 大球穿透 + 首关 10 块与局部放大

- 触发：用户提出「板要再下一些，不要离砖块太过近；第一个技能改成大球，大球可以直接穿透砖；第一关不要这么难，第一关 10 个砖最多了，慢慢加上来；砖数少的时候局部放大一些，砖和板和球都大一些」，随后回复「确认，按这个方案改」。
- 关键决定：挡板改为底边距棋盘底 8px（原 bottomGap 40），未缩放关卡与最底砖间隙约 72px；第一格技能由多球改为大球，每关一次、所有球半径 ×1.6 并永久穿透，普通/奖励/减益砖进入即破（照常掉落），硬砖每次穿越扣 1 点，障碍与边界仍反弹，之后生成的球继承，施放后显示「已满」，大球不进奖励掉落池；第 1–10 关砖数精确为 10/16/24/34/46/60/76/90/105/120，第 11–30 关保留原难度带；第 1–6 关改用 4×3 至 9×8 的大格图标，第 7 关起回到精细像素画；奖励砖改为 `clamp(round(砖数/12),1,6)`，第 1–3 关无硬砖/减益/障碍，砖数 <40 无减益；每关由网格推导 `cell`（宽高适配、挡板间隙下限、2.2× 上限），砖块/挡板/球/掉落同步缩放，美术顶部对齐。
- 改动：
  - shared：`constants.js` 新增 `PADDLE.bottomInset=8`、`LEVEL.scaleCap/zoomClearance/baseClearance`、`SKILL.bigBallScale=1.6`，`SKILL_IDS` 首位改为 `bigBall`；`level.js` 新增 `cellForGrid()` 与 `cell` 校验、`top` 锚点；`physics.js` 用每球 `r/piercing/pierced` 实现大球与穿透判定，新增 `state.bigBall`，`castSkill('bigBall')` 放大全部球并置穿透，奖励池排除大球，挡板/球/掉落尺寸乘 `baseBallR` 与关卡缩放。
  - 关卡管线：`generate-level-art.js` 新增早期六关图标网格与 `drawIconGrid()`、按关精确砖数与奖励公式、`cell`/顶部对齐/间隙推导；`level-from-png.js` 支持小网格与 `cell`；`validate-levels.js` 改为校验精确砖数、奖励公式、纯净早期关、`cell` 与最小 120px 间隙；30 关源图、sidecar 与 `levels.json` 全量重生成。
  - 游戏端：`play.js` 布局按 `level.cell` 缩放棋盘绘制、挡板与球；技能栏第一格换大球并显示「已满」；奖励池为空时 toast 改为「暂时没有可生效的技能」；`drawGemBrick.js` 的圆角/内缩/裂纹按格子尺寸缩放；`theme.js` 同步大球标签。
  - 测试：shared 增加 `cellForGrid`、大球穿透（普通/奖励/减益即破、硬砖 1 伤、障碍反弹、新球继承、二次施放拒绝）与奖励池排除大球断言；game 增加精确砖数、奖励公式、早期纯净关、`cell`/间隙/缩放渲染断言。测试总数 67 → 71。
- 踩坑：奖励掉落池最初仍把 `bigBall` 当作可用技能，导致大球已施放后仍可能掉出大球；改为 `SKILL_IDS.filter((skill) => skill !== 'bigBall' && skillCanCast(...))`，并把满池用例改写为「8 球封住分裂、加宽/减速满级即 `skillFull`」。
- 数据：30 关可破坏 10–264 块、合计 4492；奖励砖 160；减益砖 78；障碍 43；硬砖 1144（第 4 关起，6%→36%）；球速 560→734；第 1–7 关 `cell=74.8`（2.2×），第 26/30 关最小 34.9；最底砖与挡板间隙最小 120.0px（第 23 关）。
- 验证：`corepack pnpm test` 71/71 通过；`corepack pnpm build` 三端成功（web 0.39MB、微信/抖音 0.40MB）；`corepack pnpm verify:dist` OK；`corepack pnpm levels:validate` 30 关通过。Chrome headless + CDP 实测：第 1 关 `total=10 / cell=74.8 / 网格 4×3 / paddleW=330 / 球半径 19.8`，施放大球后半径 31.68、`piercing=true`、技能格「已满」；第 7 关 76 块、第 10 关 120 块 / `cell=52.75`、第 30 关 264 块 / `cell=34.9`；`failY=1241` 与技能栏上沿一致。截图确认第 1 关猫图标大格、第 7/30 关精细像素画与缩放回落。
- 剩余风险：第 1 关仅 3 行砖，顶部锚定 + 2.2× 上限导致砖板间留白约 673px，需真机确认手感；大球穿透的视觉反馈（穿透环、击碎节奏）与硬砖多次穿越的耐久表现需人工走查；早期大格图标辨识度、真机性能与真实广告位仍待用户执行。
- 下一步：用户按 `device-checklist.md` 2.6–2.10、2.25、7.3–7.9 真机复核挡板位置、大球穿透与首关节奏；配置真实广告位；确认红/绿球来源与软著材料。

## 2026-10-24 · REQ-001 过关撒花 + 自动进入下一关

- 触发：用户要求「胜利的时候不需要那个弹窗，直接显示一个撒花，然后进入下一关就行」。
- 关键决定：普通关可破坏砖清零后保留约 0.5s 清场缓冲，随后进入约 1.4s 撒花态；撒花期间暂停与技能输入全部屏蔽，结束后自动 `start(levelId + 1)`，不再创建过关结算弹层；最高关在撒花开始时 +1。第 30 关无下一关，撒花结束后仍显示原通关弹层（文案改为全部关卡完成 / 再玩一次），保留切后台取消自动再玩。彩纸从左到右 9 列自棋盘上沿连续落下，7 色取自现有马卡龙调色板。
- 改动：
  - `apps/game/src/gfx/particles.js`：新增 `rain()` 彩纸雨粒子（向下初速、寿命 1.1–1.6s、尺寸 4–8.5），与现有爆炸粒子共用 180 容量池；导出 `rain`。
  - `apps/game/src/game/scene/play.js`：新增 `CONFETTI_*` 常量与 `celebrateLeft / confettiIn / confettiWave` 状态；`settleClear()` 改为启动撒花并清掉旧 toast，不再设置 `result` 弹层；`tick()` 按 dt 推进撒花、每 90ms 补一波彩纸，结束时普通关 `nextLevel()`、第 30 关 `completeModal()`；`onPointer()` 在撒花期间直接返回；`snapshot()` 新增 `celebrating`；`resultModal()` 收敛为只服务第 30 关的 `completeModal()`。
  - `apps/game/test/render.test.mjs`：新增撒花粒子用例，断言非法坐标被忽略、下落绘制坐标有限；测试总数 71 → 72。
  - 文档：REQ-001、CONTEXT、spec、README、真机清单 2.14/2.15/6.3 与本验证报告同步撒花口径。
- 验证：`corepack pnpm test` 72/72 通过；`corepack pnpm build` 三端成功（web/微信/抖音均 0.40MB）；`corepack pnpm verify:dist` OK。Chrome headless + CDP 读快照：第 1 关 `forceClear()` 后 `settled=true / celebrating=true / modal=null`，点击暂停坐标不弹层；约 1.4s 后 `levelId=2 / phase=ready / 16 块 / modal=null`；第 30 关撒花后 `modal=result / levelId=30`，不越界。按项目规则未把动画过程截图作为验收证据，彩纸密度与节奏列入真机走查。
- 剩余风险：撒花仅 1.4s，低端机若掉帧可能显得短促；彩纸在 1537 高视口只覆盖棋盘上半部（受寿命与重力限制），是否足够喜庆需真机确认；第 30 关通关弹层仍保留自动再玩 6.5s。
- 下一步：用户按 `device-checklist.md` 2.14 / 2.15 / 6.3 真机复核撒花节奏、输入屏蔽与切后台行为；其余真机、广告位、红绿球来源与软著事项不变。
