# 01 工程骨架、构建与 platform adapter

Status: done
依赖：无
关联：REQ-001（平台与构建）

## 目标

搭起可运行的三端骨架：esbuild 三入口、主包/分包、web 调试页、platform adapter 接口与 boot/loading。

## 验收项

- `pnpm install` 可通过 corepack 使用固定 pnpm 版本。
- `pnpm --filter ./apps/game run build` 产出 `dist/{web,wechat,douyin}`。
- 主包只含 boot + loading；微信/抖音分包配置字段大小写正确。
- `platform/index.js` 暴露 spec 约定的全部 seam；web adapter 可运行，微信/抖音 adapter 可加载。
- `dist/web/index.html` 直接打开可看到 loading → home 空页，控制台打印 `[game] boot <version>`。
- 构建打印主包/分包/总包体积三行。

## 完成记录（2026-10-21）

- 构建：三端成功；微信/抖音主包 0.01MB、分包 0.00MB、总包 0.02MB。
- 测试：`node --test` 10/10 通过（seam、坐标、存储、分包、模板、loading 绘制）。
- 浏览器：`file://` 与 8000 端口均输出 `[game] boot 0.1.0` → `[boot] home 0.1.0`。
- 主包验收：产物 grep 无主页文案；微信 `subpackages` / 抖音 `subPackages` 字段正确。

## 后续变更（2026-10-21）

分包方案已废弃：微信开发者工具要求分包 root 内存在 `game.js`，旧构建输出 `pkg-game/index.js` 导致导入失败；当前包体仅 0.44MB，分包无收益。已改为单包交付（`game.js` + `game.json` + `assets/`），`loadSubpackage` seam 与分包入口一并移除。决策见 [ADR-0004](../../../docs/adr/0004-single-main-package.md)。
