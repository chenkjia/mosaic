# 05 关卡管线与 30 关内容

Status: done
依赖：01（构建）、03（schema）
关联：REQ-001（关卡内容）

## 目标

实现「像素画源图 → 16 色量化 → 切格 → 关卡 JSON」脚本，产出 30 关（动物/花卉/风景各 10）。

## 验收项

- `scripts/level-from-png.js` 可把 21×28 PNG（透明=空格）转成合法 JSON；派生数据不手改。
- `scripts/validate-levels.js` 校验 30 关：schema、网格越界、可破坏砖块数落在难度带、palette ≤ 16、底三行留空与挡板间隙。
- 30 关全部通过校验，每主题 10 关，难度随关卡递增（砖数为主轴，球速/硬砖比例缓慢上升）。
- 每关固定 6 块奖励砖、减益砖数量按关卡递增，位置均由生成器最远点采样分散，不使用手工坐标。
- 每关像素画在 demo 中人工走查可辨识。
- 关卡 JSON 经 esbuild import 打进 bundle，无运行时 fetch。

## 实施记录

- 产物：`scripts/generate-level-art.js`、`scripts/level-from-png.js`、`scripts/validate-levels.js`、`scripts/lib/`、`assets/levels/`、`apps/game/src/data/levels.json`、`apps/game/test/levels.test.mjs`。
- 内容：30 关（animals 1–10 / flowers 11–20 / scenery 21–30），可破坏砖按难度带 70–330 块/关；奖励砖每关 6 块，减益砖 0/1/2/3/4 块按关卡递增；palette 上限 16；球速 560→734。
- 奖励砖分布（2026-10-22）：`chooseSpread()` 在非特殊砖格上做确定性最远点采样——首块取离质心最远的格，其余取到已选格最小距离最大的格，`hash2(id,x,y)` 决胜；同一关最近两块相距 5.8–10.8 格，替换原先 3 块手工坐标（易聚簇）。30 关源图、sidecar 与 `levels.json` 已全量重生成。
- 难度带与缩放（2026-10-22）：按关卡号划分砖数区间，生成器取不超过上限的最大缩放高度；原画底部透明留白会把可见最底行抬高，缩放后统一整体下移，保证可见最底行落在第 24 行（挡板间隙约 52.5px）；不足下限时从顶部按行补背景砖。
- 减益砖（2026-10-22）：sidecar 记录 `[x,y,kind]`，类型按关卡轮换且三色均衡；`level-from-png.js` 校验类型、重叠、底三行与数量上限，硬砖候选排除奖励/减益/障碍。
- 验证：`corepack pnpm levels:validate` 与 `node --test apps/game/test/levels.test.mjs` 均通过；JSON 经 esbuild import，无运行时 fetch。
- 遗留：像素画逐关人工辨识度未走查（真机清单第 7.3 项）。
