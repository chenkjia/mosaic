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
- 下一步：用户确认 REQ-001 + spec 后，从 Ticket 01（脚手架/构建/adapters）开始实施；用户侧执行 `git config core.hooksPath scripts/git-hooks` 与 push。
