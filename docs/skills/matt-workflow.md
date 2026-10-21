# Matt Workflow（项目内版）

当任务属于新功能/新 `REQ`、跨模块改动、较大重构，或范围/验收/接口/硬约束存在关键未定项时，默认按本文执行。用户若明确要求走 `matt workflow`、`to-spec`、`to-tickets` 或 `implement`，也按本文执行。

## 适用范围

- 默认用于新的 `REQ-xxx` 功能、跨模块改动、较大重构，以及关键边界未定的任务。
- 很小的修复、明确 bugfix、局部 UI 微调可直接实现；若用户明确要求走本文流程，仍按本文执行。
- 若仓库里已存在并且已经确认的 `REQ / spec / tickets`，不重走前面阶段，直接进入 `Implement`。
- 内容生产类任务（角色、关卡、文案等内容设计包）先走 [`content-design-workflow.md`](content-design-workflow.md)，通过生产门禁后按本文进入软件实施。

## 流程

1. **需求澄清**
   - 先向用户明确一句：当前任务将按 Matt workflow 推进。
   - 先从仓库和现有文档补事实，只把决策问题抛给用户。
   - 明确范围、非范围、验收标准、依赖和待确认项。
   - 完成标准：没有关键前提仍靠猜测。

2. **REQ**
   - 新功能新建或更新 `docs/requirements/REQ-xxx-<name>.md`。
   - 只写范围、非范围、验收标准、待确认项；不写实现细节。
   - 门禁：`待确认项` 未清空前，不进入代码实施。
   - 若关键边界仍有空洞，流程先停在这里，等待确认。

3. **Spec**
   - 在 `.scratch/<feature-slug>/spec.md` 写实现方案。
   - 至少覆盖：Problem、Solution、Seams、Implementation Decisions、Testing Decisions、Out of Scope；Seams 用 codebase-design 技能词汇（module / interface / seam / adapter）。
   - 若设计变化影响术语，先同步 `CONTEXT.md`；若是难逆转且有取舍的决定，再写 ADR（`docs/adr/`）。
   - 若关键边界已经足够明确，可与 REQ、Tickets 一次性起草草案，但在用户确认前不实施。

4. **Tickets**
   - 在 `.scratch/<feature-slug>/issues/` 下按 `NN-<slug>.md` 拆票，一票一文件。
   - 优先垂直切片，保证每张票都能独立验证。
   - 每张票至少写清：目标、依赖、验收项。
   - 本流程默认不做 triage。普通实施票可用 `Status: todo`、`in_progress`、`done`。

5. **Implement**
   - 只有在 REQ/Spec 已确认，或仓库里已有已确认的 `REQ / spec / tickets`，或用户明确要求开始实施时，才进入实现。
   - 用户给了 ticket，就先读 ticket；没有 ticket，就先补最小可用的 spec/ticket，再编码。
   - 实现顺序：读约束 -> 改文档/契约 -> 写代码 -> 跑非破坏性验证 -> 回写 ticket 或说明结果。
   - 若实现过程中发现范围变化，先回到 REQ/Spec 更新，再继续代码。

6. **验证与日志**
   - 按根 AGENTS.md「验证」节执行：数据层默认，确定性页面浏览器核验，动画类不做截图验证，人工清单交用户。
   - 报告已运行的验证、未运行项、剩余风险。
   - 对产生文档、代码、资源或决策的任务，追加 `logs/agent-activity.md`。

## 配套文档

- Ticket 存放规则：[`issue-tracker.md`](issue-tracker.md)
- 领域术语：根 `CONTEXT.md`
- ADR：`docs/adr/`

## 提醒

- `implement` 是实施阶段，不是跳过确认门禁的口令。
- 用户若只说「开始做」，默认先检查 REQ、spec、tickets 是否齐全；缺哪一层先补哪一层。
- 情境触发是主分支；关键词触发只是兜底入口。
