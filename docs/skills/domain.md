# Domain 文档

工程技能在探索本仓库时如何读取本仓库的领域文档。

## 开始探索前，先读这些

- 仓库根目录的 **`CONTEXT.md`**，或
- 仓库根目录的 **`CONTEXT-MAP.md`**（若存在）—— 它指向每个 context 各自的 `CONTEXT.md`。按需阅读与当前话题相关的那些
- **`docs/adr/`** —— 阅读与即将工作区域相关的 ADR。在多 context 仓库中，还要检查 `CONTEXT-MAP.md` 引用的各 context 专属 `docs/adr/`（如 `<context>/docs/adr/`）

若上述文件均不存在，**静默处理**：不要提示其缺失，也不要主动建议创建。`/domain-modeling` 技能（由 `/grill-with-docs` 和 `/improve-codebase-architecture` 触发）会在术语或决策真正落定时按需创建。

## 文件结构

单 context 仓库（多数仓库）：

```
/
├── CONTEXT.md
├── docs/adr/
│   ├── 0001-event-sourced-orders.md
│   └── 0002-postgres-for-write-model.md
└── src/
```

多 context 仓库（根目录存在 `CONTEXT-MAP.md`）—— 由 map 指向各 context 的布局：

```
/
├── CONTEXT-MAP.md                      ← 根索引
├── docs/adr/                            ← 系统级决策
├── apps/
│   └── <context>/                       ← 如 apps/game、apps/server
│       ├── CONTEXT.md
│       └── docs/adr/                    ← context 专属决策
└── packages/
    └── <context>/
        ├── CONTEXT.md
        └── docs/adr/
```

## 使用术语表中的词汇

当你的输出涉及某个领域概念（issue 标题、重构提案、假设、测试名）时，请使用 `CONTEXT.md` 中定义的术语。不要漂移到术语表明确避免的同义词。

如果所需概念尚未出现在术语表中，这是一个信号：要么你在发明项目不使用的语言（请重新考虑），要么确实存在缺口（请为 `/domain-modeling` 记一笔）。

## 标注 ADR 冲突

若你的输出与既有 ADR 冲突，请显式指出，不要悄悄覆盖：

> _与 ADR-0007（event-sourced orders）冲突 —— 但值得重开，因为……_
