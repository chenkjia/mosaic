# 08 三端构建验证与发布走查清单

Status: done（agent 侧产物；真机走查待用户执行）
依赖：01–07
关联：REQ-001、REQ-002

## 目标

完成三端构建验证、体积检查、探针清理与人工走查清单，交付可提审产物。

## 验收项

- `dist/{web,wechat,douyin}` 全部构建成功；构建打印单包体积。
- 单包 ≤ 2MB 预警线、≤ 18MB 上限预警；超限时优先图集压缩/裁图。
- smoke：`dist/wechat`、`dist/douyin` grep 无调试探针符号；web 保留探针。
- 三端首页可启动，版本标记日志正确。
- 产出微信/抖音真机走查清单：步骤、判据、场景构造方法（发球、多球、硬砖、障碍、奖励砖、复活、广告、分享、暂停、切后台）。
- 截图/录屏材料与软著入口对齐（REQ-002 第 1 项）。

## 实施记录

- 产物：`scripts/verify-dist.mjs`、`docs/verify/REQ-001-verification.md`、`docs/verify/device-checklist.md`；根 `package.json` 的 `verify:dist` 已可用。
- 构建：web / 微信 / 抖音单包各 0.44MB；三端版本 0.1.0 注入。
- smoke：调试探针仅在 web；微信/抖音包内无探针、无 `window.` / `document.` 直接引用；`game.json` 无分包字段且竖屏；分享封面在包根 `assets/share/cover.png`。
- 测试：42/42 通过；浏览器全流程（主页 → 开局 → 失败 → 复活 → 结算 → 双倍 → 下一关 → 暂停 → 扩容）通过，控制台无 error。
- 待用户：微信/抖音真机走查、真实广告位三通道、分享卡片、低端机性能、关卡美术辨识度、软著材料。
- 已知设计缺口：红/绿球规则已实现但没有产出入口，需用户确认来源后再改 spec 与实现。
