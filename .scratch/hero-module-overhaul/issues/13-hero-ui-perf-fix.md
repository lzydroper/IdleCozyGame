# 英雄界面卡顿优化实施（范围决策 + 落地）

Status: open
Type: grilling
Blocked by: 02

## Question

基于 02 的根因清单，决策并实施英雄界面卡顿优化（第 2 点）。范围是核心决策：

1. **优化范围**：
   - 方案 A（局部，低风险）：仅英雄模块——`React.memo` 包裹 `DetailedStatsModal` / `HeroTalentPanel`（props 引用已稳定）、`HeroDetailModal` 内子弹窗条件渲染、经验条去 transition（与 11 联动）。不动 GameContext。
   - 方案 B（全局，高风险高收益）：拆分 `GameContext`（高频 tick 字段 vs 英雄稳定字段两个 Provider，或 selector / useSyncExternalStore）、App.tsx 只渲染 activeTab、actions useCallback、`state/tick.ts` 结构共享短路。影响全仓库 21 处 useGame() 消费者。
2. **验收**：肉眼确认英雄详情/招募界面流畅度明显提升；`npx vitest run` 全量通过；`npm run build` 通过。

产出：范围决策 + 实施改动 + 测试。
