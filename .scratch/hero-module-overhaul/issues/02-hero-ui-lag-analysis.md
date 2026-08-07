# 英雄详情与招募界面卡顿根源分析（研究）

Status: resolved
Type: research
Blocked by:

## Question

分析英雄模块界面（HeroDetailModal、HeroTalentPanel、HeroTab、SummonTab）卡顿的根源，产出按影响排序的根因清单 + 针对性优化建议：

1. `GameContext` 的 tick 机制：`setState` 触发频率、每次 tick 更新哪些字段、订阅了整个 context 的组件有哪些（涉及 `useGame()` 的组件是否都因 tick 重渲染）。
2. `HeroDetailModal` 的 `useMemo` 依赖是否正确（`calculateEntityStats` 的调用时机）；切换英雄时的经验条视觉跳动是否源于重渲染。
3. 高频更新区域盘点：经验条、详细属性、天赋面板等是否在 tick 中反复重算。
4. 是否有可提取的 selector / 子 context / memo 化机会，使英雄详情只在相关状态变化时重渲染。

产出：根因清单（按影响排序）+ 每项的具体优化建议（指向具体文件:行号）。

## Answer

（research 子代理 sa_20260807_182549，2026-08-07）

### 结论先行
卡顿根因是**全局 context 每秒整树刷新 + 全仓库零 memo 隔离**：`GameContext` tick 每秒 setState（GameContext.tsx:192-198），Provider value 每次渲染新建对象（:757-813），导致所有 `useGame()` 消费者（全仓库 21 处）——含英雄模块整条链 App → HeroTab → HeroDetailModal → 子弹窗——每秒无条件重渲染。`HeroDetailModal` 的 useMemo 依赖**正确且有效**，不是问题点。

### 根因清单（按影响排序）
- **R1（最大）｜context value 每秒重建，全树无 memo 隔离**：GameContext.tsx:757-813（value 内联新建）+ :745-754（adjustedState）+ App.tsx:806-822（7 个 tab 全渲染，CSS hidden 切换）。全仓库零 React.memo。→ 建议：拆分 context（高频 tick 字段 vs 英雄稳定字段），或至少 App 只渲染 activeTab；actions 全部 useCallback（:760-812）。
- **R2｜HeroDetailModal 组件级每秒重渲染 + 子弹窗无 memo**：HeroDetailModal.tsx:54、:563-568（DetailedStatsModal 无条件渲染）、:591。→ 建议：React.memo 包裹 DetailedStatsModal/HeroTalentPanel（props 引用已稳定）。
- **R3｜applyTick 无条件重建子树**：state/tick.ts:27（inventory 无条件浅拷贝）、:71-87、:90-107、:169-185。→ 建议：无增量时短路返回原引用（结构共享）。
- **R4｜升星按钮 disabled / 保底进度每 tick 重算**：HeroDetailModal.tsx:97-101,438-443、SummonTab.tsx:37-41。→ 拆 context 后独立。
- **R5（次要）｜经验条 transition + 非条件子组件**：HeroDetailModal.tsx:380、:563。→ 经验条去 transition 或改纯数值（与 11 号 ticket 呼应）；DetailedStatsModal 改条件渲染。

### 要点
- `heroes`/`equipment`/`talents` 引用在 tick 中保持稳定（tick.ts:167-186 不含这些字段）——拆分 context 的可行性基础。
- 影响排序基于重渲染范围与频率的静态分析，未做 profiling。
