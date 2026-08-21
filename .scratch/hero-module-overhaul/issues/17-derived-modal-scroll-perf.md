# 派生弹窗滚动卡顿完整优化

Status: resolved
Type: task
Blocked by:

## Question

英雄详情窗口派生的弹窗（装备详情 / 装备选择 / 天赋树 / 详细属性 / 英雄档案 / 批量升级等）在**滚动时**明显卡顿，且可能还有其他卡顿点，要求完整优化：

1. 勘察各弹窗滚动容器的性能问题：`backdrop-blur`（滚动容器内/全屏）、大阴影（shadow-2xl）、`transition-all`（hover 过渡全部属性）、`animate-in` 动画、滚动容器内的大 SVG（天赋树连线）等滚动合成压力来源。
2. 每秒重渲染的叠加：tick 短路后，活跃系统（生产/挂机/体力回复）时每秒仍 setState → 打开弹窗时整树重渲染；评估弹窗内容 memo 隔离（props 化纯展示）的可行性。
3. 系统修复以上问题，滚动流畅度明显提升。
4. 验证：全量测试 + build。

## Notes

- 相关文件：HeroDetailModal（英雄详情 + 天赋树弹窗宿主）、HeroTalentPanel（树 + SVG）、EquipmentDetailModal、EquipSelectorModal、HeroDossierModal、ExpLevelUpModal、DetailedStatsModal、ToastSystem（z 层级已修）。
- 13 号已完成：applyTick 短路（无活跃系统时不重渲染）+ HeroDetailModal hooks 结构修复。

## Answer

（本 session 实施，2026-08-07，用户反馈：派生弹窗滚动卡顿 + 其他卡顿点，要求完整优化）

### 卡顿点诊断（滚动合成 + 渲染叠加）
1. **全屏 backdrop `backdrop-blur`**：英雄档案/英雄列表/上阵选择/招募结果/规则/Toast confirm 的全屏遮罩带 blur——滚动时合成器每帧处理巨型模糊层，低端设备掉帧主因。
2. **滚动容器内 `transition-all`**：天赋树节点（hover scale-110 + ring + shadow）、详情页装备槽/升星/觉醒/天赋入口——滚动时指针经过触发全属性过渡（含 box-shadow/transform），300ms 动画期内滚动掉帧。
3. **滚动链**：弹窗滚动容器无 `overscroll-contain`，滚动到底后链动主界面。
4. **天赋树 SVG**：连线参与命中测试 + 默认渲染质量。

### 修复
- **blur 移除（7 处）**：HeroDossierModal、HeroListModal、PartySlotModal、ToastSystem confirm、SummonTab 结果层与规则层——`backdrop-blur-*` 全部移除（黑色遮罩视觉等效，合成压力大降）。
- **transition 精确化**：HeroTalentPanel 节点 `transition-all` → `transition-transform duration-150`、+/− 按钮 → `transition-colors`；HeroDetailModal 装备槽 → `transition-[border-color,transform]`、升星/觉醒按钮 → `transition-colors`、天赋入口卡 → `transition-[border-color,transform]`。
- **滚动容器 `overscroll-contain`（7 文件）**：HeroDetailModal / HeroDossierModal / DetailedStatsModal / ExpLevelUpModal / EquipSelectorModal / HeroListModal / PartySlotModal。
- **SVG 优化**：天赋树连线 `pointer-events-none` + `shapeRendering="crispEdges"`。

### 验证
- 全量 `npx vitest run` → **427 passed / 43 files**（无回归）；`npm run build` 通过。
- 请肉眼确认：英雄详情/天赋树/装备详情/档案等弹窗滚动流畅度。

### 遗留（可选后续）
- 活跃系统（挂机/生产）时每秒 setState 仍会重渲染弹窗树（合理数据变化）；若仍可感知，下一步可做弹窗内容 props 化 + React.memo 隔离，或 context 拆分（13 号方案 C）。
- 大 chunk 警告（842KB）为既有，可用 dynamic import 分码。

