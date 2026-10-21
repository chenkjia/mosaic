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
