# Mosaic

2D 伪 3D 打砖块小游戏：彩色小球消除由宝石砖块拼成的像素画，支持 web / 微信 / 抖音。玩法参照 Midnight Crushers，视觉走马卡龙糖果风。

## 当前状态

- REQ-001 V1 已实现：30 关（动物 / 花卉 / 风景）、主页、局内 HUD、四格技能栏与充能、本地存档、三处激励视频、分享入口。
- 46 项数据层测试通过；web / 微信 / 抖音三端构建通过，总包 0.44MB。
- web 浏览器全流程（开局、失败、复活、技能充能、结算、下一关、暂停、失败线）通过。
- 待用户执行：微信/抖音真机走查、真实广告位与分享卡片、低端机性能、关卡美术辨识度、软著材料。

## 快速开始

```bash
corepack pnpm install
corepack pnpm test
corepack pnpm build
corepack pnpm verify:dist
python3 -m http.server 8000 --directory dist/web
# 打开 http://localhost:8000
```

- 微信开发者工具导入 `dist/wechat`，抖音开发者工具导入 `dist/douyin`。
- 广告位配置：编辑 `apps/game/src/config/ads.js`，留空时走 3 秒模拟广告；重新构建后生效。
- 版本号单一事实源：`apps/game/package.json`。

## 验证与发布

- [REQ-001 验证报告](docs/verify/REQ-001-verification.md)
- [微信 / 抖音真机走查清单](docs/verify/device-checklist.md)
- [上线与商业化待办（REQ-002）](docs/requirements/REQ-002-launch-commercialization.md)
- 构建产物 smoke：`corepack pnpm verify:dist`（探针隔离、版本注入、单包结构与体积预警）。

## 流程与文档

- 需求 / 方案 / 拆票 / 实施：[`docs/skills/matt-workflow.md`](docs/skills/matt-workflow.md)。
- 术语：[`CONTEXT.md`](CONTEXT.md)。
- 决策：[`docs/adr/`](docs/adr/)。
- 方案与 tickets：[`.scratch/mosaic-core/`](.scratch/mosaic-core/)。
- 活动日志：[`logs/agent-activity.md`](logs/agent-activity.md)。

## 目录

```
mosaic/
├── AGENTS.md               # 根规范（含项目参数与玩法定案）
├── CONTEXT.md              # 领域术语表
├── apps/
│   ├── game/               # 正式游戏端（原生 Canvas 2D，JS）
│   │   ├── src/
│   │   │   ├── boot/       # 启动与 loading
│   │   │   ├── config/     # 广告位等部署配置
│   │   │   ├── data/       # 30 关 JSON（esbuild import）
│   │   │   ├── game/       # 场景、存档、音频、布局
│   │   │   ├── gfx/        # 宝石砖、bitmap-cache、粒子
│   │   │   ├── platform/   # web / 微信 / 抖音 adapter
│   │   │   └── ui/         # HUD、按钮、弹层、技能栏
│   │   └── test/
│   ├── demo/               # 复刻/校准页（demoN，零构建）
│   └── server/             # 后端骨架（V1 不启用）
├── packages/shared/        # 纯逻辑：物理、规则、关卡、存档
├── assets/                 # 关卡源图、分享封面
├── docs/
│   ├── requirements/       # REQ-001 核心玩法、REQ-002 上线商业化
│   ├── verify/             # 验证报告与真机走查清单
│   ├── adr/                # 渲染 / 伪 3D / 物理定案
│   ├── design/             # 方案与 schema
│   ├── skills/             # 项目版工作流文档
│   └── reference/          # 只读参考
├── scripts/                # 关卡管线、产物 smoke、git hooks
├── .scratch/mosaic-core/   # spec + tickets
└── logs/                   # 活动日志
```

## 人工步骤

- 新克隆仓库执行一次 `git config core.hooksPath scripts/git-hooks`；pre-commit 会自动构建，构建失败阻断提交。
- 真机核验、平台提审、广告位配置由用户执行，agent 只产出走查清单。
