# 03 — Turn 引擎确定性边界（决策）

**Type:** grilling
**Status:** resolved
**Blocked by:** None

## Question

Turn 引擎本身是否完全无随机？

- **A)** Turn 纯确定性：先机、排序、队列遍历、时机结算顺序全部固定；RNG 只在 Ability/Effect 层（暴击、伤害浮动等）注入；
- **B)** Turn 承担部分随机（如随机选目标、随机先机浮动）。

需决议：

1. 确定性边界划在哪？（推荐 A）
2. 若 A：RNG 以何种形式进入上层（函数参数注入 vs 服务依赖）？回放/离线结算如何靠"种子 + 固定顺序"复现？
3. 与现有 `simulateBattle` 的 `rng` 参数、`BattleResult.actions` 回放的关系。

产出：确定性边界结论 + 回放可复现性约定。

## Answer

（HITL grilling，用户确认 Q1–Q3 推荐，并追加「回放删除」决策）

- **D1 确定性边界**：选 **A** —— Turn 纯确定性：先机 / 排序 / 队列遍历 / 时机结算顺序全部固定，不接触 RNG；随机只在 Ability/Effect 层注入。
- **D2 RNG 注入形式**：**函数参数注入** `rng: () => number`，沿调用链传给需要随机的 Ability/Effect；种子化 RNG 由上层（战斗创建方）提供——测试传固定种子、生产传 `Math.random`；Turn 不持有、不创建 RNG。
- **D3 回放删除 + 战斗信息轮播**（用户追加）：**删除回放功能** —— `CombatPlaybackView` 与 `hpTrack` 血条步进/自动回放不再保留（其 bug 不修）。保留**战斗信息轮播**：战斗事件流（时机 / 能力 / 效果 / 阵亡 / 召唤）以滚动信息形式展示（实时 + 结算摘要），不做倒退 / 重播。`BattleResult.actions` 演进为事件流，仅作信息展示数据源 + 测试断言，不再驱动回放。确定性仍用于测试（同输入同种子 → 同事件流）。
