# 07 — 冷却语义

Type: grilling
Status: resolved
Blocked by: 02, 10

## Question

Ability 的「冷却（回合数）」语义如何定？

1. 冷却是否按「已经过的自身回合数」递减：每个自身回合结束 −1，含被跳过（眩晕/无法行动）的回合？
2. 施放时写入的冷却值是否先按 `cooldownReduction` 修正（如 `ceil(base × (1 − cooldownReduction))`）？
3. 减到 0 后，是否在下一个自身回合的 `turnActive` 选择阶段可用？
4. 冷却状态存哪里：`BattleUnitRuntime` / Ability 运行时状态 / `BattleContext`，如何随单位快照创建与丢弃？

产出：冷却递减与可用性契约。
## Answer

（HITL grilling，用户在 chart 阶段已确认推荐方案）

- **D1 递减口径**：冷却按「已经过的自身回合数」递减——每个自身回合结束 −1，含被跳过（眩晕/无法行动）的回合。
- **D2 施放修正**：施放时写入 `ceil(base × (1 − cooldownReduction))`（下限 0）。
- **D3 可用时点**：减到 0 后，下一个自身回合的 `turnActive` 选择阶段可用。
- **D4 状态存放**：`BattleUnitAbility` 增加 battle-scoped `currentCooldown` 字段（初始 = base cooldown，施放后写入修正值；每次自身回合结束 −1）；`cooldown` 保留配置基准值。
