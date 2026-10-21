# 原生 Canvas 微信/抖音小游戏真机坑点

写 `apps/game` 渲染/平台代码前通读本文；与 [`canvas-drawing.md`](canvas-drawing.md) 互补：本文管「平台行为」，那份管「代码组织 + 性能」。全部条目为真机实测沉淀（模板来源：sanguoV2 REQ-041/042 移植与卡面校准）。

## 画布与分辨率

1. **主画布必须手动设物理分辨率**：小游戏上屏画布默认逻辑像素（官方自动缩放，代价是模糊）。boot 时 `canvas.width = screenWidth × pixelRatio`（`sys.pixelRatio`，`|| 1` 兜底）。模拟器画布是高分的看不出问题，**只有真机能验**。
2. **DPR 来源是 `sys.pixelRatio`**：`GameGlobal.PIXEL_RATIO` 无官方出处（第三方 adapter 产物），不要用。
3. **750 设计坐标系**：业务层永远在 750 系绘制，platform 层 fit 缩放；触摸换算读画布实际尺寸（`canvas.width / screenWidth`），主画布改物理分辨率后业务层零改动、触摸零漂移。
4. **位图缓存 renderScale 自动跟随**：k = ceil(物理宽/750) 现读主画布，主画布物理化后缓存层无需感知。
5. **离屏 canvas 必须显式设 width/height**：默认 0，画不出且不报错。
6. **微信小游戏前两次离屏画布调用可能返回上屏主画布**：任何离屏画布消费前核对调用次序，否则 pattern tile 会毁掉主画布。

## API 真机行为

1. **`ctx.filter` 真机静默失效**（不可用或不生效）：禁用；特效走离屏 canvas 预渲染 + 渐变合成。
2. **`roundRect` 不可依赖**（旧基础库缺失）：用 `src/gfx/` 的 roundRectPath。
3. **canvas 对 NaN 坐标静默吞掉**：`fillText(NaN, NaN)` 不报错不渲染。坐标算错 = 元素无声消失，不是报错。**卡面文本测试必须断言坐标有限性**（教训：NaN 曾潜伏多票才被走查发现）。
4. **圆角别用 `quadraticCurveTo` 拼**：二次贝塞尔在对角方向塌陷到 ~0.35r，多层描边框（外线/金带/暗棱）的层宽会在角部被捏扁。圆角一律 `arcTo`（真圆弧）；多层框各层半径 = 内容半径 + 外扩量（同心），层宽才处处一致。
5. **`textBaseline:'middle'` 对纯数字偏高**：middle 以字面 em 盒中点对位，数字无下延部，墨迹天然偏上（实测 3.5px@29px ≈ 0.12em）。数值要与色块/几何中心对齐时，用 `measureText(text)` 的 `actualBoundingBoxAscent/Descent` 差值的一半做**光学居中**（位数/字号变化自洽）。**小游戏基础库对 actualBoundingBox\* 支持未验证**，落地时先探测，缺失退经验系数 `fontSize×0.12`。
6. **`measureText` 不受 ctx transform 影响**：返回字体像素单位（即当前坐标系单位），可在 setTransform 复合坐标系下直接参与布局计算；`actualBoundingBox*` 同时给出墨迹级宽度，比 advance 更贴视觉边界。

## 布局语言（多分辨率适配）

qian ADR-0004（v1+v2）与 sanguoV2 REQ-040 两仓验证过的沉淀；项目采用时写成 ADR 并按本文口径执行。

1. **fit-width 为默认**：`scale = vw / 750`（宽度恒铺满），设计高 `H = vh / scale` 随屏幕比例浮动。业务层「贴顶/贴底」语义一律读运行时实际设计高，设计基准常量（1334）降级为参考值——遗漏一处即高分屏错位。
2. **安全区是 platform seam 的一部分**：wx/tt 读 `getSystemInfoSync().safeArea`，web 用 CSS `env()` 探测，取不到回退 0。可交互内容顶界取 max(基准顶, 安全区顶换算设计px)；贴底装饰（背景、栏底条）画到 designH 穿过 home indicator，可交互元素收在安全区可视段内。
3. **宽屏保底回退**：设 `MIN_DESIGN_H` = 全场景内容最低需求向上取整。`H < MIN_DESIGN_H` 时切 fallback：`min(fitScale, vh / MIN_DESIGN_H)` 等比居中留边，背景仍 cover 全屏（含留边区）。宽屏宁可留边，不做内容压缩。
4. **新增高度显式分配**：长屏多出的设计高显式分配给固定区块（顶部露出量、栏可视加高）与弹性区块（内容 zones 按既有比例）；分配比例经实机预览定案，不纸面拍板。基准屏零变化原则：H ≤ 基准时全部增量为 0。
5. **多分辨率断言口径**：布局换算收敛为纯函数后，用真实设备尺寸组合直测——长屏 fit 带刘海（390×844）、宽屏 fallback（768×1024）、基准还原；换算独立推导，不抄实现。多分辨率回归必须覆盖。

## 从渲染框架 demo 移植的语义陷阱

1. **`anchor ≠ textAlign`**：框架 `anchor(0, 0.5)` = 左对齐（文本左缘在锚点），canvas `textAlign:'center'` 居中。逐字对齐坐标后忘了换对齐模式 = 文本贴边/叠 icon。
2. **spec 解构不存在的字段得 undefined 不报错**：`const { innerX } = spec` 若 spec 无此字段 → NaN 参与运算 → 坑 3。解构 spec 前先确认字段存在。

## 构建与调试

1. **调试探针只挂 web entry**：wechat/douyin 构建按 import 图天然剔除探针代码；用 smoke 断言产物 grep 无探针符号防回归。
2. **数据 JSON 经 esbuild import 打进 bundle**：微信小游戏无本地 fetch；位图经 `platform.loadImage` 加载。

## 画布像素实测三原则

像素级校准方法论（属性栏间隙/垂直偏差类问题的标准做法）：

1. 读 `getImageData` 前必须**真合成**：切态/切尺寸后重绘，否则读到旧帧像素。
2. **正分类目标色**（按「是目标色」判）：「非背景色」分类会被描边/相邻层污染成整列命中。
3. 采样行/列**避开框层与圆角区**：框线每列必中、圆角处色块收窄，都会污染行/列统计。
