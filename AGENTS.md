# Mosaic 项目规范

## 项目参数

- 项目名称与一句话定位：**Mosaic** —— 把 Midnight Crushers 的打砖块玩法做成 2D 伪 3D 的微信/抖音小游戏：彩色小球消除拼成像素画的宝石砖块。
- 目标平台：web + 微信 + 抖音三端；增减平台时同步 adapter 与构建入口。
- 服务端技术栈：**V1 不建服务端**（纯单机 + 本地存档，广告/分享走平台 SDK）；`apps/server` 骨架保留，排行榜/云存档立项时再定案并改写 `apps/server/AGENTS.md`。
- 商业化边界：**V1 只做激励视频与分享，不做内购**；广告点位见 `docs/requirements/REQ-002-launch-commercialization.md`。
- REQ 编号起点：`REQ-001`。

## 基本原则

- 优先级：用户当次指令 > 已确认的需求/方案 > 本文件 > 局部 `AGENTS.md` > 默认做法。
- 外部写入、破坏性操作、付费操作、依赖/协议变更或范围扩张，必须先确认。
- 仅把无法从仓库快速发现、长期有效且全局适用的规则写在这里；模块细则写入目标目录的局部 `AGENTS.md`。
- Git 操作由 agent 自行执行，包括 `add` / `commit` / `push` 与仓库级 `git config`（如 `core.hooksPath`）；`push --force`、`reset --hard`、删除分支或远程分支等破坏性操作仍需先确认。
- Bug、适配补丁、参数、环境类修改完成后，把新踩的坑回写本文件或对应局部 `AGENTS.md`（现象 → 根因 → 方案 → 验证方式），禁止重复踩坑。
- 交付说明四件套：改动文件清单、目的、影响范围、自测结论。

## 技术边界

- 包管理 `pnpm workspace`；pnpm 版本经根 `package.json` 的 `packageManager` 字段固定（单一事实源），不依赖全局安装。跨端共享代码一律放 `packages/shared`，apps 之间禁止直接引用。
- 游戏端（`apps/game`、`apps/demo`）源代码仅使用 JavaScript，不得新增或迁移为 TypeScript；服务端语言边界见 `apps/server/AGENTS.md`。
- 渲染钦定原生 Canvas 2D，禁止引入 PixiJS 或任何渲染引擎——真机坑实录见 `docs/skills/canvas-minigame.md`；决策见 [ADR-0001](docs/adr/0001-render-native-canvas-2d.md)。
- 平台差异只允许出现在 `apps/game/src/platform/` 各 adapter 内；业务代码禁止直接引用 `wx` / `tt` / `window` / `document`。
- 服务端代码不得依赖小游戏运行时 API 或客户端 UI 模块；共享协议、常量只定义在 `packages/shared`，禁止前后端重复定义。
- `packages/shared` 内的规则模拟（战斗、判定、经济）必须纯 JavaScript、结果可复现：随机性显式作为输入或可追踪状态，不得读取时间、全局随机数等外部状态。
- 未经确认，不新增依赖、不替换渲染框架、不变更共享协议。

## 构建与产物

- `apps/game/src/` 以 ES modules 开发 → esbuild 按平台多入口打包至根 `dist/{web,wechat,douyin}`；dist 不入版本库。微信/抖音按单包交付，不声明分包（[ADR-0004](docs/adr/0004-single-main-package.md)）。
- 「写完即构建」由 pre-commit hook 自动执行：源码暂存即全量构建，失败阻断提交。新环境执行一次 `git config core.hooksPath scripts/git-hooks`；hook 与构建脚本的启用方式见 `scripts/git-hooks/pre-commit` 头注。
- 版本号单一事实源为 `apps/game/package.json` 的 `version`，构建时注入；web 端 `index.html` 自带按构建时间戳的缓存击穿，普通刷新即可拿到新 bundle，并用入口启动标记日志（如 `[game] boot <version>`）核对真实加载。
- 交付前执行 `corepack pnpm verify:dist`：校验三端产物、探针隔离、版本注入、单包结构（无分包字段）与体积预警线；广告位在 `apps/game/src/config/ads.js` 配置，留空走模拟广告。

## 验证

- agent 默认验证手段是数据层：`node --check`、单元测试、脚本、调试 API、已有服务 `curl`；确需本地起服务时端口固定 8000。
- 确定性视觉页面（demo 复刻页、demo 移植进 game 后的静态界面）做浏览器核验：自动化点击、截图、走查。
- 动画与战斗播放类过程截图验不了，不对它做浏览器截图验证：用数据层断言覆盖（事件流、结算结果、坐标有限性），页面演出写成人工测试任务清单（步骤、判据、场景构造方法）交用户执行，按用户回报的结果修复。
- 真机核验（微信开发者工具 + 真机、抖音开发者工具 + 真机）由人工执行，agent 只产出走查清单。

