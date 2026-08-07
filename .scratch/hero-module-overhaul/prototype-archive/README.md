# 天赋树 UI 原型归档（PROTOTYPE — throwaway primary source）

来源：09 号 ticket 的原型阶段（2026-08-07）。

## 结论

用户选定 **变体 B（技能网图）**，并要求改造：
- 直线连线（非曲线）；每个节点只有左下 / 正下 / 右下三个子方向；
- 同一父节点的所有子节点在同一水平线；
- 选中节点下方显示描述、增益等信息；
- 数值配置区含相对坐标（`pos: {row, col}`，`0,0` = 第 0 行第 0 个）与子节点列表（`children`）；
- 渲染自动连线，按子节点数定槽位：1 = 正下直线，2 = 左下右下，3 = 左下正下右下；
- 子节点被父节点阻塞（父节点已投入点数 ≥1 才可升级），但可查看信息。

该结论已折入正式实现：`src/data/talents.ts`（pos + children 数据层）、`src/components/HeroTalentPanel.tsx`（布局引擎 + SVG 直线连线 + 选中信息面板 + 阻塞）。

## 文件

- `variants-A-B-C.tsx` — 三个结构不同的变体（A 横向树 / B 技能网图 / C 缩进树），`?variant=A|B|C` 切换。
- `TalentTreePrototype.tsx` — 原型入口（读 URL search param + 挂载变体）。
- `PrototypeSwitcher.tsx` — 浮动切换底栏（左右箭头 + 键盘 ←→，生产构建隐藏）。

以上为未采用的变体（A/C）与原型脚手架，仅供追溯，不进入主代码路径。
