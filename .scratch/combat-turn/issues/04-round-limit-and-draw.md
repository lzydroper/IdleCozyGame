# 04 — 轮次上限与平局（决策）

**Type:** grilling
**Status:** resolved
**Blocked by:** None

## Question

战斗的终止条件如何设计？

1. **轮次上限**：是否保留可配置上限（现 `maxBattleRounds=60`，超时双方存活=平局）？上限语义是「轮次」还是「回合」？
2. **超限判定**：超时后是平局（无奖励无重伤，与现一致）还是按战败处理？
3. **上限值**：是否继续可配置（`COMBAT_CONFIG.maxBattleRounds`），默认值取多少？
4. 「特殊效果强制结束战斗」（Turn.md 第 6 步）的接口是否在本 ticket 一并定（Turn 提供一个 `forceEnd` 钩子/标记），还是毕业到 Not yet specified 交给 Ability/Effect？

产出：战斗终止条件（全灭 / 超限平局 / 特殊结束钩子）的完整规则。

## Answer

（HITL grilling，用户全部确认推荐方案）

- **D1 轮次上限**：**保留**可配置上限，语义 = **轮次(Round)**（一轮 = 全体存活单位各行动一次，与现有 `maxBattleRounds` 一致）。
- **D2 超限判定**：超限 = **平局**（双方存活时无奖励、无重伤，与 ADR-0006「战败才重伤」一致）。
- **D3 上限值**：继续走 `COMBAT_CONFIG.maxBattleRounds` 可配置，默认 **60**（数值平衡留到以后单独重标定）。
- **D4 特殊结束接口**：本票定一个极简通道 —— Turn 维护**可选强制结束标记 + 结束结果**（victory/defeat/draw），战斗循环每轮检查，置位即终止；「什么效果置位」归 Ability/Effect。Turn 的终止条件成为**封闭集合**：一方全灭 / 超限平局 / 强制结束。