## demo 与复刻制度

- 参考截图/设计稿的复刻页与校准工具页统一集中到 `apps/demo/demoN/`，约定见 `apps/demo/AGENTS.md`。
- 玩法 demo 经用户确认冻结后即为只读的视觉/交互规格参照物：不再修改；正式版对 demo 的行为偏离只落正式版，并在活动日志留痕。
- 复刻页验收后 port 进游戏；移植以浏览器自动核验通过才算完成，随后复刻页归档不再改动。

## 需求与确认

- 每个功能或改动使用 `REQ-xxx`，并在文档、实现说明、验证与日志中引用。
- 需求文档：`docs/requirements/REQ-xxx-<name>.md`；只写范围、非范围、验收标准、待确认项。
- 方案 spec 与拆票 issues 写入 `.scratch/<topic>/`（完成后留档，随实现提交）；方案与美术产物分别写入 `docs/design/`、`docs/art/`。
- 遇到新功能/新 `REQ`、跨模块改动或较大重构、或范围/验收/接口/硬约束存在关键未定项时，默认先读 `docs/skills/matt-workflow.md` 并按其流程推进；小修小补、明确 bugfix、局部 UI 微调可直接实施。
- 若用户明确要求走 `matt workflow`、`to-spec`、`to-tickets` 或 `implement`，也按 `docs/skills/matt-workflow.md` 执行。
- 需求、方案、美术必须得到用户明确回复「确认」后，才可交给下游实施或纳入正式资源；`REQ-xxx` 的待确认项未全部确认前，不得实施该 REQ 范围内的代码。
- 若范围、验收、接口或硬约束不明确/冲突，停止实施并列出待确认项；仅允许只读预研。

## 领域文档与日志

- 领域术语以根 [CONTEXT.md](CONTEXT.md) 为准（术语 + 定义 + _Avoid_ 清单）；工程技能如何读它见 `docs/skills/domain.md`。
- 难逆转、事后会被问「为什么」、真取舍的决定写 ADR 到 `docs/adr/`；三者缺一不写。
- 对产生文档、代码、资源或决策的任务，追加 `logs/agent-activity.md`：日期、REQ、关键决定、验证结果、剩余风险与下一步。
- 会话交接 handoff 文件固定为 `docs/handoff/handoff.md`（单文件覆写，已 gitignore，不入版本库）。

## 玩法定案

- **2D 平面棋盘 + 伪 3D 砖块**：业务层永远是平面坐标，宝石质感靠圆角、高光、内阴影与投影在 Canvas 2D 内合成；禁止引入真 3D、透视变换或 WebGL。决策见 [ADR-0002](docs/adr/0002-2d-pseudo-3d-board.md)。
- **竖屏、挡板跟随手指**：挡板横向位置在操作区（HUD 下沿到屏幕最底、左右贴屏）内按下即接管，跟随到抬手不打断；空白处按下同时发球；不要求按住拖动。
- **球间弹性碰撞保留**，球数上限 8；球色三档：蓝=普通、红=强力（可破硬砖）、绿=分裂。
- **砖块四类**：普通、硬砖、不可破坏障碍、奖励砖；不做移动砖。
- **无星级、无评分**：过关自动进入下一关；存档只记最高关，不做关卡选择页。
- **技能槽 4 格**，默认 2 格，金币扩容；金币只来自过关与广告，全程不做内购。
- **V1 不建服务端**，存档走平台本地存储；随机性显式种子化，规则模拟可复现（见 [ADR-0003](docs/adr/0003-deterministic-physics.md) 与 `packages/shared/AGENTS.md`）。

## 美术产出

- 出图任务先读 `docs/skills/ai-art-prompt.md`（prompt 写法、程序化守卫、批量防漂移）；资源规范与交付要求见 `assets/art/AGENTS.md`。
- 程序化守卫是最终兜底：可程序化检测的验收项（尺寸、主体触底、水印区、配色落点）一律脚本检测，复检通过才算完成，不靠目检、不靠重出。
- 【项目硬规则区】马卡龙糖果风；圆角方砖 + 宝石质感；16 色以内调色板且关卡像素画与砖块共用；禁止真 3D/写实渲染；禁止提取或复用原游戏素材与角色；颜色编码的砖块状态必须带冗余编码（硬砖裂纹、障碍斜纹）。
