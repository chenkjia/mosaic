# Issue Tracker（票存放规则）

## 位置与结构

- spec 与拆票固定在 `.scratch/<feature-slug>/`：`spec.md` + `issues/NN-<slug>.md`，一票一文件。
- 完成后留档，随实现提交；不做远程 issue 同步。

## 实施票

- 正文至少含：目标、依赖、验收项。
- 用一行 `Status:` 记录 `todo` / `in_progress` / `done`；`ready-for-agent` 视作 `todo` 的同义词（`/to-tickets` 产物直接兼容）。
- 默认不走 triage；只有用户明确要求时，才使用 `triage-labels.md` 中的角色字符串。
- `/wayfinder` 是独立分支；其 child ticket 的 `Status:` 语义与普通实施票不同，不混用。

## Wayfinding 操作

由 `/wayfinder` 使用。**map** 是单个文件，每个 ticket 对应一个 **child** 文件。本节仅适用于 `/wayfinder` 分支，不适用于普通实施票。

- **Map**：`.scratch/<effort>/map.md` —— 存放 Notes / Decisions-so-far / Fog 三段正文
- **Child ticket**：`.scratch/<effort>/issues/NN-<slug>.md`，编号从 `01` 起，正文为待回答问题。用一行 `Type:` 记录 ticket 类型（`research` / `prototype` / `grilling` / `task`）；用一行 `Status:` 记录 `open` / `claimed` / `resolved`
- **Blocking**：在文件顶部附近记录 `Blocked by: NN, NN`。当所列文件全部为 `resolved` 时，该 ticket 解除阻塞
- **Frontier**：扫描 `.scratch/<effort>/issues/` 中处于 open、未阻塞且未认领的文件；编号最小者胜出
- **Claim**：在开始任何工作前，将 `Status` 设为 `claimed` 并保存
- **Resolve**：在 `## Answer` 标题下追加答案，将 `Status` 设为 `resolved`，然后将上下文指针（gist + 链接）追加到 `map.md` 的 Decisions-so-far 中
