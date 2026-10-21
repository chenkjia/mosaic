# 03 共享确定性物理与规则核

Status: done
依赖：无
关联：REQ-001（局内核心）、ADR-0003

## 目标

在 `packages/shared/src/` 实现纯 JS 的物理步进与规则核，可脱离渲染运行。

## 验收项

- `createState(level, seed)`、`step(state, input, dt)`、事件流输出与 spec 一致。
- 固定步长 1/120，不读时间/全局随机；同种子同输入 600 步结果逐帧一致。
- 球-砖、球-墙、球-挡板、球-球碰撞各不少于 3 条断言；球-球无重叠粘连。
- 球数上限 8、三色球效果、清除率分母、过关判定均有断言。
- 所有输出坐标为有限值；无 NaN 进入渲染数据。
- `node --test` 全绿，零第三方依赖。

## 实施记录

- 产物：`packages/shared/src/{constants,level,palette,physics,rng,save,index}.js`、`packages/shared/test/{physics,level,save}.test.mjs`。
- 决定：固定步长 1/120s、单帧最多 8 步；xorshift32 种子显式传入；球-球等质量弹性碰撞 + 位置分离；清除率分母排除障碍；四技能刷新不叠加、异类共存；存档读写协议与校验集中在 shared。
- 验证：25 项 shared 测试通过，覆盖 600 步确定性、四类碰撞、8 球上限、三色球、掉落、扩容、存档损坏降级；坐标有限值断言通过。
- 遗留：红/绿球规则可被直接构造并通过测试，但当前玩法没有产出这两种球的入口，已在验证报告登记为待确认项。
