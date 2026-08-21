# 06 — 消耗与资源 seam

Type: grilling
Status: resolved
Blocked by: 02

## Question

Ability 的「消耗（不硬编码具体资源）」如何在运行时落地？

1. `cost` 字段是否统一为 `{ resource: string, amount: number }`，`resource` 先用 `'mp'`（可扩展）？
2. `BattleUnitSnapshot` / `BattleUnitRuntime` 是否新增当前 MP（如 `currentMp`），并在入场时由 `stats.maxMp` 初始化？
3. `BattleContext` / Ability 执行层是否新增 `canAfford(unitId, cost)` / `spendCost(unitId, cost)` seam；支付发生在派发 Effect 之前？
4. 付不起的主动 Ability 是否不可选并回落普通攻击；`basic_attack` cost 恒为 0？
5. MP 回复/最大值成长是否明确 out of scope（本 effort 只定消耗契约）？

产出：`cost` 类型与资源扣费 seam 契约。
## Answer

（HITL grilling，用户在 chart 阶段已确认推荐方案）

- **D1 cost 形状**：`{ resource: string, amount: number }`；`resource` 首版用 `'mp'`（可扩展）。
- **D2 currentMp**：`BattleUnitSnapshot` / `BattleUnitRuntime` 新增 `currentMp`，入场时由 `stats.maxMp` 初始化。
- **D3 扣费 seam**：Ability 执行层新增 `canAfford(unitId, cost)` / `spendCost(unitId, cost)`；支付发生在派发 Effect 之前。
- **D4 付不起**：该主动 Ability 不可选并回落普通攻击；`basic_attack` cost 恒为 0。
- **D5 Out of scope**：MP 回复 / 最大值成长 / 资源 UI 展示不在本 effort。
