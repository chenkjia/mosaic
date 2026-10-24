# 05 关卡管线与 30 关内容

Status: done
依赖：01（构建）、03（schema）
关联：REQ-001（关卡内容）

## 目标

实现「像素画源图 → 16 色量化 → 切格 → 关卡 JSON」脚本，产出 30 关（动物/花卉/风景各 10）。

## 验收项

- `scripts/level-from-png.js` 可把 21×28 PNG（透明=空格）转成合法 JSON；派生数据不手改。
- `scripts/validate-levels.js` 校验 30 关：schema、网格越界、第 1–10 关精确砖数、第 11–30 关难度带、palette ≤ 16、`cell` 与网格一致、最底砖与挡板间隙。
- 30 关全部通过校验，每主题 10 关，难度随关卡递增（砖数为主轴，球速/硬砖比例缓慢上升）。
- 奖励砖数量为 `clamp(round(砖数/12),1,6)`、减益砖数量按关卡递增，位置均由生成器最远点采样分散，不使用手工坐标。
- 每关像素画在 demo 中人工走查可辨识；第 1–6 关为大格简化图标。
- 关卡 JSON 经 esbuild import 打进 bundle，无运行时 fetch。

## 实施记录

- 产物：`scripts/generate-level-art.js`、`scripts/level-from-png.js`、`scripts/validate-levels.js`、`scripts/lib/`、`assets/levels/`、`apps/game/src/data/levels.json`、`apps/game/test/levels.test.mjs`。
- 内容：30 关（animals 1–10 / flowers 11–20 / scenery 21–30），可破坏砖按难度带 70–330 块/关；奖励砖每关 6 块，减益砖 0/1/2/3/4 块按关卡递增；palette 上限 16；球速 560→734。
- 奖励砖分布（2026-10-22）：`chooseSpread()` 在非特殊砖格上做确定性最远点采样——首块取离质心最远的格，其余取到已选格最小距离最大的格，`hash2(id,x,y)` 决胜；同一关最近两块相距 5.8–10.8 格，替换原先 3 块手工坐标（易聚簇）。30 关源图、sidecar 与 `levels.json` 已全量重生成。
- 难度带与缩放（2026-10-22）：按关卡号划分砖数区间，生成器取不超过上限的最大缩放高度；原画底部透明留白会把可见最底行抬高，缩放后统一整体下移，保证可见最底行落在第 24 行（挡板间隙约 52.5px）；不足下限时从顶部按行补背景砖。
- 减益砖（2026-10-22）：sidecar 记录 `[x,y,kind]`，类型按关卡轮换且三色均衡；`level-from-png.js` 校验类型、重叠、底三行与数量上限，硬砖候选排除奖励/减益/障碍。
- 验证：`corepack pnpm levels:validate` 与 `node --test apps/game/test/levels.test.mjs` 均通过；JSON 经 esbuild import，无运行时 fetch。
- 重做（2026-10-24，首关 10 块与局部放大）：前 6 关改用 4×3 / 5×4 / 6×5 / 7×6 / 8×7 / 9×8 简化图标（猫/兔/熊/狐/熊猫/青蛙，砖数 10/16/24/34/46/60）；第 7 关起仍取 21×28 精细画，裁到非空包围盒。1–10 关精确砖数 76/90/105/120 由填充补足或裁行；11–30 关保留原难度带。新增 `cellForGrid(cols, rows)` 统一推导格子边长（宽度、挡板 120px 间隙、2.2× 上限、34px 下限），输出 `cell` + `anchor: 'top'`；奖励砖改为 `clamp(round(砖数/12),1,6)`；第 1–3 关不生成硬砖/减益/障碍，砖数 < 40 不生成减益砖。30 关源图、sidecar、`levels.json` 全量重生成；L1 4×3、10 块、`cell 74.8`，L30 19×23、264 块、`cell 34.9`，无缩放关卡间隙 ≥72px、缩放关卡 ≥120px。
- 验证（2026-10-24）：`corepack pnpm levels:validate`、`corepack pnpm test`（71 项）、三端构建与 `verify:dist` 全部通过。
- 遗留：像素画逐关人工辨识度未走查（真机清单第 7.3 项）；第 1 关因砖少，砖块与挡板之间留白较大，需真机确认手感。
