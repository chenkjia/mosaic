# 01 工程骨架、构建与 platform adapter

Status: todo
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
