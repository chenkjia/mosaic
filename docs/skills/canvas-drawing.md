# Canvas 绘制组织与性能规范（apps/game）

写 `apps/game` 任何 Canvas 绘制代码前通读本文。真机 API 坑点（DPR/roundRect/NaN 坐标）见 [`canvas-minigame.md`](canvas-minigame.md)，两者互补：那份管「平台行为」，本文管「代码组织 + 性能」。规则为硬约束，违反即 bug。

## 分层与职责

- `src/gfx/`：绘制原语层（roundRectPath、渐变工具、离屏 canvas、bitmap-cache）。只做「怎么画」，不知道「画什么」。
- `src/ui/`：组件层（卡面、面板、列表…）。每个组件自带规格表，负责「画什么」。
- 场景 sections：组合层。只调用 ui/gfx，不直接写 ctx 样式细节。

## 防冗余（硬约束）

1. **规格表规则**：视觉参数（颜色、字号、圆角、描边宽度、间距、渐变 stops）必须收拢在组件文件顶部的规格表常量（示例：卡面组件的尺寸规格表）；禁止散落在绘制函数体内。调参数只改表，不改逻辑。**字段语义对调参者透明**：位置用直接坐标（图标中心 `cx`、文字左缘 `x`），不暴露派生偏移量（教训：blueShiftX 类偏移参数被走查否决，调参者要直接坐标且会直接手改表文件）；删改字段必须同步全部引用（含运行时布局缓存）。
2. **原语提取阈值**：同一段 ctx 调用模式（如 圆角+填充+描边三连）在 ≥2 处出现，必须提取进 `src/gfx/`；第 3 处出现即违规。
3. **gfx 原语签名**：几何参数显式传入，样式参数对象化；原语内部禁止 hardcode 颜色/字号。
4. **内联禁令**：ui/ 与组合层禁止直接调用 `createLinearGradient`/`createRadialGradient`、手写圆角路径、手设多层描边——一律走 gfx 工具（示例：文本绘制 helper、渐变描边工具）。
5. **接触即收敛**：改到含内联绘制/散落参数的存量文件时，搭车完成该文件的规格收拢与原语提取；不立独立 REQ，不顺手扩大到其他文件。

## 性能（硬约束）

6. **帧循环零分配**：requestAnimationFrame / 播放循环内不得新建渐变对象、样式参数对象、font 字符串；这些在循环外或缓存中准备。
7. **静态/动态分层**：内容不随帧变化的绘制必须进 bitmap-cache 离屏缓存，动态层只画变化部分（示例：卡面静态 key 缓存 + 动态层）。缓存键必须涵盖全部视觉输入（阶/tier/尺寸/装备态），漏一项 = 错误贴图。
8. **渐变缓存**：同一渐变（同坐标+同 stops）重复创建必须缓存复用，不得每帧重建。
9. **状态切换最小化**：ctx 状态切换（fillStyle/font/save-restore）都有成本；同 fillStyle 形状、同 font 文本分组批量连续绘制，font 字符串预拼接缓存。
10. **贴图取整**：帧循环 drawImage 的目标坐标取整（Math.round/floor），避免子像素抗锯齿开销与模糊。
11. **禁止逐帧缩放位图**：drawImage 不得每帧对位图做缩放；需要非原生尺寸时用 bitmap-cache 按目标尺寸预渲染（renderScale 机制）。
12. **禁止帧循环像素回读**：帧循环内不得调用 getImageData；像素级处理移到循环外或初始化期。
13. **大倍率下采样必须渐进半采样**（立绘锯齿定案）：单次 drawImage 把位图缩到目标物理尺寸的 **>2×**（如 1024px 立绘直缩小卡）会因 bilinear 采样跳像素出锯齿——必须先按每步 ÷2 渐进半采样到单步 ≤2× 再终绘，每步设 `imageSmoothingQuality='high'`，中间画布按源图缓存（WeakMap）。运行时不支持 `imageSmoothingQuality` 时赋值即无害 no-op（直赋，不用 `in` 守卫——录制 stub 也无该键，守卫反而失配）。

## 已评估不纳入（勿重复调研）

以下为对照 MDN《Optimizing canvas》等通用优化清单逐项评估后的结论：

- 多层 DOM canvas 分层 / CSS 背景 / CSS transform 硬件加速：小游戏无 DOM/CSS；等价物是 bitmap-cache 离屏缓存（规则 7）。
- WebGL 替代 Canvas 2D：技术边界，仅原生 Canvas 2D（根 AGENTS.md）。
- Worker + OffscreenCanvas 多线程：微信 worker 兼容风险大，复杂度与收益不成比例。
- requestIdleCallback / setPreferredFramesPerSecond：调度层，不属绘制规范边界。
- 脏矩形局部重绘：实现复杂，当前场景收益存疑。
- 半分辨率渲染 / imageSmoothingEnabled=false：不作为硬约束；仅低端机特效降级或像素风场景的可选手段。

## 完工自查（grep 清单）

在 `apps/game/src` 下执行，命中即违规（`src/gfx/` 自身除外）：

```bash
# 1. 渐变内联：gfx/ 外不得直接调 ctx 创建渐变（注意区分从 gfx/gradient.js 导入的同名包装函数，那是合规用法）
grep -rn "ctx\.createLinearGradient\|ctx\.createRadialGradient" apps/game/src --include="*.js" | grep -v "src/gfx/"

# 2. 手写圆角路径：gfx/ 外不得直接调 quadraticCurveTo/arcTo 画圆角
grep -rn "quadraticCurveTo\|arcTo" apps/game/src --include="*.js" | grep -v "src/gfx/"

# 3. 像素回读：gfx/ 外不得调用 getImageData（规则 12）
grep -rn "getImageData" apps/game/src --include="*.js" | grep -v "src/gfx/"
```

另外 code review 检查 grep 不可测项：帧循环内无对象/字符串分配（规则 6/8）、缓存键完整性（规则 7）、drawImage 坐标取整与无逐帧缩放（规则 10/11）、大倍率下采样走渐进半采样（规则 13）。
