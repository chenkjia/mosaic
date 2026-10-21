# Mosaic

2D 伪 3D 打砖块小游戏：彩色小球消除由宝石砖块拼成的像素画，支持 web / 微信 / 抖音。玩法参照 Midnight Crushers，视觉走马卡龙糖果风。

## 当前状态

- 设计已通过 grilling 确认（2026-10-21，Q1–Q27）；REQ-001 + spec 已确认。
- Ticket 01 完成：三端构建、platform adapter、loading → 空主页链路可跑。
- 下一步：Ticket 02 `apps/demo/demo1/` 伪 3D 宝石砖块校准页。

## 快速开始

```bash
corepack pnpm install
corepack pnpm --filter ./apps/game test
corepack pnpm --filter ./apps/game run build
open dist/web/index.html
```

## 流程

- 需求 / 方案 / 拆票 / 实施：[`docs/skills/matt-workflow.md`](docs/skills/matt-workflow.md)。
- 术语：[`CONTEXT.md`](CONTEXT.md)。
- 决策：[`docs/adr/`](docs/adr/)。
- 商业化与上线待办：[`docs/requirements/REQ-002-launch-commercialization.md`](docs/requirements/REQ-002-launch-commercialization.md)。
- 活动日志：[`logs/agent-activity.md`](logs/agent-activity.md)。

## 目录

```
mosaic/
├── AGENTS.md               # 根规范（含项目参数与玩法定案）
├── CONTEXT.md              # 领域术语表
├── apps/
│   ├── game/               # 正式游戏端（原生 Canvas 2D，JS）
│   ├── demo/               # 复刻/校准页（demoN，零构建）
│   └── server/             # 后端骨架（V1 不启用）
├── packages/shared/        # 纯逻辑：物理步进、关卡规则、存档协议
├── assets/                 # 美术 / 音频 / 配音
├── docs/
│   ├── requirements/       # REQ-001 核心玩法、REQ-002 上线商业化
│   ├── adr/                # 渲染 / 伪 3D / 物理定案
│   ├── design/             # 方案与 schema
│   ├── skills/             # 项目版工作流文档
│   └── reference/          # 只读参考
├── .scratch/mosaic-core/   # spec + tickets
├── scripts/git-hooks/      # pre-commit 自动构建
└── logs/                   # 活动日志
```

## 人工步骤

- pre-commit 构建已由 agent 配置 `core.hooksPath=scripts/git-hooks`；新克隆仓库需重新执行一次。
- 真机核验、平台提审、广告位配置由用户执行，agent 只产出走查清单。
