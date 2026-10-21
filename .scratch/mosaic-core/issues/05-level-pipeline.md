# 05 关卡管线与 30 关内容

Status: todo
依赖：01（构建）、03（schema）
关联：REQ-001（关卡内容）

## 目标

实现「像素画源图 → 16 色量化 → 切格 → 关卡 JSON」脚本，产出 30 关（动物/花卉/风景各 10）。

## 验收项

- `scripts/level-from-png.js` 可把 21×28 PNG（透明=空格）转成合法 JSON；派生数据不手改。
- `scripts/validate-levels.js` 校验 30 关：schema、网格越界、可破坏砖块数 > 0、palette ≤ 16。
- 30 关全部通过校验，每主题 10 关，难度随关卡递增（球速/硬砖比例）。
- 每关像素画在 demo 中人工走查可辨识。
- 关卡 JSON 经 esbuild import 打进 bundle，无运行时 fetch。
